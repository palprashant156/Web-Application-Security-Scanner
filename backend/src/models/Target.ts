import mongoose, { Schema, Document } from 'mongoose';

export interface ITarget extends Document {
  url: string;
  userId?: mongoose.Types.ObjectId; // Optional for now until auth is fully implemented
  createdAt: Date;
}

const TargetSchema: Schema = new Schema({
  url: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Target = mongoose.model<ITarget>('Target', TargetSchema);
