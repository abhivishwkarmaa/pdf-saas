import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { JobPayload } from "@pdf-saas/shared";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let connection: Redis | null = null;
let jobQueue: Queue<JobPayload> | null = null;

export function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 5000,
    });
    // Handle error events so connection failures don't crash Next.js
    connection.on("error", (err) => {
      console.warn("Redis Queue Connection Error:", err.message);
    });
  }
  return connection;
}

export function getJobQueue(): Queue<JobPayload> {
  if (!jobQueue) {
    const conn = getRedisConnection();
    jobQueue = new Queue<JobPayload>("pdf-jobs", {
      connection: conn as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return jobQueue;
}

export async function addJobToQueue(payload: JobPayload): Promise<boolean> {
  try {
    const queue = getJobQueue();
    await queue.add(`job-${payload.toolSlug}-${payload.jobId}`, payload);
    return true;
  } catch (err) {
    console.error("Failed to add job to Redis Queue:", err);
    return false;
  }
}

export async function isRedisConnected(): Promise<boolean> {
  try {
    const conn = getRedisConnection();
    // ping Redis to verify if it is alive
    const res = await conn.ping();
    return res === "PONG";
  } catch {
    return false;
  }
}
