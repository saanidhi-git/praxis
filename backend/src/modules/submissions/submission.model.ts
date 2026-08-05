import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const submissionSchema = new Schema(
  {
    studentId: { type: String, required: true, index: true },
    problemSlug: { type: String, required: true, index: true },
    language: { type: String, enum: ['python'], default: 'python' },
    source: { type: String, required: true, maxlength: 50_000 },

    visiblePassed: { type: Number, default: 0 },
    visibleTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ok', 'error', 'timeout', 'rejected'],
      default: 'ok',
    },
    stderr: { type: String, maxlength: 4_000 },
    runtimeMs: { type: Number, default: 0 },

    metrics: {
      sloc: Number,
      cyclomaticMax: Number,
      maintainabilityIndex: Number,
      commentRatio: Number,
      parseOk: Number,
    },

    predictedQuality: { type: Number, min: 0, max: 1 },

    feedback: { type: String, maxlength: 5_000 },
    injectionFlagged: { type: Boolean, default: false },
    injectionSignals: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'submissions' },
);

submissionSchema.index({ studentId: 1, createdAt: -1 });

export type SubmissionDoc = InferSchemaType<typeof submissionSchema>;
export const Submission: Model<SubmissionDoc> =
  (mongoose.models.Submission as Model<SubmissionDoc>) ??
  mongoose.model<SubmissionDoc>('Submission', submissionSchema);
