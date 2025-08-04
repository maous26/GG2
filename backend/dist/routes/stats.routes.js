"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ===== backend/src/routes/stats.routes.ts =====
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const mongoQueries_1 = require("../services/mongoQueries");
const Alert_1 = require("../models/Alert");
const app_1 = require("../app");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Get user savings statistics
router.get('/savings', async (req, res) => {
    try {
        const userId = req.user.userId;
        const stats = await mongoQueries_1.MongoQueries.getUserStats(userId);
        res.json({
            alertCount: stats.totalAlerts,
            totalSavings: Math.round(stats.totalSavings),
            avgDiscount: Math.round(stats.avgDiscount),
            maxDiscount: stats.maxDiscount
        });
    }
    catch (error) {
        app_1.logger.error('Savings stats error:', error);
        res.status(500).json({ error: 'Failed to fetch savings' });
    }
});
// Get monthly savings breakdown
router.get('/savings/monthly', async (req, res) => {
    try {
        const userId = req.user.userId;
        const monthlyStats = await Alert_1.Alert.aggregate([
            {
                $match: { 'sentTo.user': userId }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$detectedAt' },
                        month: { $month: '$detectedAt' }
                    },
                    alerts: { $sum: 1 },
                    savings: {
                        $sum: { $subtract: ['$originalPrice', '$price'] }
                    }
                }
            },
            {
                $sort: { '_id.year': -1, '_id.month': -1 }
            },
            {
                $limit: 12
            }
        ]);
        const formatted = monthlyStats.map(stat => ({
            month: new Date(stat._id.year, stat._id.month - 1).toISOString(),
            alerts: stat.alerts,
            savings: Math.round(stat.savings)
        }));
        res.json(formatted);
    }
    catch (error) {
        app_1.logger.error('Monthly savings error:', error);
        res.status(500).json({ error: 'Failed to fetch monthly savings' });
    }
});
// Get top destinations
router.get('/destinations', async (req, res) => {
    try {
        const userId = req.user.userId;
        const destinations = await mongoQueries_1.MongoQueries.getTopDestinations(userId);
        res.json(destinations.map(dest => ({
            destination: dest._id,
            alertCount: dest.count,
            avgDiscount: Math.round(dest.avgDiscount),
            totalSavings: Math.round(dest.totalSavings)
        })));
    }
    catch (error) {
        app_1.logger.error('Destinations stats error:', error);
        res.status(500).json({ error: 'Failed to fetch destinations' });
    }
});
exports.default = router;
