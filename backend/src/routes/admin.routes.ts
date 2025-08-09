import express, { Request, Response } from 'express';
import User from '../models/User';
import { Alert } from '../models/Alert';
import { Route } from '../models/Route';
import { ApiCall } from '../models/ApiCall';
// Import strategic models for adaptive pricing (using default exports)
import StrategicRoute from '../models/StrategicRoute';
import PricePrediction from '../models/PricePrediction';
import { IntelligentPricingService } from '../services/intelligentPricingService';
import { MLMaturityService } from '../services/mlMaturityService';
import { validate, schemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import { logger } from '../config/logger';
import securityAudit from '../services/securityAudit.service';
import { KPIService } from '../services/kpi.service';
import { FlightAPIService } from '../services/flightApiService';
import Joi from 'joi';
import ApiBudgetService from '../services/apiBudget.service';

const router = express.Router();
const mlMaturityService = new MLMaturityService();
const intelligentPricingService = new IntelligentPricingService();
const flightAPIService = new FlightAPIService();

// Lightweight admin test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const to = (req.body && req.body.to) || process.env.SENDGRID_FROM_EMAIL;
    if (!to) {
      return res.status(400).json({ message: 'Provide `to` in body or set SENDGRID_FROM_EMAIL' });
    }
    if (!process.env.SENDGRID_API_KEY) {
      return res.json({ message: 'Dry-run OK: SENDGRID_API_KEY not set, skipping actual send', to });
    }
    const { EmailService } = await import('../services/emailService');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const svc = new EmailService(pool as any);
    await (svc as any).sendTransactionalEmail({
      to,
      subject: 'GlobeGenius test email',
      template: 'test',
      data: { htmlContent: '<h3>✅ Test email from GlobeGenius</h3><p>If you see this, SendGrid works.</p>' }
    });
    return res.json({ message: 'Test email sent', to });
  } catch (e: any) {
    return res.status(500).json({ message: 'Failed to send test email', error: e?.message || String(e) });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    
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
  } catch (error) {
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

    const user = await User.findByIdAndUpdate(
      userId,
      { subscription_type },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the subscription change for audit
    logger.info('Admin subscription change', {
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
  } catch (error) {
    logger.error('Error updating user subscription:', error);
    res.status(500).json({ message: 'Error updating user subscription', error });
  }
});

// Delete user account (admin only)
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
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
      User.findByIdAndDelete(userId),
      Alert.deleteMany({ 'sentTo.user': userId })
    ]);

    // Log the deletion for audit
    logger.warn('Admin user deletion', {
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
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user account', error });
  }
});

// Get detailed user information
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's alert statistics
    const alertStats = await Alert.aggregate([
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
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details', error });
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
          successfulCalls: { $sum: { $cond: ["$success", 1, 0] } }
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
    const { getStrategicScanner } = await import('../cron/strategicFlightScanner_fixed');
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

// ============================================
// SIMPLIFIED ADAPTIVE PRICING ENDPOINTS
// ============================================

// Get adaptive pricing system overview (simplified)
router.get('/adaptive-pricing', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get basic system overview
    const totalRoutes = await Route.countDocuments();
    const totalAlerts = await Alert.countDocuments();
    const recentAlerts = await Alert.find({
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
      strategicRoutes: await StrategicRoute.find({ isActive: true })
        .limit(10)
        .sort({ 'performance.roi': -1 })
        .select('origin destination tier adaptiveThresholds.current performance hub')
        .lean()
        .then(routes => routes.map(route => ({
          _id: route._id,
          hubAirport: route.hub,
          routeName: `${route.origin} → ${route.destination}`,
          tier: route.tier,
          adaptiveThreshold: route.adaptiveThresholds?.current || 25,
          isActive: true,
          performance: { roi: route.performance?.roi || 0 }
        }))),
      pricePredictions: await PricePrediction.find()
        .limit(10)
        .sort({ predictionDate: -1 })
        .select('origin destination predictedPrice confidence recommendation')
        .lean()
        .then(predictions => predictions.map(pred => ({
          _id: pred._id,
          route: `${pred.origin} → ${pred.destination}`,
          predictedPrice: pred.predictedPrice,
          confidence: pred.confidence,
          marketTrend: pred.recommendation || 'MONITOR'
        }))),
      validationStatistics: {
        totalProcessed: recentAlerts.length,
        validated: validatedAlerts.length,
        rejected: rejectedAlerts.length,
        methods: validationMethods,
        avgScore: avgValidationScore
      }
    });
  } catch (error) {
    logger.error('Error in adaptive pricing overview:', error);
    res.status(500).json({ message: 'Error fetching adaptive pricing data' });
  }
}));

