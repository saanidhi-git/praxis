
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Answer, AnswerTransition } from '../../src/modules/review/answer.model.js';
import {
  StaleWriteError,
  history,
  reviewQueue,
  transition,
} from '../../src/modules/review/answer.repository.js';
import { IllegalTransitionError } from '../../src/modules/review/state-machine.js';

const URI = process.env.MONGODB_TEST_URI ?? 'mongodb://127.0.0.1:27017/praxis_test';

let reachable = false;

beforeAll(async () => {
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (reachable) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

beforeEach(async () => {
  if (!reachable) return;
  await Answer.deleteMany({});
  await AnswerTransition.deleteMany({});
});

async function seedPending() {
  const doubtId = new mongoose.Types.ObjectId();
  const answer = await Answer.create({
    doubtId,
    content: 'A drafted answer.',
    state: 'pending',
    version: 0,
    authoredBy: 'model',
  });
  return answer;
}

describe.runIf(process.env.SKIP_DB !== '1')('repository concurrency', () => {
  it('lets exactly one of many racing approvals win', async () => {
    if (!reachable) return;

    const answer = await seedPending();

    const attempts = Array.from({ length: 10 }, () =>
      transition({
        answerId: answer._id,
        to: 'approved',
        action: 'approve',
        role: 'teacher',
        expectedVersion: 0,
      }).then(
        () => 'ok' as const,
        (e) => e,
      ),
    );

    const results = await Promise.all(attempts);
    const wins = results.filter((r) => r === 'ok');
    const stale = results.filter((r) => r instanceof StaleWriteError);

    expect(wins).toHaveLength(1);
    expect(stale).toHaveLength(9);

    const final = await Answer.findById(answer._id).lean();
    expect(final?.state).toBe('approved');
    expect(final?.version).toBe(1);

    const rows = await history(answer._id);
    expect(rows).toHaveLength(1);
  });

  it('does not let a revoke race an approve into an inconsistent state', async () => {
    if (!reachable) return;

    const answer = await seedPending();

    const [approveResult, revokeResult] = await Promise.all([
      transition({
        answerId: answer._id,
        to: 'approved',
        action: 'approve',
        role: 'teacher',
        expectedVersion: 0,
      }).then(() => 'ok' as const, (e) => e),
      transition({
        answerId: answer._id,
        to: 'pending',
        action: 'revoke',
        role: 'teacher',
        note: 'wrong answer',
        expectedVersion: 0,
      }).then(() => 'ok' as const, (e) => e),
    ]);

    const outcomes = [approveResult, revokeResult];
    expect(outcomes.filter((o) => o === 'ok')).toHaveLength(1);

    const final = await Answer.findById(answer._id).lean();
    expect(['approved', 'pending']).toContain(final?.state);
    expect(final?.version).toBe(1);
  });

  it('rejects a write carrying a stale version even when the state matches', async () => {
    if (!reachable) return;

    const answer = await seedPending();

    await transition({
      answerId: answer._id,
      to: 'pending',
      action: 'edit',
      role: 'teacher',
      expectedVersion: 0,
      content: 'Edited by a teacher.',
    });

    await expect(
      transition({
        answerId: answer._id,
        to: 'approved',
        action: 'approve',
        role: 'teacher',
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(StaleWriteError);

    const final = await Answer.findById(answer._id).lean();
    expect(final?.state).toBe('pending');
    expect(final?.content).toBe('Edited by a teacher.');
  });

  it('refuses an illegal transition before touching the database', async () => {
    if (!reachable) return;

    const answer = await Answer.create({
      doubtId: new mongoose.Types.ObjectId(),
      content: 'draft',
      state: 'draft',
      version: 0,
      authoredBy: 'model',
    });

    await expect(
      transition({
        answerId: answer._id,
        to: 'approved',
        action: 'approve',
        role: 'teacher',
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(IllegalTransitionError);

    const final = await Answer.findById(answer._id).lean();
    expect(final?.state).toBe('draft');
    expect(final?.version).toBe(0);
    expect(await history(answer._id)).toHaveLength(0);
  });

  it('records an append-only trail across a full lifecycle', async () => {
    if (!reachable) return;

    const answer = await Answer.create({
      doubtId: new mongoose.Types.ObjectId(),
      content: 'draft body',
      state: 'draft',
      version: 0,
      authoredBy: 'model',
    });

    await transition({
      answerId: answer._id, to: 'pending', action: 'submit_for_review',
      role: 'system', expectedVersion: 0,
    });
    await transition({
      answerId: answer._id, to: 'pending', action: 'edit',
      role: 'teacher', expectedVersion: 1, content: 'tidied up',
    });
    await transition({
      answerId: answer._id, to: 'approved', action: 'approve',
      role: 'teacher', expectedVersion: 2,
    });
    await transition({
      answerId: answer._id, to: 'pending', action: 'revoke',
      role: 'teacher', note: 'found an error', expectedVersion: 3,
    });

    const rows = await history(answer._id);
    expect(rows.map((r) => r.action)).toEqual([
      'submit_for_review', 'edit', 'approve', 'revoke',
    ]);
    expect(rows.map((r) => r.fromVersion)).toEqual([0, 1, 2, 3]);

    const final = await Answer.findById(answer._id).lean();
    expect(final?.state).toBe('pending');
    expect(final?.version).toBe(4);
  });

  it('orders the review queue by urgency, then by age', async () => {
    if (!reachable) return;

    const doubtId = new mongoose.Types.ObjectId();
    const mk = async (urgency: string, minutesAgo: number) =>
      Answer.create({
        doubtId,
        content: `${urgency} ${minutesAgo}`,
        state: 'pending',
        version: 0,
        authoredBy: 'model',
        triage: { urgency, confidence: 0.5, lane: 'review' },
        createdAt: new Date(Date.now() - minutesAgo * 60_000),
      });

    await mk('low', 100);
    await mk('high', 5);
    await mk('medium', 50);
    await mk('high', 60);

    const queue = await reviewQueue();
    expect(queue.map((a) => a.triage?.urgency)).toEqual([
      'high', 'high', 'medium', 'low',
    ]);
    expect(queue[0]!.content).toBe('high 60');
  });
});
