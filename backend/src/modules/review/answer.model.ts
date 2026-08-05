
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

import { ANSWER_STATES } from './state-machine.js';

// --------------------------------------------------------------------------
// Answer
// --------------------------------------------------------------------------
const answerSchema = new Schema(
  {
    doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true, index: true },

    content: { type: String, required: true, maxlength: 20_000 },

    state: {
      type: String,
      enum: ANSWER_STATES,
      required: true,
      default: 'draft',
      index: true,
    },

    version: { type: Number, required: true, default: 0 },

    authoredBy: {
      type: String,
      enum: ['model', 'teacher'],
      required: true,
      default: 'model',
    },

    llm: {
      provider: { type: String },
      model: { type: String },
      promptTokens: { type: Number },
      completionTokens: { type: Number },
      latencyMs: { type: Number },
      injectionFlagged: { type: Boolean, default: false },
      injectionSignals: { type: [String], default: [] },
    },

    triage: {
      topic: { type: String },
      urgency: { type: String, enum: ['low', 'medium', 'high'] },
      confidence: { type: Number, min: 0, max: 1 },
      lane: { type: String, enum: ['auto', 'review'] },
      thresholdUsed: { type: Number },
    },
  },
  { timestamps: true, collection: 'answers' },
);

answerSchema.index({ state: 1, 'triage.urgency': -1, createdAt: 1 });

export type AnswerDoc = InferSchemaType<typeof answerSchema>;
export const Answer: Model<AnswerDoc> =
  (mongoose.models.Answer as Model<AnswerDoc>) ??
  mongoose.model<AnswerDoc>('Answer', answerSchema);

// --------------------------------------------------------------------------
// Transition audit — append-only
// --------------------------------------------------------------------------
const transitionSchema = new Schema(
  {
    answerId: { type: Schema.Types.ObjectId, ref: 'Answer', required: true, index: true },
    from: { type: String, enum: ANSWER_STATES, required: true },
    to: { type: String, enum: ANSWER_STATES, required: true },
    action: { type: String, required: true },
    actorRole: { type: String, enum: ['system', 'teacher', 'student'], required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, maxlength: 2_000 },
    fromVersion: { type: Number, required: true },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { collection: 'answer_transitions', capped: false },
);

transitionSchema.index({ answerId: 1, at: 1 });

export type TransitionDoc = InferSchemaType<typeof transitionSchema>;
export const AnswerTransition: Model<TransitionDoc> =
  (mongoose.models.AnswerTransition as Model<TransitionDoc>) ??
  mongoose.model<TransitionDoc>('AnswerTransition', transitionSchema);

// --------------------------------------------------------------------------
// Database-level validators
// --------------------------------------------------------------------------
export async function installSchemaValidators(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('installSchemaValidators called before connect()');

  const install = async (name: string, validator: object) => {
    try {
      await db.command({ collMod: name, validator, validationLevel: 'moderate' });
    } catch {
      try {
        await db.createCollection(name, { validator });
      } catch (err) {
        const code = (err as { code?: number }).code;
        if (code !== 48) throw err; // 48 = NamespaceExists, benign here
        await db.command({ collMod: name, validator, validationLevel: 'moderate' });
      }
    }
  };

  const answerValidator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['doubtId', 'content', 'state', 'version'],
      properties: {
        state: {
          enum: [...ANSWER_STATES],
          description: 'must be one of the declared states',
        },
        version: { bsonType: 'int', minimum: 0 },
        content: { bsonType: 'string', maxLength: 20_000 },
      },
    },
  };

  await install('answers', answerValidator);

  const transitionValidator = {
    $jsonSchema: {
      bsonType: 'object',
      required: ['answerId', 'from', 'to', 'action', 'actorRole', 'fromVersion', 'at'],
      properties: {
        from: { enum: [...ANSWER_STATES] },
        to: { enum: [...ANSWER_STATES] },
        actorRole: { enum: ['system', 'teacher', 'student'] },
      },
    },
  };

  await install('answer_transitions', transitionValidator);
}
