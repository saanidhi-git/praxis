
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Render, Railway and Heroku inject PORT and expect the process to bind it.
  // API_PORT stays for local use; PORT wins when present.
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),

  // Comma-separated. Set this to the deployed frontend origin in production.
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  JWT_SECRET: z.string().min(8).default('dev-only-secret-change-me'),

  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/praxis'),

  LLM_PROVIDER: z.enum(['mock', 'groq']).default('mock'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_TEXT_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_VISION_MODEL: z
    .string()
    .default('meta-llama/llama-4-scout-17b-16e-instruct'),

  ML_API_URL: z.string().default('http://127.0.0.1:8000'),
  ML_API_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  EXECUTOR_ADAPTER: z.enum(['subprocess', 'docker']).default('subprocess'),
  EXECUTOR_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  EXECUTOR_MEMORY_MB: z.coerce.number().int().positive().default(128),
  EXECUTOR_MAX_OUTPUT_BYTES: z.coerce.number().int().positive().default(65_536),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

/** Port to bind. Honours the platform-injected PORT before the local default. */
export const PORT = env.PORT ?? env.API_PORT;

export const isMockLLM = env.LLM_PROVIDER === 'mock' || !env.GROQ_API_KEY;
