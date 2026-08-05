import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env } from './config/env.js';
import { connectDatabase } from './core/db.js';
import { errorHandler } from './core/errors.js';
import { logger } from './core/logger.js';
import { router } from './routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/submissions', rateLimit({ windowMs: 60_000, limit: 20 }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 200 }));

app.use('/api', router);
app.use(errorHandler);

async function main(): Promise<void> {
  await connectDatabase();

  app.listen(env.API_PORT, () => {
    logger.info(
      `Praxis API on http://localhost:${env.API_PORT}  ` +
        `[llm=${env.LLM_PROVIDER} executor=${env.EXECUTOR_ADAPTER}]`,
    );
  });
}

main().catch((err) => {
  logger.error({ err }, 'failed to start');
  process.exit(1);
});
