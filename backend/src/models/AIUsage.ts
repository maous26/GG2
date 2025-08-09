// ===== backend/src/models/AIUsage.ts =====
import mongoose, { Schema } from 'mongoose';

export interface IAIUsage {
  model: 'gemini' | 'gpt';
  task: string;
  cost: number;
  tokensUsed?: number;
  responseTimeMs?: number;
  createdAt: Date;
}

const AIUsageSchema = new Schema({
  model: {
    type: String,
    required: true,
    enum: ['gemini', 'gpt']
  },
  task: {
    type: String,
    required: true
  },
  cost: {
    type: Number,
    required: true
  },
  tokensUsed: Number,
  responseTimeMs: Number
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
AIUsageSchema.index({ model: 1, createdAt: -1 });
AIUsageSchema.index({ createdAt: -1 });

const AIUsage = mongoose.model<IAIUsage>('AIUsage', AIUsageSchema);

export { AIUsage };
export default AIUsage;
