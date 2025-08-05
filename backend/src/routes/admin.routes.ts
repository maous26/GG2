import express, { Request, Response } from 'express';
import User from '../models/User';
import { Alert } from '../models/Alert';
import { Route } from '../models/Route';
import { ApiCall } from '../models/ApiCall';
import { MLMaturityService } from '../services/mlMaturityService';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import { logger } from '../config/logger';
import securityAudit from '../services/securityAudit.service';
import { KPIService } from '../services/kpi.service';
import Joi from 'joi';

const router = express.Router();
const mlMaturityService = new MLMaturityService();

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    
    const usersWithStats = users.map(user => ({
      id: user._id,
      email: user.email,
      subscription_type: user.subscription_type,
      additionalAirports: user.preferences?.additionalAirports || [],
      onboardingCompleted: user.onboardingCompleted || false,
      profileCompleteness: user.profileCompleteness || 0,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    }));
    
    res.json(usersWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

// Get all routes with performance data
router.get('/routes', async (req, res) => {
  try {
    const routes = await Route.find()
      .sort({ tier: 1, origin: 1 })
      .limit(100);
    
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching routes', error });
  }
});

// Get API usage statistics
router.get('/api-usage', async (req, res) => {
  try {
    // Get usage data for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const apiCalls = await ApiCall.aggregate([
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
    const alertsByDay = await Alert.aggregate([
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
      
      const apiData = apiCalls.find((item: any) => 
        item._id.year === dateKey.year && 
        item._id.month === dateKey.month && 
        item._id.day === dateKey.day
      );
      
      const alertData = alertsByDay.find((item: any) => 
        item._id.year === dateKey.year && 
        item._id.month === dateKey.month && 
        item._id.day === dateKey.day
      );
      
      usageData.push({
        date: date.toISOString().split('T')[0],
        calls: apiData?.calls || 0,
        alerts: alertData?.alerts || 0,
        successfulCalls: apiData?.successfulCalls || 0
      });
    }
    
    res.json(usageData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching API usage', error });
  }
});

// Get comprehensive dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      premiumUsers,
      totalAlerts,
      totalRoutes,
      activeRoutes,
      todayAlerts,
      todayApiCalls,
      totalSavings
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ subscription_type: 'premium' }),
      Alert.countDocuments(),
      Route.countDocuments(),
      Route.countDocuments({ isActive: true }),
      Alert.countDocuments({
        detectedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      ApiCall.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      Alert.aggregate([
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
    const recentUsers = await User.find()
      .select('email subscription_type created_at alerts_received')
      .sort({ created_at: -1 })
      .limit(5);

    const topRoutes = await Route.find({ isActive: true })
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
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comprehensive stats', error });
  }
});

// Get real-time metrics (for live updates)
router.get('/metrics/live', async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const [recentAlerts, recentApiCalls, activeUsers] = await Promise.all([
      Alert.countDocuments({ detectedAt: { $gte: oneHourAgo } }),
      ApiCall.countDocuments({ createdAt: { $gte: oneHourAgo } }),
      User.countDocuments({ 
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
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
      projectedAutonomy: null as Date | null
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
  } catch (error) {
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
          score: Math.round(
            (latest.predictionAccuracy.dealDetection * 0.4) +
            (latest.predictionAccuracy.priceForecasting * 0.3) +
            (latest.predictionAccuracy.userEngagement * 0.2) +
            (latest.predictionAccuracy.routeOptimization * 0.1)
          ),
          details: latest.predictionAccuracy,
          weight: '35%'
        },
        
        stability: {
          score: Math.round(
            (latest.stability.consistencyScore * 0.4) +
            ((100 - latest.stability.errorRate) * 0.3) +
            (latest.stability.convergenceRate * 0.3)
          ),
          details: latest.stability,
          weight: '25%'
        },
        
        autonomy: {
          score: Math.round(
            ((100 - latest.autonomy.aiAssistanceFrequency) * 0.4) +
            (latest.autonomy.selfCorrectionRate * 0.3) +
            (latest.autonomy.confidenceLevel * 0.3)
          ),
          details: latest.autonomy,
          weight: '25%'
        },
        
        dataVolume: {
          score: Math.min(100, Math.round(
            (latest.dataVolume.trainingDataPoints / 1000) * 50 +
            (latest.dataVolume.totalDealsAnalyzed / 100) * 30 +
            (latest.dataVolume.totalRoutesOptimized / 50) * 20
          )),
          details: latest.dataVolume,
          weight: '15%'
        }
      },
      
      recommendations: latest.recommendations,
      lastEvaluated: latest.evaluatedAt,
      evaluationPeriod: latest.period
    };
    
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ML metrics', error });
  }
});

// Force scan endpoint
router.post('/force-scan', async (req, res) => {
  try {
    const { tier = 1, maxRoutes = 5 } = req.body;
    
    // Import the scanner dynamically to avoid circular dependencies
    const { getStrategicScanner } = await import('../cron/strategicFlightScanner');
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
  } catch (error) {
    console.error('❌ Error in force scan:', error);
    res.status(500).json({ message: 'Error during force scan', error: String(error) });
  }
});

// Security audit endpoints
router.get('/security/report', asyncHandler(async (req: Request, res: Response) => {
  const { days = 7 } = req.query;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - Number(days) * 24 * 60 * 60 * 1000);
  
  const report = await securityAudit.generateReport(startDate, endDate);
  res.json(report);
}));

