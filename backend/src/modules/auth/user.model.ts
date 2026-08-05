import bcrypt from 'bcryptjs';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'teacher'], required: true },
  },
  { timestamps: true, collection: 'users' },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ??
  mongoose.model<UserDoc>('User', userSchema);

const ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function seedDemoUsers(): Promise<void> {
  const count = await User.estimatedDocumentCount();
  if (count > 0) return;

  await User.create([
    {
      email: 'student@praxis.app',
      name: 'Demo Student',
      role: 'student',
      passwordHash: await hashPassword('praxis123'),
    },
    {
      email: 'teacher@praxis.app',
      name: 'Demo Teacher',
      role: 'teacher',
      passwordHash: await hashPassword('praxis123'),
    },
  ]);
}
