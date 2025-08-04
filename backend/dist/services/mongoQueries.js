"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoQueries = void 0;
const User_1 = __importDefault(require("../models/User"));
const Route_1 = __importDefault(require("../models/Route"));
const Alert_1 = __importDefault(require("../models/Alert"));
const ApiCall_1 = __importDefault(require("../models/ApiCall"));
const AIUsage_1 = __importDefault(require("../models/AIUsage"));
const mongoose_1 = require("mongoose");
class MongoQueries {
    // User queries
    static async getUserById(userId) {
        return User_1.default.findById(userId);
    }
    static async getUserByEmail(email) {
        return User_1.default.findOne({ email: email.toLowerCase() });
    }
    static async updateUserSubscription(userId, type) {
        const expiresAt = type === 'premium'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : null;
        return User_1.default.findByIdAndUpdate(userId, {
            subscriptionType: type,
            subscriptionExpiresAt: expiresAt
        }, { new: true });
    }
    // Route queries
    static async getActiveRoutesByTier(tier) {
        return Route_1.default.find({ tier, isActive: true });
    }
    static async updateRoutePerformance(routeId, performance) {
        return Route_1.default.findByIdAndUpdate(routeId, {
            $set: { performance },
            lastScan: new Date()
        }, { new: true });
    }
    static async getRouteStats() {
        return Route_1.default.aggregate([
            {
                $match: { isActive: true }
            },
            {
                $group: {
                    _id: '$tier',
                    count: { $sum: 1 },
                    avgDiscount: { $avg: '$performance.avgDiscount' },
                    totalAlerts: { $sum: '$performance.totalAlerts' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);
    }
    // Alert queries
    static async saveAlert(alertData) {
        const alert = new Alert_1.default({
            ...alertData,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
        });
        return alert.save();
    }
    static async getUserAlerts(userId, limit = 20) {
        return Alert_1.default.find({ 'sentTo.user': userId })
            .populate('route', 'origin destination')
            .sort({ detectedAt: -1 })
            .limit(limit);
    }
    static async markAlertOpened(alertId, userId) {
        return Alert_1.default.updateOne({
            _id: alertId,
            'sentTo.user': userId
        }, {
            $set: { 'sentTo.$.openedAt': new Date() }
        });
    }
    static async markAlertClicked(alertId, userId) {
        return Alert_1.default.updateOne({
            _id: alertId,
            'sentTo.user': userId
        }, {
            $set: { 'sentTo.$.clickedAt': new Date() }
        });
    }
    static async getAlertsSentToday(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const count = await Alert_1.default.countDocuments({
            'sentTo.user': userId,
            'sentTo.sentAt': { $gte: today }
        });
        return count;
    }
    // Stats queries
    static async getUserStats(userId) {
        const pipeline = [
            {
                $match: { 'sentTo.user': new mongoose_1.Types.ObjectId(userId) }
            },
            {
                $group: {
                    _id: null,
                    totalAlerts: { $sum: 1 },
                    totalSavings: {
                        $sum: { $subtract: ['$originalPrice', '$price'] }
                    },
                    avgDiscount: { $avg: '$discountPercentage' },
                    maxDiscount: { $max: '$discountPercentage' }
                }
            }
        ];
        const results = await Alert_1.default.aggregate(pipeline);
        return results[0] || { totalAlerts: 0, totalSavings: 0, avgDiscount: 0, maxDiscount: 0 };
    }
    static async getTopDestinations(userId, limit = 10) {
        return Alert_1.default.aggregate([
            {
                $match: { 'sentTo.user': new mongoose_1.Types.ObjectId(userId) }
            },
            {
                $group: {
                    _id: '$destination',
                    count: { $sum: 1 },
                    avgDiscount: { $avg: '$discountPercentage' },
                    totalSavings: {
                        $sum: { $subtract: ['$originalPrice', '$price'] }
                    }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: limit
            }
        ]);
    }
    // API usage queries
    static async logApiCall(data) {
        const apiCall = new ApiCall_1.default(data);
        return apiCall.save();
    }
    static async getApiUsageStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyStats = await ApiCall_1.default.aggregate([
            {
                $match: {
                    apiName: 'flightlabs',
                    createdAt: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    avgResponseTime: { $avg: '$responseTimeMs' }
                }
            }
        ]);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthlyCount = await ApiCall_1.default.countDocuments({
            apiName: 'flightlabs',
            createdAt: { $gte: monthStart }
        });
        return {
            daily: dailyStats[0]?.count || 0,
            monthly: monthlyCount,
            avgResponseTime: dailyStats[0]?.avgResponseTime || 0
        };
    }
    // AI usage queries
    static async logAIUsage(data) {
        const usage = new AIUsage_1.default(data);
        return usage.save();
    }
    static async getAIBudgetStatus() {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const usage = await AIUsage_1.default.aggregate([
            {
                $match: { createdAt: { $gte: monthStart } }
            },
            {
                $group: {
                    _id: '$model',
                    totalCost: { $sum: '$cost' },
                    callCount: { $sum: 1 }
                }
            }
        ]);
        const result = {
            gemini: { cost: 0, calls: 0 },
            gpt: { cost: 0, calls: 0 }
        };
        usage.forEach((item) => {
            if (item._id && typeof item._id === 'string' && (item._id === 'gemini' || item._id === 'gpt')) {
                result[item._id] = {
                    cost: item.totalCost || 0,
                    calls: item.callCount || 0
                };
            }
        });
        return result;
    }
    // Admin queries
    static async getAdminStats() {
        const [totalUsers, premiumUsers, activeRoutes, totalAlerts, todayAlerts] = await Promise.all([
            User_1.default.countDocuments(),
            User_1.default.countDocuments({ subscriptionType: 'premium' }),
            Route_1.default.countDocuments({ isActive: true }),
            Alert_1.default.countDocuments(),
            Alert_1.default.countDocuments({
                detectedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            })
        ]);
        return {
            totalUsers,
            premiumUsers,
            activeRoutes,
            totalAlerts,
            todayAlerts,
            revenue: premiumUsers * 4.99
        };
    }
}
exports.MongoQueries = MongoQueries;
