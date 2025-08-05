// ===== backend/src/models/StrategicRoute.ts =====
import mongoose, { Schema, Document } from 'mongoose';

export interface IStrategicRoute extends Document {
  origin: string;
  destination: string;
  hub: 'CDG' | 'ORY';
  tier: 1 | 2 | 3;
  category: 'PREMIUM_INTERNATIONAL' | 'REGIONAL_BUSINESS' | 'SEASONAL' | 'EMERGING' | 'DOM_TOM';
  
  // Strategic Configuration
  scanFrequencyHours: number;
  dailyApiCalls: number;
  monthlyApiBudget: number;
  
  // Dynamic Thresholds (replacing fixed 30%)
  adaptiveThresholds: {
    normal: { min: number; max: number };
    highSeason: { min: number; max: number };
    lowSeason: { min: number; max: number };
    current: number; // Currently active threshold
  };
  
  // Performance Metrics
  performance: {
    roi: number; // (Alerts × Click Rate × Conversions) / API Calls
    totalAlerts: number;
    clickRate: number;
    conversionRate: number;
    avgDiscount: number;
    lastWeekPerformance: number;
  };
  
  // Seasonal Intelligence
  seasonalPatterns: {
    spring: { demand: number; priceVariance: number; threshold: number };
    summer: { demand: number; priceVariance: number; threshold: number };
    fall: { demand: number; priceVariance: number; threshold: number };
    winter: { demand: number; priceVariance: number; threshold: number };
  };
  
  // AI Configuration
  aiConfig: {
    enablePrediction: boolean;
    enableContextualValidation: boolean;
    validationBudget: number; // Monthly budget for AI validations
    minConfidenceScore: number;
  };
  
  // Strategic Metadata
  metadata: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    userSegments: ('free' | 'premium' | 'enterprise')[];
    expectedDiscountRange: string;
    competitionLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    volatility: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
  };
  
  isActive: boolean;
  lastScan?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StrategicRouteSchema = new Schema({
  origin: {
    type: String,
    required: true,
    uppercase: true,
    length: 3
  },
  destination: {
    type: String,
    required: true,
    uppercase: true,
    length: 3
  },
  hub: {
    type: String,
    required: true,
    enum: ['CDG', 'ORY']
  },
  tier: {
    type: Number,
    required: true,
    enum: [1, 2, 3]
  },
  category: {
    type: String,
    required: true,
    enum: ['PREMIUM_INTERNATIONAL', 'REGIONAL_BUSINESS', 'SEASONAL', 'EMERGING', 'DOM_TOM']
  },
  
  // Strategic Configuration
  scanFrequencyHours: {
    type: Number,
    required: true,
    min: 2,
    max: 24
  },
  dailyApiCalls: {
    type: Number,
    required: true,
    min: 1
  },
  monthlyApiBudget: {
    type: Number,
    required: true,
    min: 10
  },
  
  // Dynamic Thresholds
  adaptiveThresholds: {
    normal: {
      min: { type: Number, required: true, min: 15, max: 50 },
      max: { type: Number, required: true, min: 20, max: 60 }
    },
    highSeason: {
      min: { type: Number, required: true, min: 10, max: 40 },
      max: { type: Number, required: true, min: 15, max: 50 }
    },
    lowSeason: {
      min: { type: Number, required: true, min: 20, max: 60 },
      max: { type: Number, required: true, min: 30, max: 70 }
    },
    current: { type: Number, required: true, min: 15, max: 60 }
  },
  
  // Performance Metrics
  performance: {
    roi: { type: Number, default: 0, min: 0 },
    totalAlerts: { type: Number, default: 0, min: 0 },
    clickRate: { type: Number, default: 0, min: 0, max: 100 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
    avgDiscount: { type: Number, default: 0, min: 0 },
    lastWeekPerformance: { type: Number, default: 0 }
  },
  
  // Seasonal Intelligence
  seasonalPatterns: {
    spring: {
      demand: { type: Number, default: 50, min: 0, max: 100 },
      priceVariance: { type: Number, default: 20, min: 0, max: 100 },
      threshold: { type: Number, default: 30, min: 15, max: 50 }
    },
    summer: {
      demand: { type: Number, default: 50, min: 0, max: 100 },
      priceVariance: { type: Number, default: 20, min: 0, max: 100 },
      threshold: { type: Number, default: 30, min: 15, max: 50 }
    },
    fall: {
      demand: { type: Number, default: 50, min: 0, max: 100 },
      priceVariance: { type: Number, default: 20, min: 0, max: 100 },
      threshold: { type: Number, default: 30, min: 15, max: 50 }
    },
    winter: {
      demand: { type: Number, default: 50, min: 0, max: 100 },
      priceVariance: { type: Number, default: 20, min: 0, max: 100 },
      threshold: { type: Number, default: 30, min: 15, max: 50 }
    }
  },
  
  // AI Configuration
  aiConfig: {
    enablePrediction: { type: Boolean, default: true },
    enableContextualValidation: { type: Boolean, default: true },
    validationBudget: { type: Number, default: 10, min: 0 }, // Monthly budget in $
    minConfidenceScore: { type: Number, default: 85, min: 50, max: 100 }
  },
  
  // Strategic Metadata
  metadata: {
    priority: {
      type: String,
      required: true,
      enum: ['HIGH', 'MEDIUM', 'LOW']
    },
    userSegments: [{
      type: String,
      enum: ['free', 'premium', 'enterprise']
    }],
    expectedDiscountRange: { type: String, required: true },
    competitionLevel: {
      type: String,
      required: true,
      enum: ['HIGH', 'MEDIUM', 'LOW']
    },
    volatility: {
      type: String,
      required: true,
      enum: ['HIGH', 'MEDIUM', 'LOW']
    },
    description: { type: String, required: true }
  },
  
  isActive: { type: Boolean, default: true },
  lastScan: { type: Date }
}, {
  timestamps: true
});

// Indexes for performance
StrategicRouteSchema.index({ origin: 1, destination: 1 });
StrategicRouteSchema.index({ hub: 1, tier: 1 });
StrategicRouteSchema.index({ category: 1 });
StrategicRouteSchema.index({ 'performance.roi': -1 });
StrategicRouteSchema.index({ isActive: 1, lastScan: 1 });

const StrategicRoute = mongoose.model<IStrategicRoute>('StrategicRoute', StrategicRouteSchema);
export default StrategicRoute;
