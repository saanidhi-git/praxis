
import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { seedDemoUsers } from '../modules/auth/user.model.js';
import { installSchemaValidators } from '../modules/review/answer.model.js';
import { supportsTransactions } from '../modules/review/answer.repository.js';
import { logger } from './logger.js';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5_000,
  });

  const txn = await supportsTransactions();
  logger.info(
    { transactions: txn },
    txn
      ? 'connected to a replica set — multi-document transactions enabled'
      : 'connected to a standalone mongod — transactions unavailable, ' +
        'falling back to atomic compare-and-swap (state stays correct; see ' +
        'answer.repository.ts)',
  );

  await seedDemoUsers();

  try {
    await installSchemaValidators();
    logger.info('database schema validators installed');
  } catch (err) {
    logger.warn(
      { err },
      'could not install $jsonSchema validators — application-level state ' +
        'machine still enforces every rule, but the database layer is not ' +
        'backing it up',
    );
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function databaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
