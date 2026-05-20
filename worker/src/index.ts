import { Worker } from "bullmq";
import { Redis } from "ioredis";
import type { JobPayload } from "@pdf-saas/shared";
import { prisma } from "./lib/db.js";
import { runHandler } from "./handlers/index.js";
import { cleanupExpiredFiles } from "./cleanup.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker<JobPayload>(
  "pdf-jobs",
  async (job) => {
    const payload = job.data;
    await prisma.job.update({
      where: { id: payload.jobId },
      data: { status: "processing", progress: 10 },
    });

    try {
      const result = await runHandler(payload);

      await prisma.job.update({
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      await prisma.job.update({
        where: { id: payload.jobId },
        data: { status: "failed", error: message, progress: 0 },
      });
      throw err;
    }
  },
  { connection, concurrency: 2 }
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
