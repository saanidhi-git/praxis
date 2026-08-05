
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from './logger.js';
import {
  ForbiddenTransitionError,
  IllegalTransitionError,
} from '../modules/review/state-machine.js';
import { StaleWriteError } from '../modules/review/answer.repository.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'ERROR',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`, 'NOT_FOUND');
export const unauthorized = (msg = 'Authentication required') =>
  new HttpError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Not permitted') => new HttpError(403, msg, 'FORBIDDEN');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof StaleWriteError) {
    res.status(409).json({
      error: err.message,
      code: err.code,
      hint: 'Refetch the answer and retry with the current version.',
      actual: err.actual,
    });
    return;
  }

  if (err instanceof IllegalTransitionError) {
    res.status(422).json({
      error: err.message,
      code: err.code,
      from: err.from,
      to: err.to,
      action: err.action,
    });
    return;
  }

  if (err instanceof ForbiddenTransitionError) {
    res.status(403).json({ error: err.message, code: err.code });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  logger.error({ err }, 'unhandled error');
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
}

export function asyncRoute<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };
}
