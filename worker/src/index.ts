import "./env.js";
import { Worker } from "bullmq";
import type { JobPayload } from "@pdf-saas/shared";
import { prisma } from "./lib/db.js";
import { runHandler } from "./handlers/index.js";
import { cleanupExpiredFiles } from "./cleanup.js";
import { getObjectBuffer } from "@pdf-saas/storage";

let connection: any;
if (process.env.REDIS_URL) {
  try {
    const parsed = new URL(process.env.REDIS_URL);
    connection = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port) : 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    connection = {
      host: process.env.REDIS_HOST ?? "localhost",
      port: parseInt(process.env.REDIS_PORT ?? "6379"),
      password: process.env.REDIS_PASSWORD ?? undefined,
      maxRetriesPerRequest: null,
    };
  }
} else {
  connection = {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379"),
    password: process.env.REDIS_PASSWORD ?? undefined,
    maxRetriesPerRequest: null,
  };
}

const worker = new Worker<JobPayload, any, string>(
  "pdf-jobs",
  async (job) => {
    const payload = job.data;
    await prisma.job.update({
      where: { id: payload.jobId },
      data: { status: "processing", progress: 10 },
    });

    try {
      const result = await runHandler(payload);

      const jobRecord = await prisma.job.update({
        where: { id: payload.jobId },
        data: {
          status: "completed",
          progress: 100,
          outputKey: result.outputKey,
          outputKeys: result.outputKeys ?? [],
          mimeType: result.mimeType,
          fileName: result.fileName,
          completedAt: new Date(),
        },
      });

      // Write Usage Conversion Log
      try {
        let totalSize = 0;
        for (const key of payload.inputKeys) {
          try {
            const buf = await getObjectBuffer(key);
            totalSize += buf.length;
          } catch {}
        }
        const fileSizeMb = totalSize / (1024 * 1024);
        const inputFormat = payload.inputKeys[0] ? payload.inputKeys[0].split(".").pop() || "mp4" : "mp4";
        const outputFormat = result.fileName ? result.fileName.split(".").pop() || "mp4" : "mp4";
        const processingMs = jobRecord ? (Date.now() - jobRecord.createdAt.getTime()) : 0;

        await prisma.conversion.create({
          data: {
            userId: jobRecord?.userId || "anonymous",
            jobId: payload.jobId,
            inputFormat,
            outputFormat,
            fileSizeMb,
            processingMs,
            plan: (payload.options as any)?.plan || "free",
          },
        });
      } catch (err) {
        console.error("Usage Tracking failed:", err);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      await prisma.job.update({
        where: { id: payload.jobId },
        data: { status: "failed", error: message, progress: 0 },
      });
      throw err;
    }
  },
  { connection, concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "4") }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

setInterval(() => {
  cleanupExpiredFiles()
    .then((n) => n > 0 && console.log(`Cleaned ${n} expired files`))
    .catch(console.error);
}, 60_000);

console.log("PDF worker started");
