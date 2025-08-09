// ===== backend/src/models/RouteOptimization.ts =====
import mongoose, { Schema, Document } from 'mongoose';

export interface IRouteOptimization extends Document {
  planData: {
    tier1Routes: any[];
    tier2Routes: any[];
    tier3Routes: any[];
    newRoutesAdded: any[];
    routesRemoved: any[];
    reason: string;
  };
  performance: {
    before: any;
    after: any;
  };
  appliedAt: Date;
}

const RouteOptimizationSchema = new Schema({
  planData: {
    type: Schema.Types.Mixed,
    required: true
  },
  performance: {
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
});

export const RouteOptimization = mongoose.model<IRouteOptimization>('RouteOptimization', RouteOptimizationSchema);
