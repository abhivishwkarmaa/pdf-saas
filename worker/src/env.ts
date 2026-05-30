import { z } from "zod";
import { validateEnv } from "@pdf-saas/shared";

const workerEnvSchema = z.object({
  DATABASE_URL: z.string({ required_error: "Missing env var: DATABASE_URL" }),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  OPENAI_API_KEY: z.string().optional(),
  WORKER_CONCURRENCY: z.string().default("4"),
  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = validateEnv(workerEnvSchema, process.env);
export type WorkerEnv = z.infer<typeof workerEnvSchema>;
