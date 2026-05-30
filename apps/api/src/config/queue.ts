import { Queue } from "bullmq";
import type { JobPayload } from "@pdf-saas/shared";

let jobQueue: Queue<JobPayload, any, string> | null = null;

// Parse REDIS_URL to get host/port/password if provided, otherwise fallback to host/port/password env vars
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

export function getJobQueue(): Queue<JobPayload, any, string> {
  if (!jobQueue) {
    jobQueue = new Queue<JobPayload, any, string>("pdf-jobs", {
      connection,
      defaultJobOptions: {
        attempts: 2,
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
