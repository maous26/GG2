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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const Alert_1 = require("../models/Alert");
const Route_1 = require("../models/Route");
const ApiCall_1 = require("../models/ApiCall");
const intelligentPricingService_1 = require("../services/intelligentPricingService");
const mlMaturityService_1 = require("../services/mlMaturityService");
const validation_middleware_1 = require("../middleware/validation.middleware");
const errorHandler_middleware_1 = require("../middleware/errorHandler.middleware");
const logger_1 = require("../config/logger");
const securityAudit_service_1 = __importDefault(require("../services/securityAudit.service"));
const kpi_service_1 = require("../services/kpi.service");
const joi_1 = __importDefault(require("joi"));
const router = express_1.default.Router();
const mlMaturityService = new mlMaturityService_1.MLMaturityService();
const intelligentPricingService = new intelligentPricingService_1.IntelligentPricingService();
// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User_1.default.find({}).sort({ createdAt: -1 });
        const usersWithStats = users.map(user => ({
            id: user._id,
            email: user.email,
            name: user.name || 'N/A',
            subscription_type: user.subscription_type,
            additionalAirports: user.preferences?.additionalAirports || [],
            dreamDestinations: user.preferences?.dreamDestinations || [],
            onboardingCompleted: user.onboardingCompleted || false,
            profileCompleteness: user.profileCompleteness || 0,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        }));
        res.json(usersWithStats);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});