router.get('/security/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const dashboardData = securityAudit.getDashboardData();
  const breachCheck = await securityAudit.checkDataBreachIndicators();
  
  res.json({
    timestamp: new Date().toISOString(),
    security: dashboardData,
    breachIndicators: breachCheck
  });
}));

router.post('/security/block-ip', 
  validate({
    body: Joi.object({
      ip: Joi.string().ip().required(),
      reason: Joi.string().optional()
    }).unknown(false)
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { ip, reason } = req.body;
    
    securityAudit.logEvent({
      type: 'admin_access',
      severity: 'high',
      ip,
      details: { action: 'manual_ip_block', reason },
      userAgent: req.get('User-Agent') || ''
    });
    
    logger.warn('IP manually blocked by admin', { ip, reason });
    
    res.json({ 
      success: true, 
      message: `IP ${ip} has been flagged for monitoring`,
      timestamp: new Date().toISOString()
    });
  })
);

// Enhanced KPI Endpoints for Admin Console

// Get comprehensive KPI dashboard data
router.get('/kpis/dashboard', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.range || '7d'; // 24h, 7d, 30d, 90d
  const now = new Date();
  const startDate = KPIService.getStartDate(timeRange as string);

  const [
    // User Metrics
    totalUsers,
    activeUsers,
    newUsers,
    premiumUsers,
    enterpriseUsers,
    userRetentionRate,
    
    // Flight & Route Metrics
    totalRoutes,
    activeRoutes,
    totalScans,
    successfulScans,
    totalAlerts,
    alertsConversionRate,
    
    // Financial Metrics
    totalSavings,
    avgSavingsPerAlert,
    premiumRevenue,
    
    // System Performance
    avgResponseTime,
    systemUptime,
    apiCallsSuccess,
    errorRate,
    
    // ML & AI Metrics
    mlMaturity,
    predictionAccuracy,
    
    // Daily trends
    dailyMetrics
  ] = await Promise.all([
    // User Metrics
    User.countDocuments(),
    User.countDocuments({ lastLogin: { $gte: startDate } }),
    User.countDocuments({ createdAt: { $gte: startDate } }),
    User.countDocuments({ subscription_type: 'premium' }),
    User.countDocuments({ subscription_type: 'enterprise' }),
    KPIService.calculateUserRetention(startDate),
    
    // Flight & Route Metrics
    Route.countDocuments(),
    Route.countDocuments({ isActive: true }),
    ApiCall.countDocuments({ 
      createdAt: { $gte: startDate },
      endpoint: { $regex: /scan|flight/ }
    }),
    ApiCall.countDocuments({ 
      createdAt: { $gte: startDate },
      endpoint: { $regex: /scan|flight/ },
      status: { $lt: 400 }
    }),
    Alert.countDocuments({ detectedAt: { $gte: startDate } }),
    KPIService.calculateAlertConversionRate(startDate),
    
    // Financial Metrics
    KPIService.calculateTotalSavings(startDate),
    KPIService.calculateAvgSavingsPerAlert(startDate),
    KPIService.calculatePremiumRevenue(startDate),
    
    // System Performance
    KPIService.calculateAvgResponseTime(startDate),
    KPIService.calculateSystemUptime(startDate),
    ApiCall.countDocuments({ 
      createdAt: { $gte: startDate },
      status: { $lt: 400 }
    }),
    KPIService.calculateErrorRate(startDate),
    
    // ML Metrics
    KPIService.getLatestMLMaturity(),
    KPIService.calculatePredictionAccuracy(startDate),
    
    // Daily trends
    KPIService.getDailyMetricsTrends(startDate)
  ]);

  const scanSuccessRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0;
  const userGrowthRate = await KPIService.calculateGrowthRate(newUsers, timeRange as string);

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
router.get('/kpis/users', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.range || '30d';
  const startDate = KPIService.getStartDate(timeRange as string);

  const [
    usersBySubscription,
    usersByCountry,
    userEngagement,
    userChurn,
    onboardingCompletion,
    userLifetimeValue
  ] = await Promise.all([
    KPIService.getUsersBySubscription(),
    KPIService.getUsersByCountry(),
    KPIService.getUserEngagementMetrics(startDate),
    KPIService.calculateUserChurn(startDate),
    KPIService.getOnboardingCompletionRate(),
    KPIService.calculateUserLifetimeValue()
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
router.get('/kpis/flights', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.range || '30d';
  const startDate = KPIService.getStartDate(timeRange as string);

  const [
    routePerformance,
    airlineAnalysis,
    priceAnalysis,
    scanEfficiency,
    alertQuality
  ] = await Promise.all([
    KPIService.getRoutePerformanceMetrics(startDate),
    KPIService.getAirlineAnalysis(startDate),
    KPIService.getPriceAnalysis(startDate),
    KPIService.getScanEfficiencyMetrics(startDate),
    KPIService.getAlertQualityMetrics(startDate)
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
router.get('/kpis/system', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.range || '24h';
  const startDate = KPIService.getStartDate(timeRange as string);

  const [
    responseTimeMetrics,
    throughputMetrics,
    errorAnalysis,
    resourceUsage,
    databaseMetrics,
    securityMetrics
  ] = await Promise.all([
    KPIService.getResponseTimeMetrics(startDate),
    KPIService.getThroughputMetrics(startDate),
    KPIService.getErrorAnalysis(startDate),
    KPIService.getResourceUsageMetrics(),
    KPIService.getDatabaseMetrics(),
    KPIService.getSecurityMetrics(startDate)
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
router.get('/kpis/financial', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.range || '30d';
  const startDate = KPIService.getStartDate(timeRange as string);

  const [
    revenueMetrics,
    savingsMetrics,
    subscriptionMetrics,
    costAnalysis,
    roi
  ] = await Promise.all([
    KPIService.getRevenueMetrics(startDate),
    KPIService.getSavingsMetrics(startDate),
    KPIService.getSubscriptionMetrics(startDate),
    KPIService.getCostAnalysis(startDate),
    KPIService.calculateROI(startDate)
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
router.get('/kpis/realtime', asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    currentActiveUsers,
    currentApiCalls,
    currentAlerts,
    currentErrors,
    systemHealth,
    queueStatus
  ] = await Promise.all([
    User.countDocuments({ lastLogin: { $gte: oneHourAgo } }),
    ApiCall.countDocuments({ createdAt: { $gte: oneHourAgo } }),
    Alert.countDocuments({ detectedAt: { $gte: oneHourAgo } }),
    ApiCall.countDocuments({ 
      createdAt: { $gte: oneHourAgo },
      status: { $gte: 400 }
    }),
    KPIService.getSystemHealthStatus(),
    KPIService.getQueueStatus()
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

export default router;
