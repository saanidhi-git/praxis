
import mongoose, { type ClientSession, type Types } from 'mongoose';

import { Answer, AnswerTransition, type AnswerDoc } from './answer.model.js';
import {
  assertTransition,
  type ActorRole,
  type AnswerState,
  type TransitionAction,
} from './state-machine.js';

export class StaleWriteError extends Error {
  readonly code = 'STALE_WRITE';
  constructor(
    readonly answerId: string,
    readonly expectedState: AnswerState,
    readonly expectedVersion: number,
    readonly actual: { state: AnswerState; version: number } | null,
  ) {
    super(
      actual === null
        ? `Answer ${answerId} not found`
        : `Stale write on ${answerId}: expected ${expectedState}@v${expectedVersion}, ` +
          `found ${actual.state}@v${actual.version}. Someone else changed it first.`,
    );
    this.name = 'StaleWriteError';
  }
}

const WRITE_CONFLICT = 112;

// A transaction can abort on write conflict before the compare-and-swap filter
// gets to reject it. Same meaning to the caller: someone else won the race.
function isWriteConflict(err: unknown): boolean {
  const e = err as { code?: number; errorLabels?: string[] };
  return (
    e?.code === WRITE_CONFLICT ||
    Boolean(e?.errorLabels?.includes('TransientTransactionError'))
  );
}

let transactionSupport: boolean | null = null;

export async function supportsTransactions(): Promise<boolean> {
  if (transactionSupport !== null) return transactionSupport;

  try {
    const admin = mongoose.connection.db?.admin();
    const info = await admin?.command({ hello: 1 });
    transactionSupport = Boolean(info?.setName);
  } catch {
    transactionSupport = false;
  }
  return transactionSupport;
}

export interface TransitionInput {
  answerId: Types.ObjectId | string;
  to: AnswerState;
  action: TransitionAction;
  role: ActorRole;
  actorId?: Types.ObjectId | string | undefined;
  note?: string | undefined;
  expectedVersion: number;
  content?: string | undefined;
}

export async function transition(input: TransitionInput): Promise<AnswerDoc> {
  const { answerId, to, action, role, actorId, note, expectedVersion, content } = input;

  const current = await Answer.findById(answerId).lean();
  if (!current) {
    throw new StaleWriteError(String(answerId), to, expectedVersion, null);
  }

  const from = current.state as AnswerState;

  assertTransition({ from, to, action, role, note });

  const useTxn = await supportsTransactions();
  const session: ClientSession | null = useTxn
    ? await mongoose.startSession()
    : null;

  try {
    if (session) session.startTransaction();

    const set: Record<string, unknown> = { state: to };
    if (content !== undefined) {
      set.content = content;
      set.authoredBy = 'teacher';
    }

    const updated = await Answer.findOneAndUpdate(
      { _id: answerId, state: from, version: expectedVersion },
      { $set: set, $inc: { version: 1 } },
      { new: true, ...(session ? { session } : {}) },
    ).lean();

    if (!updated) {
      const actual = await Answer.findById(answerId).lean();
      if (session) await session.abortTransaction();
      throw new StaleWriteError(
        String(answerId),
        from,
        expectedVersion,
        actual ? { state: actual.state as AnswerState, version: actual.version } : null,
      );
    }

    await AnswerTransition.create(
      [
        {
          answerId: updated._id,
          from,
          to,
          action,
          actorRole: role,
          ...(actorId ? { actorId } : {}),
          ...(note ? { note } : {}),
          fromVersion: expectedVersion,
          at: new Date(),
        },
      ],
      session ? { session } : {},
    );

    if (session) await session.commitTransaction();
    return updated as AnswerDoc;
  } catch (err) {
    if (session && session.inTransaction()) await session.abortTransaction();

    if (isWriteConflict(err)) {
      const actual = await Answer.findById(answerId).lean();
      throw new StaleWriteError(
        String(answerId),
        from,
        expectedVersion,
        actual ? { state: actual.state as AnswerState, version: actual.version } : null,
      );
    }

    throw err;
  } finally {
    if (session) await session.endSession();
  }
}

export async function history(answerId: Types.ObjectId | string) {
  return AnswerTransition.find({ answerId }).sort({ at: 1 }).lean();
}

export async function reviewQueue(limit = 50) {
  const urgencyRank = { high: 0, medium: 1, low: 2 } as const;

  const rows = await Answer.find({ state: 'pending' })
    .sort({ createdAt: 1 })
    .limit(limit * 3)
    .lean();

  return rows
    .sort((a, b) => {
      const ua = urgencyRank[(a.triage?.urgency ?? 'low') as keyof typeof urgencyRank];
      const ub = urgencyRank[(b.triage?.urgency ?? 'low') as keyof typeof urgencyRank];
      if (ua !== ub) return ua - ub;
      return (
        new Date(a.createdAt as unknown as string).getTime() -
        new Date(b.createdAt as unknown as string).getTime()
      );
    })
    .slice(0, limit);
}

export async function studentVisibleAnswer(doubtId: Types.ObjectId | string) {
  return Answer.findOne({ doubtId, state: 'approved' }).lean();
}

export async function reconcileMissingAudit(): Promise<
  Array<{ answerId: string; version: number; auditRows: number }>
> {
  const answers = await Answer.find({}, { version: 1 }).lean();
  const out: Array<{ answerId: string; version: number; auditRows: number }> = [];

  for (const a of answers) {
    const count = await AnswerTransition.countDocuments({ answerId: a._id });
    if (count !== a.version) {
      out.push({ answerId: String(a._id), version: a.version, auditRows: count });
    }
  }
  return out;
}