// Update user subscription type (upgrade/downgrade)
router.put('/users/:userId/subscription', async (req, res) => {
    try {
        const { userId } = req.params;
        const { subscription_type } = req.body;
        // Validate subscription type
        if (!['free', 'premium', 'enterprise'].includes(subscription_type)) {
            return res.status(400).json({
                message: 'Invalid subscription type. Must be free, premium, or enterprise.'
            });
        }
        const user = await User_1.default.findByIdAndUpdate(userId, { subscription_type }, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Log the subscription change for audit
        logger_1.logger.info('Admin subscription change', {
            userId: user._id,
            email: user.email,
            oldSubscription: req.body.oldSubscription,
            newSubscription: subscription_type,
            adminAction: true
        });
        res.json({
            message: `User subscription updated to ${subscription_type}`,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                subscription_type: user.subscription_type,
                updatedAt: new Date()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating user subscription:', error);
        res.status(500).json({ message: 'Error updating user subscription', error });
    }
});
// Delete user account (admin only)
router.delete('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Prevent deletion of admin users
        if (user.subscription_type === 'enterprise') {
            return res.status(403).json({
                message: 'Cannot delete enterprise users (admin accounts)'
            });
        }
        // Delete user and related data
        await Promise.all([
            User_1.default.findByIdAndDelete(userId),
            Alert_1.Alert.deleteMany({ 'sentTo.user': userId })
        ]);
        // Log the deletion for audit
        logger_1.logger.warn('Admin user deletion', {
            deletedUserId: userId,
            deletedUserEmail: user.email,
            adminAction: true
        });
        res.json({
            message: 'User account deleted successfully',
            deletedUser: {
                id: userId,
                email: user.email
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user account', error });
    }
});
// Get detailed user information
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Get user's alert statistics
        const alertStats = await Alert_1.Alert.aggregate([
            { $match: { 'sentTo.user': user._id } },
            {
                $group: {
                    _id: null,
                    totalAlerts: { $sum: 1 },
                    totalSavings: {
                        $sum: {
                            $multiply: [
                                '$price',
                                { $divide: ['$discountPercentage', 100] }
                            ]
                        }
                    },
                    avgDiscount: { $avg: '$discountPercentage' }
                }
            }
        ]);
        const stats = alertStats[0] || { totalAlerts: 0, totalSavings: 0, avgDiscount: 0 };
        res.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                subscription_type: user.subscription_type,
                preferences: user.preferences,
                onboardingCompleted: user.onboardingCompleted,
                profileCompleteness: user.profileCompleteness,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            },
            stats: {
                totalAlerts: stats.totalAlerts,
                totalSavings: Math.round(stats.totalSavings),
                avgDiscount: Math.round(stats.avgDiscount || 0)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching user details', error });
    }
});
// Get all routes with performance data
router.get('/routes', async (req, res) => {
    try {
        const routes = await Route_1.Route.find()
            .sort({ tier: 1, origin: 1 })
            .limit(100);
        res.json(routes);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching routes', error });
    }
});
// Get API usage statistics
router.get('/api-usage', async (req, res) => {
    try {
        // Get usage data for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const apiCalls = await ApiCall_1.ApiCall.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    calls: { $sum: 1 },
                    successfulCalls: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "success"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            }
        ]);
        // Get alerts count by day
        const alertsByDay = await Alert_1.Alert.aggregate([
            {
                $match: {
                    detectedAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$detectedAt" },
                        month: { $month: "$detectedAt" },
                        day: { $dayOfMonth: "$detectedAt" }
                    },
                    alerts: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            }
        ]);
        // Combine data
        const usageData = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate()
            };
            const apiData = apiCalls.find((item) => item._id.year === dateKey.year &&
                item._id.month === dateKey.month &&
                item._id.day === dateKey.day);
            const alertData = alertsByDay.find((item) => item._id.year === dateKey.year &&
                item._id.month === dateKey.month &&
                item._id.day === dateKey.day);
            usageData.push({
                date: date.toISOString().split('T')[0],
                calls: apiData?.calls || 0,
                alerts: alertData?.alerts || 0,
                successfulCalls: apiData?.successfulCalls || 0
            });
        }
        res.json(usageData);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching API usage', error });
    }
});
// Get comprehensive dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, premiumUsers, totalAlerts, totalRoutes, activeRoutes, todayAlerts, todayApiCalls, totalSavings] = await Promise.all([
            User_1.default.countDocuments(),
            User_1.default.countDocuments({ subscription_type: 'premium' }),
            Alert_1.Alert.countDocuments(),
            Route_1.Route.countDocuments(),
            Route_1.Route.countDocuments({ isActive: true }),
            Alert_1.Alert.countDocuments({
                detectedAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }),
            ApiCall_1.ApiCall.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            }),
            Alert_1.Alert.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSavings: {
                            $sum: {
                                $multiply: ["$price", { $divide: ["$discountPercentage", 100] }]
                            }
                        }
                    }
                }
            ])
        ]);
        // Get recent activity
        const recentUsers = await User_1.default.find()
            .select('email subscription_type created_at alerts_received')
            .sort({ created_at: -1 })
            .limit(5);
        const topRoutes = await Route_1.Route.find({ isActive: true })
            .sort({ 'performance.totalAlerts': -1 })
            .limit(5);
        res.json({
            overview: {
                totalUsers,
                premiumUsers,
                freeUsers: totalUsers - premiumUsers,
                totalAlerts,
                totalRoutes,
                activeRoutes,
                todayAlerts,
                todayApiCalls,
                totalSavings: totalSavings[0]?.totalSavings || 0
            },
            recentUsers: recentUsers.map(user => ({
                email: user.email,
                subscription_type: user.subscription_type,
                createdAt: user.createdAt,
                onboardingCompleted: user.onboardingCompleted || false
            })),
            topRoutes: topRoutes.map(route => ({
                origin: route.origin,
                destination: route.destination,
                tier: route.tier,
                totalAlerts: route.performance.totalAlerts,
                avgDiscount: route.performance.avgDiscount,
                lastScan: route.lastScan
            }))
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching comprehensive stats', error });
    }
});
// Get real-time metrics (for live updates)
router.get('/metrics/live', async (req, res) => {
    try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const [recentAlerts, recentApiCalls, activeUsers] = await Promise.all([
            Alert_1.Alert.countDocuments({ detectedAt: { $gte: oneHourAgo } }),
            ApiCall_1.ApiCall.countDocuments({ createdAt: { $gte: oneHourAgo } }),
            User_1.default.countDocuments({
                $or: [
                    { lastLogin: { $gte: oneHourAgo } },
                    { created_at: { $gte: oneHourAgo } }
                ]
            })
        ]);
        res.json({
            timestamp: now.toISOString(),
            metrics: {
                recentAlerts,
                recentApiCalls,
                activeUsers,
                systemStatus: 'operational'
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching live metrics', error });
    }
});
// Get ML maturity status and gauge
router.get('/ml-maturity', async (req, res) => {
    try {
        const latest = await mlMaturityService.getLatestMaturity();
        if (!latest) {
            // Première évaluation - calculer pour les 30 derniers jours
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const maturity = await mlMaturityService.calculateMaturity(startDate, endDate);
            return res.json(maturity);
        }
        res.json(latest);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching ML maturity', error });
    }
});
// Force recalculate ML maturity
router.post('/ml-maturity/calculate', async (req, res) => {
    try {
        const { days = 30 } = req.body; // Nombre de jours à analyser
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const maturity = await mlMaturityService.calculateMaturity(startDate, endDate);
        res.json({
            message: 'ML maturity calculated successfully',
            maturity
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error calculating ML maturity', error });
    }
});
// Get ML maturity history/trend
router.get('/ml-maturity/history', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const history = await mlMaturityService.getMaturityHistory(Number(limit));
        // Calculer les tendances
        const trends = {
            maturityTrend: 'stable',
            lastChange: 0,
            projectedAutonomy: null
        };
        if (history.length >= 2) {
            const latest = history[0];
            const previous = history[1];
            trends.lastChange = latest.maturityScore - previous.maturityScore;
            trends.maturityTrend = trends.lastChange > 2 ? 'improving' :
                trends.lastChange < -2 ? 'declining' : 'stable';
            // Projection simple de l'autonomie
            if (trends.lastChange > 0 && latest.maturityScore < 85) {
                const remainingPoints = 85 - latest.maturityScore;
                const improvementRate = trends.lastChange;
                const weeksToAutonomy = Math.ceil(remainingPoints / improvementRate);
                trends.projectedAutonomy = new Date();
                trends.projectedAutonomy.setDate(trends.projectedAutonomy.getDate() + (weeksToAutonomy * 7));
            }
        }
        res.json({
            history,
            trends
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching ML maturity history', error });
    }
});
// Get detailed ML metrics breakdown
router.get('/ml-maturity/metrics', async (req, res) => {
    try {
        const latest = await mlMaturityService.getLatestMaturity();
        if (!latest) {
            return res.status(404).json({ message: 'No ML maturity data available. Run calculation first.' });
        }
        // Analyse détaillée avec comparaisons
        const analysis = {
            overall: {
                score: latest.maturityScore,
                status: latest.maturityScore >= 85 ? 'ready' :
                    latest.maturityScore >= 70 ? 'nearly_ready' :
                        latest.maturityScore >= 50 ? 'developing' : 'immature',
                readyForAutonomy: latest.recommendations.readyForAutonomy
            },
            breakdown: {
                prediction: {
                    score: Math.round((latest.predictionAccuracy.dealDetection * 0.4) +
                        (latest.predictionAccuracy.priceForecasting * 0.3) +
                        (latest.predictionAccuracy.userEngagement * 0.2) +
                        (latest.predictionAccuracy.routeOptimization * 0.1)),
                    details: latest.predictionAccuracy,
                    weight: '35%'
                },
                stability: {
                    score: Math.round((latest.stability.consistencyScore * 0.4) +
                        ((100 - latest.stability.errorRate) * 0.3) +
                        (latest.stability.convergenceRate * 0.3)),
                    details: latest.stability,
                    weight: '25%'
                },
                autonomy: {
                    score: Math.round(((100 - latest.autonomy.aiAssistanceFrequency) * 0.4) +
                        (latest.autonomy.selfCorrectionRate * 0.3) +
                        (latest.autonomy.confidenceLevel * 0.3)),
                    details: latest.autonomy,
                    weight: '25%'
                },
                dataVolume: {
                    score: Math.min(100, Math.round((latest.dataVolume.trainingDataPoints / 1000) * 50 +
                        (latest.dataVolume.totalDealsAnalyzed / 100) * 30 +
                        (latest.dataVolume.totalRoutesOptimized / 50) * 20)),
                    details: latest.dataVolume,
                    weight: '15%'
                }
            },
            recommendations: latest.recommendations,
            lastEvaluated: latest.evaluatedAt,
            evaluationPeriod: latest.period
        };
        res.json(analysis);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching ML metrics', error });
    }
});
// Force scan endpoint
router.post('/force-scan', async (req, res) => {
    try {
        const { tier = 1, maxRoutes = 5 } = req.body;
        // Import the scanner dynamically to avoid circular dependencies
        const { getStrategicScanner } = await Promise.resolve().then(() => __importStar(require('../cron/strategicFlightScanner')));
        const scanner = getStrategicScanner();
        if (!scanner) {
            return res.status(500).json({ message: 'Scanner not initialized' });
        }
        console.log(`🔥 Admin forcing scan: Tier ${tier}, Max routes: ${maxRoutes}`);
        await scanner.forceScan(tier, maxRoutes);
        res.json({
            message: 'Scan completed successfully',
            tier,
            maxRoutes,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error in force scan:', error);
        res.status(500).json({ message: 'Error during force scan', error: String(error) });
    }
});
// Security audit endpoints
router.get('/security/report', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const { days = 7 } = req.query;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - Number(days) * 24 * 60 * 60 * 1000);
    const report = await securityAudit_service_1.default.generateReport(startDate, endDate);
    res.json(report);
}));
router.get('/security/dashboard', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const dashboardData = securityAudit_service_1.default.getDashboardData();
    const breachCheck = await securityAudit_service_1.default.checkDataBreachIndicators();
    res.json({
        timestamp: new Date().toISOString(),
        security: dashboardData,
        breachIndicators: breachCheck
    });
}));
router.post('/security/block-ip', (0, validation_middleware_1.validate)({
    body: joi_1.default.object({
        ip: joi_1.default.string().ip().required(),
        reason: joi_1.default.string().optional()
    }).unknown(false)
}), (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const { ip, reason } = req.body;
    securityAudit_service_1.default.logEvent({
        type: 'admin_access',
        severity: 'high',
        ip,
        details: { action: 'manual_ip_block', reason },
        userAgent: req.get('User-Agent') || ''
    });
    logger_1.logger.warn('IP manually blocked by admin', { ip, reason });
    res.json({
        success: true,
        message: `IP ${ip} has been flagged for monitoring`,
        timestamp: new Date().toISOString()
    });
}));
// Enhanced KPI Endpoints for Admin Console
// Get comprehensive KPI dashboard data
router.get('/kpis/dashboard', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const timeRange = req.query.range || '7d'; // 24h, 7d, 30d, 90d
    const now = new Date();
    const startDate = kpi_service_1.KPIService.getStartDate(timeRange);
    const [
    // User Metrics
    totalUsers, activeUsers, newUsers, premiumUsers, enterpriseUsers, userRetentionRate, 
    // Flight & Route Metrics
    totalRoutes, activeRoutes, totalScans, successfulScans, totalAlerts, alertsConversionRate, 
    // Financial Metrics
    totalSavings, avgSavingsPerAlert, premiumRevenue, 
    // System Performance
    avgResponseTime, systemUptime, apiCallsSuccess, errorRate, 
    // ML & AI Metrics
    mlMaturity, predictionAccuracy, 
    // Daily trends
    dailyMetrics] = await Promise.all([
        // User Metrics
        User_1.default.countDocuments(),
        User_1.default.countDocuments({ lastLogin: { $gte: startDate } }),
        User_1.default.countDocuments({ createdAt: { $gte: startDate } }),
        User_1.default.countDocuments({ subscription_type: 'premium' }),
        User_1.default.countDocuments({ subscription_type: 'enterprise' }),
        kpi_service_1.KPIService.calculateUserRetention(startDate),
        // Flight & Route Metrics
        Route_1.Route.countDocuments(),
        Route_1.Route.countDocuments({ isActive: true }),
        ApiCall_1.ApiCall.countDocuments({
            createdAt: { $gte: startDate },
            endpoint: { $regex: /scan|flight/ }
        }),
        ApiCall_1.ApiCall.countDocuments({
            createdAt: { $gte: startDate },
            endpoint: { $regex: /scan|flight/ },
            status: { $lt: 400 }
        }),
        Alert_1.Alert.countDocuments({ detectedAt: { $gte: startDate } }),
        kpi_service_1.KPIService.calculateAlertConversionRate(startDate),
        // Financial Metrics
        kpi_service_1.KPIService.calculateTotalSavings(startDate),
        kpi_service_1.KPIService.calculateAvgSavingsPerAlert(startDate),
        kpi_service_1.KPIService.calculatePremiumRevenue(startDate),
        // System Performance
        kpi_service_1.KPIService.calculateAvgResponseTime(startDate),
        kpi_service_1.KPIService.calculateSystemUptime(startDate),
        ApiCall_1.ApiCall.countDocuments({
            createdAt: { $gte: startDate },
            status: { $lt: 400 }
        }),
        kpi_service_1.KPIService.calculateErrorRate(startDate),
        // ML Metrics
        kpi_service_1.KPIService.getLatestMLMaturity(),
        kpi_service_1.KPIService.calculatePredictionAccuracy(startDate),
        // Daily trends
        kpi_service_1.KPIService.getDailyMetricsTrends(startDate)
    ]);
    const scanSuccessRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0;
    const userGrowthRate = await kpi_service_1.KPIService.calculateGrowthRate(newUsers, timeRange);
    res.json({
        period: {
            range: timeRange,
            startDate: startDate.toISOString(),
            endDate: now.toISOString()
        },
        users: {
            total: totalUsers,
            active: activeUsers,
            new: newUsers,
            premium: premiumUsers,
            enterprise: enterpriseUsers,
            retention: userRetentionRate,
            growth: userGrowthRate,
            conversionRate: premiumUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0
        },
        flights: {
            totalRoutes,
            activeRoutes,
            totalScans,
            successfulScans,
            scanSuccessRate,
            totalAlerts,
            alertsConversionRate,
            avgAlertsPerRoute: activeRoutes > 0 ? totalAlerts / activeRoutes : 0
        },
        financial: {
            totalSavings,
            avgSavingsPerAlert,
            premiumRevenue,
            revenuePerUser: totalUsers > 0 ? premiumRevenue / totalUsers : 0,
            savingsToRevenueRatio: premiumRevenue > 0 ? totalSavings / premiumRevenue : 0
        },
        performance: {
            avgResponseTime,
            systemUptime,
            apiCallsSuccess,
            errorRate,
            availability: systemUptime > 99 ? 'excellent' : systemUptime > 95 ? 'good' : 'needs-attention'
        },
        ai: {
            maturityScore: mlMaturity?.maturityScore || 0,
            predictionAccuracy,
            readyForAutonomy: mlMaturity?.recommendations?.readyForAutonomy || false,
            riskLevel: mlMaturity?.recommendations?.riskLevel || 'unknown'
        },
        trends: dailyMetrics
    });
}));
// Get detailed user analytics
router.get('/kpis/users', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const timeRange = req.query.range || '30d';
    const startDate = kpi_service_1.KPIService.getStartDate(timeRange);
    const [usersBySubscription, usersByCountry, userEngagement, userChurn, onboardingCompletion, userLifetimeValue] = await Promise.all([
        kpi_service_1.KPIService.getUsersBySubscription(),
        kpi_service_1.KPIService.getUsersByCountry(),
        kpi_service_1.KPIService.getUserEngagementMetrics(startDate),
        kpi_service_1.KPIService.calculateUserChurn(startDate),
        kpi_service_1.KPIService.getOnboardingCompletionRate(),
        kpi_service_1.KPIService.calculateUserLifetimeValue()
    ]);
    res.json({
        period: { range: timeRange, startDate: startDate.toISOString() },
        subscription: usersBySubscription,
        geographic: usersByCountry,
        engagement: userEngagement,
        churn: userChurn,
        onboarding: onboardingCompletion,
        lifetimeValue: userLifetimeValue
    });
}));
// Get flight performance analytics
router.get('/kpis/flights', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const timeRange = req.query.range || '30d';
    const startDate = kpi_service_1.KPIService.getStartDate(timeRange);
    const [routePerformance, airlineAnalysis, priceAnalysis, scanEfficiency, alertQuality] = await Promise.all([
        kpi_service_1.KPIService.getRoutePerformanceMetrics(startDate),
        kpi_service_1.KPIService.getAirlineAnalysis(startDate),
        kpi_service_1.KPIService.getPriceAnalysis(startDate),
        kpi_service_1.KPIService.getScanEfficiencyMetrics(startDate),
        kpi_service_1.KPIService.getAlertQualityMetrics(startDate)
    ]);
    res.json({
        period: { range: timeRange, startDate: startDate.toISOString() },
        routes: routePerformance,
        airlines: airlineAnalysis,
        pricing: priceAnalysis,
        scanning: scanEfficiency,
        alerts: alertQuality
    });
}));
// Get system performance metrics
router.get('/kpis/system', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const timeRange = req.query.range || '24h';
    const startDate = kpi_service_1.KPIService.getStartDate(timeRange);
    const [responseTimeMetrics, throughputMetrics, errorAnalysis, resourceUsage, databaseMetrics, securityMetrics] = await Promise.all([
        kpi_service_1.KPIService.getResponseTimeMetrics(startDate),
        kpi_service_1.KPIService.getThroughputMetrics(startDate),
        kpi_service_1.KPIService.getErrorAnalysis(startDate),
        kpi_service_1.KPIService.getResourceUsageMetrics(),
        kpi_service_1.KPIService.getDatabaseMetrics(),
        kpi_service_1.KPIService.getSecurityMetrics(startDate)
    ]);
    res.json({
        period: { range: timeRange, startDate: startDate.toISOString() },
        performance: {
            responseTime: responseTimeMetrics,
            throughput: throughputMetrics,
            errors: errorAnalysis
        },
        resources: resourceUsage,
        database: databaseMetrics,
        security: securityMetrics
    });
}));
// Get financial analytics
router.get('/kpis/financial', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const timeRange = req.query.range || '30d';
    const startDate = kpi_service_1.KPIService.getStartDate(timeRange);
    const [revenueMetrics, savingsMetrics, subscriptionMetrics, costAnalysis, roi] = await Promise.all([
        kpi_service_1.KPIService.getRevenueMetrics(startDate),
        kpi_service_1.KPIService.getSavingsMetrics(startDate),
        kpi_service_1.KPIService.getSubscriptionMetrics(startDate),
        kpi_service_1.KPIService.getCostAnalysis(startDate),
        kpi_service_1.KPIService.calculateROI(startDate)
    ]);
    res.json({
        period: { range: timeRange, startDate: startDate.toISOString() },
        revenue: revenueMetrics,
        savings: savingsMetrics,
        subscriptions: subscriptionMetrics,
        costs: costAnalysis,
        roi: roi
    });
}));
// Get real-time KPI updates
router.get('/kpis/realtime', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const [currentActiveUsers, currentApiCalls, currentAlerts, currentErrors, systemHealth, queueStatus] = await Promise.all([
        User_1.default.countDocuments({ lastLogin: { $gte: oneHourAgo } }),
        ApiCall_1.ApiCall.countDocuments({ createdAt: { $gte: oneHourAgo } }),
        Alert_1.Alert.countDocuments({ detectedAt: { $gte: oneHourAgo } }),
        ApiCall_1.ApiCall.countDocuments({
            createdAt: { $gte: oneHourAgo },
            status: { $gte: 400 }
        }),
        kpi_service_1.KPIService.getSystemHealthStatus(),
        kpi_service_1.KPIService.getQueueStatus()
    ]);
    res.json({
        timestamp: now.toISOString(),
        realtime: {
            activeUsers: currentActiveUsers,
            apiCallsPerHour: currentApiCalls,
            alertsPerHour: currentAlerts,
            errorsPerHour: currentErrors,
            healthScore: systemHealth.score,
            status: systemHealth.status
        },
        system: {
            health: systemHealth,
            queues: queueStatus,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage()
        }
    });
}));
// ============================================
// SIMPLIFIED ADAPTIVE PRICING ENDPOINTS
// ============================================
// Get adaptive pricing system overview (simplified)
router.get('/adaptive-pricing', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    try {
        // Get basic system overview
        const totalRoutes = await Route_1.Route.countDocuments();
        const totalAlerts = await Alert_1.Alert.countDocuments();
        const recentAlerts = await Alert_1.Alert.find({
            detectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).limit(50);
        // Basic validation statistics
        const validatedAlerts = recentAlerts.filter(alert => alert.recommendation === 'SEND');
        const rejectedAlerts = recentAlerts.filter(alert => alert.recommendation === 'REJECT');
        const validationMethods = {
            statistical: recentAlerts.filter(alert => alert.validationMethod === 'STATISTICAL').length,
            predictive: recentAlerts.filter(alert => alert.validationMethod === 'PREDICTIVE').length,
            contextual: recentAlerts.filter(alert => alert.validationMethod === 'CONTEXTUAL').length
        };
        const avgValidationScore = recentAlerts.length > 0
            ? recentAlerts.reduce((sum, alert) => sum + (alert.validationScore || 0), 0) / recentAlerts.length
            : 0;
        // Basic response
        res.json({
            systemOverview: {
                transformationStatus: 'ACTIVE',
                adaptiveSystem: 'OPERATIONAL',
                totalRoutes,
                totalAlerts,
                avgValidationScore,
                aiValidationRate: (validatedAlerts.length / Math.max(recentAlerts.length, 1)) * 100
            },
            strategicRoutes: [
                {
                    _id: 'demo1',
                    hubAirport: 'CDG',
                    routeName: 'CDG → JFK',
                    tier: 1,
                    adaptiveThreshold: 25,
                    isActive: true,
                    performance: { roi: 4.2 }
                },
                {
                    _id: 'demo2',
                    hubAirport: 'CDG',
                    routeName: 'CDG → LAX',
                    tier: 1,
                    adaptiveThreshold: 27,
                    isActive: true,
                    performance: { roi: 3.8 }
                }
            ],
            pricePredictions: [
                {
                    _id: 'pred1',
                    route: 'CDG → JFK',
                    predictedPrice: { '7days': 450 },
                    confidence: { '7days': 85 },
                    marketTrend: 'MONITOR'
                }
            ],
            validationStatistics: {
                totalProcessed: recentAlerts.length,
                validated: validatedAlerts.length,
                rejected: rejectedAlerts.length,
                methods: validationMethods,
                avgScore: avgValidationScore
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error in adaptive pricing overview:', error);
        res.status(500).json({ message: 'Error fetching adaptive pricing data' });
    }
}));
// Route optimization endpoint (simplified)
router.post('/strategic-routes/:routeId/optimize', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    try {
        const { routeId } = req.params;
        // Simulate optimization
        logger_1.logger.info(`Optimizing route ${routeId}`);
        res.json({
            success: true,
            message: 'Route optimization completed',
            routeId,
            newThreshold: 25.5,
            optimizedAt: new Date()
        });
    }
    catch (error) {
        logger_1.logger.error('Error optimizing route:', error);
        res.status(500).json({ message: 'Error optimizing route' });
    }
}));
// Route analytics endpoint (simplified)
router.get('/strategic-routes/:routeId/analytics', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    try {
        const { routeId } = req.params;
        // Get alerts for this route (approximation)
        const alerts = await Alert_1.Alert.find({
            $or: [
                { route: new RegExp(routeId, 'i') },
                { origin: 'CDG', destination: 'JFK' } // Demo data
            ]
        }).limit(10);
        res.json({
            routeId,
            routeName: 'CDG → JFK',
            hubAirport: 'CDG',
            tier: 1,
            adaptiveThreshold: 25,
            recentAlerts: alerts.map(alert => ({
                _id: alert._id,
                route: `${alert.origin} → ${alert.destination}`,
                price: alert.price,
                discountPercentage: alert.discountPercentage,
                detectedAt: alert.detectedAt,
                validationScore: alert.validationScore || 85,
                recommendation: alert.recommendation || 'SEND',
                threshold: alert.adaptiveThreshold || 25
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching route analytics:', error);
        res.status(500).json({ message: 'Error fetching route analytics' });
    }
}));
exports.default = router;
