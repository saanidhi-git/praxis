import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const doubtSchema = new Schema(
  {
    studentId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 300 },
    body: { type: String, required: true, maxlength: 10_000 },
    injectionFlagged: { type: Boolean, default: false },
    injectionSignals: { type: [String], default: [] },
  },
  { timestamps: true, collection: 'doubts' },
);

export type DoubtDoc = InferSchemaType<typeof doubtSchema>;
export const Doubt: Model<DoubtDoc> =
  (mongoose.models.Doubt as Model<DoubtDoc>) ??
  mongoose.model<DoubtDoc>('Doubt', doubtSchema);
