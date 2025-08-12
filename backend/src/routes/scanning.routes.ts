import express from 'express';
import { getStrategicScanner } from '../cron/strategicFlightScanner_fixed';
import { calculateRouteStrategy, STRATEGIC_ROUTES, getRoutesByTier } from '../utils/strategicRoutes';
import { Route } from '../models/Route';
import { Alert } from '../models/Alert';

const router = express.Router();

// Get strategic scanning status and statistics
router.get('/status', async (req, res) => {
  try {
    const scanner = getStrategicScanner();
    
    if (!scanner) {
      return res.status(503).json({ 
        message: 'Strategic scanner not initialized',
        status: 'offline'
      });
    }

    const stats = scanner.getStats();
    const strategy = calculateRouteStrategy();
    
    // Get recent scan activity
    const recentAlerts = await Alert.find()
      .sort({ detectedAt: -1 })
      .limit(10)
      .select('origin destination airline price discountPercentage detectedAt');

    // Get route performance
    const topPerformingRoutes = await Route.find({ isActive: true })
      .sort({ 'performance.totalAlerts': -1 })
      .limit(5)
      .select('origin destination tier performance lastScan');

    res.json({
      status: 'online',
      scanner: {
        isCurrentlyScanning: stats.isCurrentlyScanning,
        totalScans: stats.totalScans,
        dealsFound: stats.dealsFound,
        alertsSent: stats.alertsSent,
        apiCallsUsed: stats.apiCallsUsed,
        lastScanTimes: stats.lastScanTimes,
        efficiency: stats.dealsFound / Math.max(stats.apiCallsUsed, 1)
      },
      strategy: {
        totalRoutes: strategy.total.routes,
        tier1Routes: strategy.tier1.routes,
        tier2Routes: strategy.tier2.routes,
        tier3Routes: strategy.tier3.routes,
        estimatedDailyApiCalls: Math.round(strategy.total.callsPerDay),
        estimatedMonthlyApiCalls: Math.round(strategy.total.callsPerMonth),
        averageCallsPerRoute: strategy.total.callsPerDay / strategy.total.routes
      },
      recentActivity: {
        recentAlerts,
        topPerformingRoutes
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scanner status', error });
  }
});

// Get strategic routes configuration
router.get('/routes', async (req, res) => {
  try {
    const { tier, priority, userType } = req.query;
    
    let routes = [...STRATEGIC_ROUTES];
    
    // Filter by tier if specified
    if (tier) {
      const tierNum = parseInt(tier as string);
      if ([1, 2, 3].includes(tierNum)) {
        routes = getRoutesByTier(tierNum as 1 | 2 | 3);
      }
    }
    
    // Filter by priority if specified
    if (priority && ['high', 'medium', 'low'].includes(priority as string)) {
      routes = routes.filter(r => r.priority === priority);
    }
    
    // Filter by user type if specified
    if (userType && ['free', 'premium', 'enterprise'].includes(userType as string)) {
      routes = routes.filter(r => r.targetUserTypes.includes(userType as any));
    }
    
    // Get database performance data for these routes
    const routesWithPerformance = await Promise.all(
      routes.map(async (strategicRoute) => {
        const dbRoute = await Route.findOne({
          origin: strategicRoute.origin,
          destination: strategicRoute.destination
        });
        
        return {
          ...strategicRoute,
          performance: dbRoute?.performance || {
            totalAlerts: 0,
            avgDiscount: 0,
            clickRate: 0,
            conversionRate: 0
          },
          lastScan: dbRoute?.lastScan,
          isActive: dbRoute?.isActive ?? true
        };
      })
    );
    
    res.json({
      routes: routesWithPerformance,
      summary: {
        totalRoutes: routesWithPerformance.length,
        byTier: {
          tier1: routesWithPerformance.filter(r => r.tier === 1).length,
          tier2: routesWithPerformance.filter(r => r.tier === 2).length,
          tier3: routesWithPerformance.filter(r => r.tier === 3).length
        },
        byPriority: {
          high: routesWithPerformance.filter(r => r.priority === 'high').length,
          medium: routesWithPerformance.filter(r => r.priority === 'medium').length,
          low: routesWithPerformance.filter(r => r.priority === 'low').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching strategic routes', error });
  }
});

// Force a manual scan
router.post('/scan/force', async (req, res) => {
  try {
    const scanner = getStrategicScanner();
    
    if (!scanner) {
      return res.status(503).json({ 
        message: 'Strategic scanner not initialized' 
      });
    }

    const { tier, maxRoutes = 5 } = req.body;
    
    // Validate tier if provided
    if (tier && ![1, 2, 3].includes(tier)) {
      return res.status(400).json({ 
        message: 'Invalid tier. Must be 1, 2, or 3' 
      });
    }
    
    // Validate maxRoutes
    if (maxRoutes < 1 || maxRoutes > 20) {
      return res.status(400).json({ 
        message: 'maxRoutes must be between 1 and 20' 
      });
    }

    // Start the scan (non-blocking)
    scanner.forceScan(tier, maxRoutes).catch(error => {
      console.error('❌ Force scan error:', error);
    });
    
    res.json({ 
      message: 'Manual scan initiated',
      tier: tier || 'all',
      maxRoutes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error initiating manual scan', error });
  }
});

// Get scanning analytics
router.get('/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = Math.min(Math.max(parseInt(days as string), 1), 30);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    
    // Get alerts analytics
    const alertsAnalytics = await Alert.aggregate([
      {
        $match: {
          detectedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$detectedAt" } },
            tier: "$tier"
          },
          alertsCount: { $sum: 1 },
          avgDiscount: { $avg: "$discountPercentage" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          avgPrice: { $avg: "$price" }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);
    
    // Get route performance
    const routePerformance = await Route.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: "$tier",
          totalRoutes: { $sum: 1 },
          totalAlerts: { $sum: "$performance.totalAlerts" },
          avgDiscount: { $avg: "$performance.avgDiscount" },
          avgClickRate: { $avg: "$performance.clickRate" },
          avgConversionRate: { $avg: "$performance.conversionRate" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);
    
    // Calculate ROI metrics
    const strategy = calculateRouteStrategy();
    const totalPotentialSavings = await Alert.aggregate([
      {
        $match: {
          detectedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSavings: {
            $sum: {
              $multiply: [
                "$price",
                { $divide: ["$discountPercentage", 100] }
              ]
            }
          }
        }
      }
    ]);
    
    res.json({
      period: {
        days: daysNum,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      },
      strategy: {
        totalRoutes: strategy.total.routes,
        estimatedDailyApiCalls: Math.round(strategy.total.callsPerDay),
        estimatedMonthlyApiCalls: Math.round(strategy.total.callsPerMonth),
        estimatedMonthlyCost: Math.round(strategy.total.callsPerMonth * 0.01) // Assuming $0.01 per call
      },
      alerts: {
        byDay: alertsAnalytics,
        totalInPeriod: alertsAnalytics.reduce((sum, item) => sum + item.alertsCount, 0)
      },
      performance: {
        byTier: routePerformance,
        totalSavingsGenerated: totalPotentialSavings[0]?.totalSavings || 0
      },
      efficiency: {
        alertsPerApiCall: alertsAnalytics.reduce((sum, item) => sum + item.alertsCount, 0) / Math.max(strategy.total.callsPerDay * daysNum, 1),
        savingsPerApiCall: (totalPotentialSavings[0]?.totalSavings || 0) / Math.max(strategy.total.callsPerDay * daysNum, 1)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error });
  }
});

// Get real-time scanning metrics
router.get('/metrics/live', async (req, res) => {
  try {
    const scanner = getStrategicScanner();
    
    if (!scanner) {
      return res.status(503).json({ 
        message: 'Strategic scanner not initialized' 
      });
    }

    const stats = scanner.getStats();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Recent activity
    const recentAlerts = await Alert.countDocuments({
      detectedAt: { $gte: oneHourAgo }
    });
    
    const activeRoutes = await Route.countDocuments({
      isActive: true,
      lastScan: { $gte: oneHourAgo }
    });
    
    res.json({
      timestamp: now.toISOString(),
      scanner: {
        isScanning: stats.isCurrentlyScanning,
        lastActivity: Math.max(
          new Date(stats.lastScanTimes.tier1).getTime(),
          new Date(stats.lastScanTimes.tier2).getTime(),
          new Date(stats.lastScanTimes.tier3).getTime()
        )
      },
      activity: {
        alertsLastHour: recentAlerts,
        routesScannedLastHour: activeRoutes,
        totalAlertsToday: stats.alertsSent,
        totalApiCallsToday: stats.apiCallsUsed
      },
      health: {
        status: stats.isCurrentlyScanning ? 'scanning' : 'idle',
        uptime: now.getTime() - new Date(stats.lastScanTimes.tier1).getTime(),
        efficiency: (stats.dealsFound / Math.max(stats.apiCallsUsed, 1) * 100).toFixed(2) + '%'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching live metrics', error });
  }
});

export default router; 