// ===== backend/src/models/Route.ts =====
import mongoose, { Schema, Document } from 'mongoose';

export interface IRoute extends Document {
  origin: string;
  destination: string;
  tier: number;
  scanFrequencyHours: number;
  isActive: boolean;
  lastScan?: Date;
  performance: {
    totalAlerts: number;
    avgDiscount: number;
    clickRate: number;
    conversionRate: number;
  };
  seasonalScore: {
    spring: number;
    summer: number;
    fall: number;
    winter: number;
  };
  metadata?: {
    estimatedCallsPerScan?: number;
    remarks?: string;
    priority?: 'high' | 'medium' | 'low';
    expectedDiscountRange?: string;
    targetUserTypes?: ('free' | 'premium' | 'enterprise')[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema = new Schema({
  origin: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  destination: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  scanFrequencyHours: {
    type: Number,
    required: true,
    enum: [2, 3, 4, 6, 12]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastScan: Date,
  performance: {
    totalAlerts: { type: Number, default: 0 },
    avgDiscount: { type: Number, default: 0 },
    clickRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  seasonalScore: {
    spring: { type: Number, default: 50 },
    summer: { type: Number, default: 50 },
    fall: { type: Number, default: 50 },
    winter: { type: Number, default: 50 }
  },
  metadata: {
    estimatedCallsPerScan: { type: Number },
    remarks: { type: String },
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    expectedDiscountRange: { type: String },
    targetUserTypes: [{ type: String, enum: ['free', 'premium', 'enterprise'] }]
  }
}, {
  timestamps: true
});

// Compound index for unique routes
RouteSchema.index({ origin: 1, destination: 1 }, { unique: true });
RouteSchema.index({ tier: 1, isActive: 1 });
RouteSchema.index({ lastScan: 1 });

const Route = mongoose.model<IRoute>('Route', RouteSchema);
export { Route };
export default Route;
