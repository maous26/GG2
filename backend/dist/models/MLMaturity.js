"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLMaturity = void 0;
// ===== backend/src/models/MLMaturity.ts =====
const mongoose_1 = __importStar(require("mongoose"));
const MLMaturitySchema = new mongoose_1.Schema({
    predictionAccuracy: {
        dealDetection: { type: Number, default: 0, min: 0, max: 100 },
        priceForecasting: { type: Number, default: 0, min: 0, max: 100 },
        userEngagement: { type: Number, default: 0, min: 0, max: 100 },
        routeOptimization: { type: Number, default: 0, min: 0, max: 100 }
    },
    dataVolume: {
        totalDealsAnalyzed: { type: Number, default: 0 },
        totalRoutesOptimized: { type: Number, default: 0 },
        totalUserInteractions: { type: Number, default: 0 },
        trainingDataPoints: { type: Number, default: 0 }
    },
    stability: {
        consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
        errorRate: { type: Number, default: 100, min: 0, max: 100 },
        convergenceRate: { type: Number, default: 0, min: 0, max: 100 },
        lastSignificantImprovement: { type: Date, default: Date.now }
    },
    autonomy: {
        aiAssistanceFrequency: { type: Number, default: 100, min: 0, max: 100 },
        manualInterventions: { type: Number, default: 0 },
        selfCorrectionRate: { type: Number, default: 0, min: 0, max: 100 },
        confidenceLevel: { type: Number, default: 0, min: 0, max: 100 }
    },
    maturityScore: { type: Number, default: 0, min: 0, max: 100 },
    recommendations: {
        readyForAutonomy: { type: Boolean, default: false },
        suggestedActions: [{ type: String }],
        riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'high' },
        nextEvaluationDate: { type: Date, required: true }
    },
    evaluatedAt: { type: Date, default: Date.now },
    period: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true }
    }
}, {
    timestamps: true
});
// Index pour les requêtes par période
MLMaturitySchema.index({ evaluatedAt: -1 });
MLMaturitySchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
MLMaturitySchema.index({ maturityScore: -1 });
const MLMaturity = mongoose_1.default.model('MLMaturity', MLMaturitySchema);
exports.MLMaturity = MLMaturity;
exports.default = MLMaturity;