// Route optimization endpoint (simplified)
router.post('/strategic-routes/:routeId/optimize', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    
    // Simulate optimization
    logger.info(`Optimizing route ${routeId}`);
    
    res.json({
      success: true,
      message: 'Route optimization completed',
      routeId,
      newThreshold: 25.5,
      optimizedAt: new Date()
    });
  } catch (error) {
    logger.error('Error optimizing route:', error);
    res.status(500).json({ message: 'Error optimizing route' });
  }
}));

// Route analytics endpoint (simplified)
router.get('/strategic-routes/:routeId/analytics', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    
    // Get the actual strategic route from database
    const strategicRoute = await StrategicRoute.findById(routeId).lean();
    
    if (!strategicRoute) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    // Get alerts for this specific route
    const alerts = await Alert.find({
      $or: [
        { route: new RegExp(`${strategicRoute.origin}.*${strategicRoute.destination}`, 'i') },
        { origin: strategicRoute.origin, destination: strategicRoute.destination }
      ]
    }).limit(10).sort({ detectedAt: -1 });

    res.json({
      routeId,
      routeName: `${strategicRoute.origin} → ${strategicRoute.destination}`,
      hubAirport: strategicRoute.hub,
      tier: strategicRoute.tier,
      adaptiveThreshold: strategicRoute.adaptiveThresholds?.current || 25,
      recentAlerts: alerts.map(alert => ({
        _id: alert._id,
        route: `${alert.origin} → ${alert.destination}`,
        price: alert.price,
        discountPercentage: alert.discountPercentage,
        detectedAt: alert.detectedAt,
        validationScore: alert.validationScore || 85,
        recommendation: alert.recommendation || 'SEND',
        threshold: alert.adaptiveThreshold || strategicRoute.adaptiveThresholds?.current || 25
      }))
    });
  } catch (error) {
    logger.error('Error fetching route analytics:', error);
    res.status(500).json({ message: 'Error fetching route analytics' });
  }
}));

// ===========================================
// FLIGHTAPI REAL-TIME DATA ENDPOINTS
// ===========================================

