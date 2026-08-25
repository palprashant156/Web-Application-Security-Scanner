import mongoose, { Schema, Document } from 'mongoose';

export interface IFinding extends Document {
  scanId: mongoose.Types.ObjectId;
  title: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'CONFIRMED' | 'POTENTIAL' | 'INFO' | 'NOT_DETECTED';
  description: string;
  impact: string;
  evidence: string;
  recommendation: string;
  affectedUrl?: string;
  affectedParameter?: string;
  scannerModule: string;
  references: string[];
  createdAt: Date;
}

const FindingSchema: Schema = new Schema({
  scanId: { type: Schema.Types.ObjectId, ref: 'Scan', required: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['CONFIRMED', 'POTENTIAL', 'INFO', 'NOT_DETECTED'], 
    required: true 
  },
  description: { type: String },
  impact: { type: String },
  evidence: { type: String },
  recommendation: { type: String },
  affectedUrl: { type: String },
  affectedParameter: { type: String },
  scannerModule: { type: String, required: true },
  references: [{ type: String }],
}, { timestamps: true });

export const FindingModel = mongoose.model<IFinding>('Finding', FindingSchema);
