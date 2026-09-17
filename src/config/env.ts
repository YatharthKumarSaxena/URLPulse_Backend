import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  FRONTEND_URL: z.string().url().optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().max(50).default(5),
  URL_CHECK_TIMEOUT_MS: z.coerce.number().int().positive().max(120_000).default(10_000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

export const env = parsed.data;
