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
const mongoose_1 = __importStar(require("mongoose"));
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    subscription_type: {
        type: String,
        enum: ['free', 'premium', 'enterprise'],
        default: 'free'
    },
    lastLogin: {
        type: Date
    },
    // Préférences Premium
    preferences: {
        additionalAirports: [{
                type: String,
                uppercase: true,
                match: /^[A-Z]{3}$/ // Code IATA 3 lettres
            }],
        dreamDestinations: [{
                destination: { type: String, required: true },
                airportCode: {
                    type: String,
                    uppercase: true,
                    match: /^[A-Z]{3}$/
                },
                priority: {
                    type: String,
                    enum: ['high', 'medium', 'low'],
                    default: 'medium'
                }
            }],
        travelerType: {
            type: String,
            enum: ['business', 'leisure', 'family', 'backpacker', 'luxury', 'adventure']
        },
        travelPeriod: {
            flexible: { type: Boolean, default: true },
            specificPeriods: [{
                    startDate: Date,
                    endDate: Date,
                    name: String
                }],
            avoidPeriods: [{
                    startDate: Date,
                    endDate: Date,
                    reason: String
                }]
        },
        notificationStyle: {
            type: String,
            enum: ['urgent', 'friendly', 'professional', 'casual'],
            default: 'friendly'
        },
        budgetRange: {
            min: Number,
            max: Number,
            currency: { type: String, default: 'EUR' }
        }
    },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingDate: Date,
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 }
}, {
    timestamps: true
});
// Index pour les recherches
userSchema.index({ email: 1 });
userSchema.index({ subscription_type: 1 });
userSchema.index({ 'preferences.additionalAirports': 1 });
userSchema.index({ 'preferences.dreamDestinations.airportCode': 1 });
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
