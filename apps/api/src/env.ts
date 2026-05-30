import { z } from "zod";
import { validateEnv } from "@pdf-saas/shared";

const apiEnvSchema = z.object({
  PORT: z.string().default("5000"),
  MONGODB_URI: z.string({ required_error: "Missing env var: MONGODB_URI" }),
  JWT_SECRET: z.string().default("super_secret_jwt_key_change_me_in_production"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = validateEnv(apiEnvSchema, process.env);
export type ApiEnv = z.infer<typeof apiEnvSchema>;
