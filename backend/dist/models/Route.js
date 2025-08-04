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
exports.Route = void 0;
// ===== backend/src/models/Route.ts =====
const mongoose_1 = __importStar(require("mongoose"));
const RouteSchema = new mongoose_1.Schema({
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
        enum: [2, 4, 6, 12]
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
const Route = mongoose_1.default.model('Route', RouteSchema);
exports.Route = Route;
exports.default = Route;
