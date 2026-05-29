import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { saveUpload } from "@pdf-saas/storage";
import { isRedisConnected, addJobToQueue } from "@/lib/server/queue";
import { processVideo } from "@/lib/server/handlers/video";
import { putObjectBuffer } from "@pdf-saas/storage";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const memoryJobs = new Map<string, {
  id: string;
  toolSlug: string;
  status: string;
  progress: number;
  speed: string;
  eta: string;
  error?: string;
  logs: string[];
  outputKey?: string;
  outputKeys?: string[];
  fileName?: string;
  mimeType?: string;
}>();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    let options: Record<string, any> = {};
    const optionsRaw = formData.get("options");
    if (typeof optionsRaw === "string" && optionsRaw) {
      options = JSON.parse(optionsRaw);
    }

    // Save all uploaded files to storage
    const buffers = await Promise.all(
      files.map(async f => Buffer.from(await f.arrayBuffer()))
    );

    const uploadResults = await Promise.all(
      files.map((f, i) => saveUpload(buffers[i], f.name))
    );
    const inputKeys = uploadResults.map(r => r.key);
    const jobId = uuidv4();
    const toolSlug = "video-converter";

    // Check for optional external audio track upload
    const audioFile = formData.get("audio_file");
    if (audioFile instanceof File) {
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const audioResult = await saveUpload(audioBuffer, audioFile.name);
      options.audioKey = audioResult.key;
    }

    // Add list of file names inside options so background worker knows it
    options._fileNames = files.map(f => f.name);

    const hasRedis = await isRedisConnected().catch(() => false);
    
    // Check if Postgres database is reachable
    let hasDb = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      hasDb = true;
    } catch {
      hasDb = false;
    }

    if (hasDb && hasRedis) {
      // 1. Production Mode: PostgreSQL + BullMQ + background worker
      const job = await prisma.job.create({
        data: {
          id: jobId,
          toolSlug,
          status: "queued",
          progress: 0,
          inputKeys,
          logs: ["Job received and queued via BullMQ"],
        },
      });

      const queued = await addJobToQueue({
        jobId,
        toolSlug,
        inputKeys,
        options,
      });

      if (!queued) {
        // Fallback inside DB to failed
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "failed", error: "Failed to queue job in Redis" },
        });
        return NextResponse.json({ error: "Failed to queue job in Redis" }, { status: 500 });
      }

      return NextResponse.json({ jobId, status: "queued" });
    } else {
      // 2. Local Fallback Mode: Stateless / Direct Execution
      // Save state to in-memory fallback map first
      const localJob = {
        id: jobId,
        toolSlug,
        status: "processing",
        progress: 5,
        speed: "0.0x",
        eta: "--:--",
        logs: ["Direct Server Processing Started..."],
      };
      memoryJobs.set(jobId, localJob);

      // Create in Postgres if DB is running but Redis is not
      if (hasDb) {
        try {
          await prisma.job.create({
            data: {
              id: jobId,
              toolSlug,
              status: "processing",
              progress: 5,
              inputKeys,
              logs: ["Direct Server Processing Started..."],
            },
          });
        } catch {}
      }

      // Execute asynchronously in background promise
      void (async () => {
        try {
          const result = await processVideo(
            buffers.length > 1 ? buffers : buffers[0],
            options,
            files[0].name,
            async (progress, speed, eta, logLine) => {
              const current = memoryJobs.get(jobId);
              if (current) {
                current.progress = progress;
                current.speed = speed;
                current.eta = eta;
                current.logs.push(logLine);
                memoryJobs.set(jobId, current);
              }

              if (hasDb) {
                try {
                  await prisma.job.update({
                    where: { id: jobId },
                    data: { progress, speed, eta, logs: { push: logLine } },
                  });
                } catch {}
              }
            }
          );

          // Save output files
          let outputKey = "";
          let outputKeys: string[] = [];

          if (result.splitOutputs && result.splitOutputs.length > 0) {
            for (const out of result.splitOutputs) {
              const key = `outputs/${uuidv4()}/${out.fileName}`;
              await putObjectBuffer(key, out.buffer, out.mimeType);
              outputKeys.push(key);
            }
            outputKey = outputKeys[0];
          } else {
            outputKey = `outputs/${uuidv4()}/${result.fileName}`;
            await putObjectBuffer(outputKey, result.buffer, result.mimeType);
            outputKeys = [outputKey];
          }

          const finalJob = memoryJobs.get(jobId);
          if (finalJob) {
            finalJob.status = "completed";
            finalJob.progress = 100;
            finalJob.outputKey = outputKey;
            finalJob.outputKeys = outputKeys;
            finalJob.fileName = result.fileName;
            finalJob.mimeType = result.mimeType;
            finalJob.logs.push(`Job completed. Saved to ${outputKey}`);
            memoryJobs.set(jobId, finalJob);
          }

          if (hasDb) {
            try {
              await prisma.job.update({
                where: { id: jobId },
                data: {
                  status: "completed",
                  progress: 100,
                  outputKey,
                  outputKeys,
                  mimeType: result.mimeType,
                  fileName: result.fileName,
                  completedAt: new Date(),
                  logs: { push: `Job completed. Saved to ${outputKey}` },
                },
              });
            } catch {}
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Processing failed";
          const failJob = memoryJobs.get(jobId);
          if (failJob) {
            failJob.status = "failed";
            failJob.progress = 0;
            failJob.error = errMsg;
            failJob.logs.push(`Error: ${errMsg}`);
            memoryJobs.set(jobId, failJob);
          }

          if (hasDb) {
            try {
              await prisma.job.update({
                where: { id: jobId },
                data: {
                  status: "failed",
                  progress: 0,
                  error: errMsg,
                  logs: { push: `Error: ${errMsg}` },
                },
              });
            } catch {}
          }
        }
      })();

      return NextResponse.json({ jobId, status: "processing" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    let hasDb = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      hasDb = true;
    } catch {
      hasDb = false;
    }

    if (hasDb) {
      const recent = await prisma.job.findMany({
        where: { toolSlug: "video-converter" },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      return NextResponse.json({ jobs: recent });
    } else {
      // Fallback to in-memory jobs list
      const jobs = Array.from(memoryJobs.values()).sort((a, b) => b.id.localeCompare(a.id));
      return NextResponse.json({ jobs });
    }
  } catch (err) {
    return NextResponse.json({ jobs: [] });
  }
}

// Export memoryJobs so the ID-specific route can access it
export function getInMemoryJob(id: string) {
  return memoryJobs.get(id);
}
