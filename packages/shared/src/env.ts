import { z } from "zod";

export function validateEnv<T extends z.ZodObject<any>>(
  schema: T,
  env: NodeJS.ProcessEnv
): z.infer<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    const missing = result.error.errors.map(err => err.path.join(".")).join(", ");
    throw new Error(`Environment validation failed. Missing or invalid env vars: ${missing}`);
  }
  return result.data;
}
