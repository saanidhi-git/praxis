import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env, PORT } from './config/env.js';
import { connectDatabase } from './core/db.js';
import { errorHandler } from './core/errors.js';
import { logger } from './core/logger.js';
import { router } from './routes.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

const origins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Same-origin and server-to-server calls arrive without an Origin header.
      if (!origin) return cb(null, true);
      if (origins.includes(origin)) return cb(null, true);
      // Any Vercel preview deployment of this project.
      if (/^https:\/\/praxis[\w-]*\.vercel\.app$/.test(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));

app.use('/api/submissions', rateLimit({ windowMs: 60_000, limit: 20 }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 200 }));

app.get('/', (_req, res) => {
  res.json({ service: 'praxis-api', health: '/api/health' });
});

app.use('/api', router);
app.use(errorHandler);

async function main(): Promise<void> {
  // Listen first, connect second. Render kills a deploy that does not open a
  // port quickly, and a slow Atlas handshake on a cold free instance can
  // exceed that window. The health route reports database state separately.
  app.listen(PORT, () => {
    logger.info(
      `Praxis API listening on ${PORT} [llm=${env.LLM_PROVIDER} executor=${env.EXECUTOR_ADAPTER}]`,
    );
  });

  try {
    await connectDatabase();
  } catch (err) {
    logger.error({ err }, 'database connection failed — API is up but degraded');
  }
}

main().catch((err) => {
  logger.error({ err }, 'failed to start');
  process.exit(1);
});