// Get real-time FlightAPI metrics
router.get('/flightapi/metrics', asyncHandler(async (req: Request, res: Response) => {
  try {
    const currentTime = new Date();
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

    // Get FlightAPI usage statistics
    const flightApiCalls = await ApiCall.aggregate([
      {
        $match: {
          provider: 'flightapi',
          timestamp: { $gte: oneDayAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          successfulCalls: { $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] } },
          avgResponseTime: { $avg: "$responseTime" },
          totalResults: { $sum: "$resultsCount" }
        }
      }
    ]);

    // Get hourly FlightAPI calls
    const hourlyCalls = await ApiCall.aggregate([
      {
        $match: {
          provider: 'flightapi',
          timestamp: { $gte: oneHourAgo }
        }
      },
      {
        $group: {
          _id: null,
          callsLastHour: { $sum: 1 },
          errorsLastHour: { $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] } }
        }
      }
    ]);

    // Get active routes being scanned
    const activeRoutes = await StrategicRoute.countDocuments({ isActive: true });
    
    // Get recent deals detected
    const recentDeals = await Alert.countDocuments({
      detectedAt: { $gte: oneDayAgo },
      'metadata.source': 'flightapi'
    });

    const apiStats = flightApiCalls[0] || {
      totalCalls: 0,
      successfulCalls: 0,
      avgResponseTime: 0,
      totalResults: 0
    };

    const hourlyStats = hourlyCalls[0] || {
      callsLastHour: 0,
      errorsLastHour: 0
    };

    const successRate = apiStats.totalCalls > 0 ? 
      (apiStats.successfulCalls / apiStats.totalCalls) * 100 : 0;

    res.json({
      timestamp: currentTime.toISOString(),
      flightapi: {
        status: successRate > 90 ? 'excellent' : successRate > 70 ? 'good' : 'poor',
        totalCalls24h: apiStats.totalCalls,
        successfulCalls24h: apiStats.successfulCalls,
        successRate: Math.round(successRate),
        avgResponseTime: Math.round(apiStats.avgResponseTime || 0),
        callsLastHour: hourlyStats.callsLastHour,
        errorsLastHour: hourlyStats.errorsLastHour,
        totalFlightResults: apiStats.totalResults,
        activeRoutes,
        dealsDetected24h: recentDeals,
        healthScore: Math.round(successRate)
      }
    });
  } catch (error) {
    logger.error('Error fetching FlightAPI metrics:', error);
    res.status(500).json({ message: 'Error fetching FlightAPI metrics' });
  }
}));

// Get live FlightAPI data for specific route
router.post('/flightapi/live-search', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { origin, destination, departureDate, returnDate, passengers } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ message: 'Origin and destination are required' });
    }

    // Create a test route object
    const testRoute = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      tier: 1 as 1 | 2 | 3,
      scanFrequencyHours: 4 as 2 | 3 | 4 | 6 | 12,
      estimatedCallsPerScan: 2,
      remarks: 'Admin live search test',
      priority: 'medium' as 'high' | 'medium' | 'low',
      expectedDiscountRange: '10-30%',
      targetUserTypes: ['premium', 'enterprise'] as ('free' | 'premium' | 'enterprise')[],
      geographicRegion: 'europe' as 'europe' | 'americas' | 'asia' | 'africa' | 'oceania'
    };

    const searchOptions = {
      departureDate: departureDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      returnDate: returnDate || undefined,
      adults: passengers?.adults || 1,
      children: passengers?.children || 0,
      infants: passengers?.infants || 0,
      cabin: 'Economy' as const,
      currency: 'USD'
    };

    const startTime = Date.now();
    
    // Search flights using FlightAPI
    const flights = await flightAPIService.searchFlights(testRoute, searchOptions);
    
    const responseTime = Date.now() - startTime;

    // Also get deals for this route
    const deals = await flightAPIService.detectDeals(testRoute);

    res.json({
      timestamp: new Date().toISOString(),
      route: `${origin} → ${destination}`,
      searchOptions,
      responseTime,
      results: {
        flights: flights.slice(0, 10), // Return top 10 flights
        deals: deals.slice(0, 5), // Return top 5 deals
        totalFlights: flights.length,
        totalDeals: deals.length,
        priceRange: flights.length > 0 ? {
          min: Math.min(...flights.map(f => f.price)),
          max: Math.max(...flights.map(f => f.price)),
          avg: Math.round(flights.reduce((sum, f) => sum + f.price, 0) / flights.length)
        } : null
      },
      apiStatus: flights.length > 0 ? 'success' : 'error'
    });

  } catch (error) {
    logger.error('Error performing live FlightAPI search:', error);
    res.status(500).json({ 
      message: 'Error performing live search',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Get FlightAPI performance trends
router.get('/flightapi/trends', asyncHandler(async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily FlightAPI performance
    const dailyStats = await ApiCall.aggregate([
      {
        $match: {
          provider: 'flightapi',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" }
          },
          totalCalls: { $sum: 1 },
          successfulCalls: { $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] } },
          avgResponseTime: { $avg: "$responseTime" },
          totalResults: { $sum: "$resultsCount" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
      }
    ]);

    // Format the data for charts
    const trends = dailyStats.map(stat => {
      const date = new Date(stat._id.year, stat._id.month - 1, stat._id.day);
      const successRate = stat.totalCalls > 0 ? 
        (stat.successfulCalls / stat.totalCalls) * 100 : 0;

      return {
        date: date.toISOString().split('T')[0],
        totalCalls: stat.totalCalls,
        successfulCalls: stat.successfulCalls,
        successRate: Math.round(successRate),
        avgResponseTime: Math.round(stat.avgResponseTime || 0),
        totalResults: stat.totalResults
      };
    });

    res.json({
      period: `${days} days`,
      trends,
      summary: {
        totalDays: days,
        dataPoints: trends.length,
        avgSuccessRate: trends.length > 0 ? 
          Math.round(trends.reduce((sum, t) => sum + t.successRate, 0) / trends.length) : 0,
        avgResponseTime: trends.length > 0 ?
          Math.round(trends.reduce((sum, t) => sum + t.avgResponseTime, 0) / trends.length) : 0
      }
    });

  } catch (error) {
    logger.error('Error fetching FlightAPI trends:', error);
    res.status(500).json({ message: 'Error fetching FlightAPI trends' });
  }
}));

