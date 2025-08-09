// ===== backend/src/models/PricePrediction.ts =====
import mongoose, { Schema, Document } from 'mongoose';

export interface IPricePrediction extends Document {
  origin: string;
  destination: string;
  predictionDate: Date;
  currentPrice: number;
  predictedPrice: {
    '1day': number;
    '7days': number;
    '30days': number;
  };
  confidence: {
    '1day': number; // 0-100%
    '7days': number;
    '30days': number;
  };
  recommendation: 'BUY_NOW' | 'WAIT' | 'MONITOR';
  features: {
    seasonality: number;
    demand: number;
    competition: number;
    fuelPrice: number;
    events: string[];
    daysToDeparture: number;
    historicalVariance: number;
  };
  modelVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const PricePredictionSchema = new Schema({
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
  predictionDate: {
    type: Date,
    required: true
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  predictedPrice: {
    '1day': { type: Number, required: true },
    '7days': { type: Number, required: true },
    '30days': { type: Number, required: true }
  },
  confidence: {
    '1day': { type: Number, required: true, min: 0, max: 100 },
    '7days': { type: Number, required: true, min: 0, max: 100 },
    '30days': { type: Number, required: true, min: 0, max: 100 }
  },
  recommendation: {
    type: String,
    required: true,
    enum: ['BUY_NOW', 'WAIT', 'MONITOR']
  },
  features: {
    seasonality: { type: Number, required: true },
    demand: { type: Number, required: true },
    competition: { type: Number, required: true },
    fuelPrice: { type: Number, required: true },
    events: [{ type: String }],
    daysToDeparture: { type: Number, required: true },
    historicalVariance: { type: Number, required: true }
  },
  modelVersion: {
    type: String,
    required: true,
    default: '1.0.0'
  }
}, {
  timestamps: true
});

// Indexes for performance
PricePredictionSchema.index({ origin: 1, destination: 1, predictionDate: -1 });
PricePredictionSchema.index({ predictionDate: -1 });
PricePredictionSchema.index({ recommendation: 1 });

const PricePrediction = mongoose.model<IPricePrediction>('PricePrediction', PricePredictionSchema);
export default PricePrediction;
