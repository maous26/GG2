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
exports.Alert = void 0;
// ===== backend/src/models/Alert.ts =====
const mongoose_1 = __importStar(require("mongoose"));
const alertSchema = new mongoose_1.Schema({
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    airline: { type: String, required: true },
    price: { type: Number, required: true },
    discountPercentage: { type: Number, required: true },
    detectedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    sentTo: [{
            user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
            sentAt: { type: Date, default: Date.now },
            opened: { type: Boolean, default: false },
            clicked: { type: Boolean, default: false }
        }]
});
const Alert = mongoose_1.default.model('Alert', alertSchema);
exports.Alert = Alert;
exports.default = Alert;
