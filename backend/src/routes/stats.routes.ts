// ===== backend/src/routes/stats.routes.ts =====
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { MongoQueries } from '../services/mongoQueries';
import { Alert } from '../models/Alert';
import { logger } from '../app';

const router = Router();

router.use(authenticateToken);

// Get user savings statistics
router.get('/savings', async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const stats = await MongoQueries.getUserStats(userId);
    
    res.json({
      alertCount: stats.totalAlerts,
      totalSavings: Math.round(stats.totalSavings),
      avgDiscount: Math.round(stats.avgDiscount),
      maxDiscount: stats.maxDiscount
    });
  } catch (error) {
    logger.error('Savings stats error:', error);
    res.status(500).json({ error: 'Failed to fetch savings' });
  }
});

// Get monthly savings breakdown
router.get('/savings/monthly', async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const monthlyStats = await Alert.aggregate([
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
  } catch (error) {
    logger.error('Monthly savings error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly savings' });
  }
});

// Get top destinations
router.get('/destinations', async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const destinations = await MongoQueries.getTopDestinations(userId);
    
    res.json(destinations.map(dest => ({
      destination: dest._id,
      alertCount: dest.count,
      avgDiscount: Math.round(dest.avgDiscount),
      totalSavings: Math.round(dest.totalSavings)
    })));
  } catch (error) {
    logger.error('Destinations stats error:', error);
    res.status(500).json({ error: 'Failed to fetch destinations' });
  }
});

export default router;