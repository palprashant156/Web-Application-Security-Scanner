import mongoose, { Schema, Document } from 'mongoose';

export interface IScan extends Document {
  target: string; // The URL
  targetId?: mongoose.Types.ObjectId; 
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  severitySummary?: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
  requestStatistics?: {
    totalRequests: number;
  };
  crawlerStats?: any;
  error?: string;
  createdAt: Date;
}

const ScanSchema: Schema = new Schema({
  target: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId, ref: 'Target' },
  status: { 
    type: String, 
    enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'], 
    default: 'PENDING' 
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  score: { type: Number },
  severitySummary: {
    CRITICAL: { type: Number, default: 0 },
    HIGH: { type: Number, default: 0 },
    MEDIUM: { type: Number, default: 0 },
    LOW: { type: Number, default: 0 },
    INFO: { type: Number, default: 0 }
  },
  requestStatistics: {
    totalRequests: { type: Number, default: 0 }
  },
  crawlerStats: { type: Schema.Types.Mixed },
  error: { type: String }
}, { timestamps: true });

export const Scan = mongoose.model<IScan>('Scan', ScanSchema);
