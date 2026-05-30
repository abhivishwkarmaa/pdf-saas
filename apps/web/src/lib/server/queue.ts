import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { JobPayload } from "@pdf-saas/shared";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let connection: Redis | null = null;
let jobQueue: Queue<JobPayload, any, string> | null = null;

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

export function getJobQueue(): Queue<JobPayload, any, string> {
  if (!jobQueue) {
    let connectionOpts: any;
    if (process.env.REDIS_URL) {
      try {
        const parsed = new URL(process.env.REDIS_URL);
        connectionOpts = {
          host: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port) : 6379,
          password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
          username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
          maxRetriesPerRequest: null,
        };
      } catch {
        connectionOpts = {
          host: process.env.REDIS_HOST ?? "localhost",
          port: parseInt(process.env.REDIS_PORT ?? "6379"),
          password: process.env.REDIS_PASSWORD ?? undefined,
          maxRetriesPerRequest: null,
        };
      }
    } else {
      connectionOpts = {
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379"),
        password: process.env.REDIS_PASSWORD ?? undefined,
        maxRetriesPerRequest: null,
      };
    }

    jobQueue = new Queue<JobPayload, any, string>("pdf-jobs", {
      connection: connectionOpts,
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