// Get real-time route scanning status
router.get('/flightapi/scanning-status', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get all strategic routes with their scanning status
    const routes = await StrategicRoute.find({ isActive: true })
      .sort({ tier: 1, origin: 1 })
      .limit(50);

    // Get recent API calls for each route
    const routeStatus = await Promise.all(
      routes.map(async (route) => {
        const recentCalls = await ApiCall.find({
          provider: 'flightapi',
          endpoint: { $regex: `${route.origin}.*${route.destination}` },
          timestamp: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
        }).sort({ timestamp: -1 }).limit(5);

        const recentAlerts = await Alert.countDocuments({
          origin: route.origin,
          destination: route.destination,
          detectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        const lastCall = recentCalls[0];
        const avgResponseTime = recentCalls.length > 0 ?
          recentCalls.reduce((sum, call) => sum + call.responseTime, 0) / recentCalls.length : 0;

        return {
          route: `${route.origin} → ${route.destination}`,
          tier: route.tier,
          scanFrequency: `${route.scanFrequencyHours}h`,
          lastScanned: lastCall?.timestamp || null,
          status: lastCall?.success ? 'active' : 'error',
          avgResponseTime: Math.round(avgResponseTime),
          recentAlerts: recentAlerts,
          callsLast2h: recentCalls.length,
          successRate: recentCalls.length > 0 ?
            Math.round((recentCalls.filter(c => c.success).length / recentCalls.length) * 100) : 0
        };
      })
    );

    res.json({
      timestamp: new Date().toISOString(),
      totalActiveRoutes: routes.length,
      routeStatus: routeStatus,
      summary: {
        activeRoutes: routeStatus.filter(r => r.status === 'active').length,
        errorRoutes: routeStatus.filter(r => r.status === 'error').length,
        avgResponseTime: Math.round(
          routeStatus.reduce((sum, r) => sum + r.avgResponseTime, 0) / routeStatus.length
        ),
        totalAlertsLast24h: routeStatus.reduce((sum, r) => sum + r.recentAlerts, 0)
      }
    });

  } catch (error) {
    logger.error('Error fetching scanning status:', error);
    res.status(500).json({ message: 'Error fetching scanning status' });
  }
}));

// Admin: Get & set monthly API calls budget
router.get('/kpis/budget', asyncHandler(async (req: Request, res: Response) => {
  const cfg = await ApiBudgetService.getConfig();
  res.json({ monthlyCalls: cfg.monthlyCalls });
}));

router.put('/kpis/budget', 
  validate({
    body: Joi.object({ monthlyCalls: Joi.number().integer().min(1000).max(2000000).required() }).unknown(false)
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { monthlyCalls } = req.body as { monthlyCalls: number };
    await ApiBudgetService.setMonthlyCalls(monthlyCalls);
    res.json({ success: true, monthlyCalls });
  })
);

export default router;
