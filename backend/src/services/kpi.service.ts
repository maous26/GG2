import User from '../models/User';
import { Alert } from '../models/Alert';
import { Route } from '../models/Route';
import { ApiCall } from '../models/ApiCall';
import { MLMaturity } from '../models/MLMaturity';
import { logger } from '../config/logger';
import mongoose from 'mongoose';

export class KPIService {
  // Utility function to get start date based on time range
  static getStartDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  // User Analytics Functions
  static async calculateUserRetention(startDate: Date): Promise<number> {
    try {
      const totalUsers = await User.countDocuments({ createdAt: { $lt: startDate } });
      const activeUsers = await User.countDocuments({ 
        createdAt: { $lt: startDate },
        lastLogin: { $gte: startDate }
      });
      return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating user retention:', error);
      return 0;
    }
  }

  static async getUsersBySubscription() {
    try {
      return await User.aggregate([
        {
          $group: {
            _id: '$subscription_type',
            count: { $sum: 1 },
            avgAlertsReceived: { $avg: '$alerts_received' }
          }
        },
        {
          $project: {
            subscriptionType: '$_id',
            userCount: '$count',
            avgAlertsReceived: { $round: ['$avgAlertsReceived', 2] },
            _id: 0
          }
        }
      ]);
    } catch (error) {
      logger.error('Error getting users by subscription:', error);
      return [];
    }
  }

  static async getUsersByCountry() {
    try {
      return await User.aggregate([
        {
          $match: { 'preferences.country': { $exists: true, $ne: null } }
        },
        {
          $group: {
            _id: '$preferences.country',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        },
        {
          $project: {
            country: '$_id',
            userCount: '$count',
            _id: 0
          }
        }
      ]);
    } catch (error) {
      logger.error('Error getting users by country:', error);
      return [];
    }
  }

  static async getUserEngagementMetrics(startDate: Date) {
    try {
      const [avgSessionsPerUser, avgAlertsPerUser, activeUsersRatio] = await Promise.all([
        User.aggregate([
          {
            $match: { lastLogin: { $gte: startDate } }
          },
          {
            $group: {
              _id: null,
              avgSessions: { $avg: '$sessionCount' }
            }
          }
        ]),
        User.aggregate([
          {
            $group: {
              _id: null,
              avgAlerts: { $avg: '$alerts_received' }
            }
          }
        ]),
        this.calculateActiveUsersRatio(startDate)
      ]);

      return {
        avgSessionsPerUser: avgSessionsPerUser[0]?.avgSessions || 0,
        avgAlertsPerUser: avgAlertsPerUser[0]?.avgAlerts || 0,
        activeUsersRatio
      };
    } catch (error) {
      logger.error('Error getting user engagement metrics:', error);
      return { avgSessionsPerUser: 0, avgAlertsPerUser: 0, activeUsersRatio: 0 };
    }
  }

  static async calculateUserChurn(startDate: Date): Promise<number> {
    try {
      const totalUsersStart = await User.countDocuments({ createdAt: { $lt: startDate } });
      const inactiveUsers = await User.countDocuments({
        createdAt: { $lt: startDate },
        lastLogin: { $lt: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000) }
      });
      return totalUsersStart > 0 ? (inactiveUsers / totalUsersStart) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating user churn:', error);
      return 0;
    }
  }

  static async getOnboardingCompletionRate() {
    try {
      const totalUsers = await User.countDocuments();
      const completedUsers = await User.countDocuments({ onboardingCompleted: true });
      return {
        total: totalUsers,
        completed: completedUsers,
        rate: totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting onboarding completion rate:', error);
      return { total: 0, completed: 0, rate: 0 };
    }
  }

  static async calculateUserLifetimeValue() {
    try {
      const premiumPrice = 9.99; // Monthly premium price
      const enterprisePrice = 49.99; // Monthly enterprise price
      
      const [premiumUsers, enterpriseUsers, avgRetentionMonths] = await Promise.all([
        User.countDocuments({ subscription_type: 'premium' }),
        User.countDocuments({ subscription_type: 'enterprise' }),
        this.calculateAvgRetentionMonths()
      ]);

      return {
        premiumLTV: premiumPrice * avgRetentionMonths,
        enterpriseLTV: enterprisePrice * avgRetentionMonths,
        avgRetentionMonths,
        totalPotentialValue: (premiumUsers * premiumPrice + enterpriseUsers * enterprisePrice) * avgRetentionMonths
      };
    } catch (error) {
      logger.error('Error calculating user lifetime value:', error);
      return { premiumLTV: 0, enterpriseLTV: 0, avgRetentionMonths: 0, totalPotentialValue: 0 };
    }
  }

  // Flight & Route Analytics Functions
  static async calculateAlertConversionRate(startDate: Date): Promise<number> {
    try {
      const totalScans = await ApiCall.countDocuments({ 
        createdAt: { $gte: startDate },
        endpoint: { $regex: /scan|flight/ }
      });
      const alertsGenerated = await Alert.countDocuments({ detectedAt: { $gte: startDate } });
      return totalScans > 0 ? (alertsGenerated / totalScans) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating alert conversion rate:', error);
      return 0;
    }
  }

  static async getRoutePerformanceMetrics(startDate: Date) {
    try {
      return await Route.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $lookup: {
            from: 'alerts',
            localField: '_id',
            foreignField: 'routeId',
            as: 'alerts'
          }
        },
        {
          $addFields: {
            recentAlerts: {
              $filter: {
                input: '$alerts',
                cond: { $gte: ['$$this.detectedAt', startDate] }
              }
            }
          }
        },
        {
          $project: {
            origin: 1,
            destination: 1,
            tier: 1,
            totalAlerts: { $size: '$recentAlerts' },
            avgDiscount: { $avg: '$recentAlerts.discountPercentage' },
            avgPrice: { $avg: '$recentAlerts.price' },
            lastScan: 1,
            scanFrequency: '$scanFrequency'
          }
        },
        {
          $sort: { totalAlerts: -1 }
        },
        {
          $limit: 20
        }
      ]);
    } catch (error) {
      logger.error('Error getting route performance metrics:', error);
      return [];
    }
  }

  static async getAirlineAnalysis(startDate: Date) {
    try {
      return await Alert.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: '$airline',
            alertCount: { $sum: 1 },
            avgDiscount: { $avg: '$discountPercentage' },
            avgPrice: { $avg: '$price' },
            totalSavings: { $sum: { $multiply: ['$price', { $divide: ['$discountPercentage', 100] }] } }
          }
        },
        {
          $sort: { alertCount: -1 }
        },
        {
          $project: {
            airline: '$_id',
            alertCount: 1,
            avgDiscount: { $round: ['$avgDiscount', 2] },
            avgPrice: { $round: ['$avgPrice', 2] },
            totalSavings: { $round: ['$totalSavings', 2] },
            _id: 0
          }
        }
      ]);
    } catch (error) {
      logger.error('Error getting airline analysis:', error);
      return [];
    }
  }

  static async getPriceAnalysis(startDate: Date) {
    try {
      const alerts = await Alert.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            avgDiscount: { $avg: '$discountPercentage' },
            maxDiscount: { $max: '$discountPercentage' },
            totalSavings: { $sum: { $multiply: ['$price', { $divide: ['$discountPercentage', 100] }] } },
            alertCount: { $sum: 1 }
          }
        }
      ]);

      return alerts[0] || {
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        avgDiscount: 0,
        maxDiscount: 0,
        totalSavings: 0,
        alertCount: 0
      };
    } catch (error) {
      logger.error('Error getting price analysis:', error);
      return { avgPrice: 0, minPrice: 0, maxPrice: 0, avgDiscount: 0, maxDiscount: 0, totalSavings: 0, alertCount: 0 };
    }
  }

  static async getScanEfficiencyMetrics(startDate: Date) {
    try {
      const [totalScans, successfulScans, avgResponseTime] = await Promise.all([
        ApiCall.countDocuments({ 
          createdAt: { $gte: startDate },
          endpoint: { $regex: /scan|flight/ }
        }),
        ApiCall.countDocuments({ 
          createdAt: { $gte: startDate },
          endpoint: { $regex: /scan|flight/ },
          status: { $lt: 400 }
        }),
        ApiCall.aggregate([
          {
            $match: { 
              createdAt: { $gte: startDate },
              endpoint: { $regex: /scan|flight/ },
              responseTime: { $exists: true }
            }
          },
          {
            $group: {
              _id: null,
              avgResponseTime: { $avg: '$responseTime' }
            }
          }
        ])
      ]);

      const successRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0;

      return {
        totalScans,
        successfulScans,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: avgResponseTime[0]?.avgResponseTime || 0
      };
    } catch (error) {
      logger.error('Error getting scan efficiency metrics:', error);
      return { totalScans: 0, successfulScans: 0, successRate: 0, avgResponseTime: 0 };
    }
  }

  static async getAlertQualityMetrics(startDate: Date) {
    try {
      const [qualityMetrics, userFeedback] = await Promise.all([
        Alert.aggregate([
          {
            $match: { detectedAt: { $gte: startDate } }
          },
          {
            $group: {
              _id: null,
              avgDiscount: { $avg: '$discountPercentage' },
              highQualityAlerts: {
                $sum: {
                  $cond: [{ $gte: ['$discountPercentage', 20] }, 1, 0]
                }
              },
              totalAlerts: { $sum: 1 }
            }
          }
        ]),
        this.getUserFeedbackMetrics(startDate)
      ]);

      const quality = qualityMetrics[0] || { avgDiscount: 0, highQualityAlerts: 0, totalAlerts: 0 };
      const qualityRate = quality.totalAlerts > 0 ? (quality.highQualityAlerts / quality.totalAlerts) * 100 : 0;

      return {
        avgDiscount: Math.round(quality.avgDiscount * 100) / 100,
        qualityRate: Math.round(qualityRate * 100) / 100,
        highQualityCount: quality.highQualityAlerts,
        totalCount: quality.totalAlerts,
        userSatisfaction: userFeedback.avgRating || 0
      };
    } catch (error) {
      logger.error('Error getting alert quality metrics:', error);
      return { avgDiscount: 0, qualityRate: 0, highQualityCount: 0, totalCount: 0, userSatisfaction: 0 };
    }
  }

  // Financial Analytics Functions
  static async calculateTotalSavings(startDate: Date): Promise<number> {
    try {
      const result = await Alert.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: null,
            totalSavings: { 
              $sum: { 
                $multiply: ['$price', { $divide: ['$discountPercentage', 100] }] 
              } 
            }
          }
        }
      ]);
      return result[0]?.totalSavings || 0;
    } catch (error) {
      logger.error('Error calculating total savings:', error);
      return 0;
    }
  }

  static async calculateAvgSavingsPerAlert(startDate: Date): Promise<number> {
    try {
      const result = await Alert.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: null,
            avgSavings: { 
              $avg: { 
                $multiply: ['$price', { $divide: ['$discountPercentage', 100] }] 
              } 
            }
          }
        }
      ]);
      return result[0]?.avgSavings || 0;
    } catch (error) {
      logger.error('Error calculating average savings per alert:', error);
      return 0;
    }
  }

  static async calculatePremiumRevenue(startDate: Date): Promise<number> {
    try {
      const premiumPrice = 9.99;
      const enterprisePrice = 49.99;
      
      const [premiumUsers, enterpriseUsers] = await Promise.all([
        User.countDocuments({ 
          subscription_type: 'premium',
          createdAt: { $lte: startDate }
        }),
        User.countDocuments({ 
          subscription_type: 'enterprise',
          createdAt: { $lte: startDate }
        })
      ]);

      // Calculate monthly revenue (simplified)
      const monthsInPeriod = Math.max(1, Math.ceil((Date.now() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      return (premiumUsers * premiumPrice + enterpriseUsers * enterprisePrice) * monthsInPeriod;
    } catch (error) {
      logger.error('Error calculating premium revenue:', error);
      return 0;
    }
  }

  static async getRevenueMetrics(startDate: Date) {
    try {
      const [totalRevenue, monthlyGrowth, subscriptionDistribution] = await Promise.all([
        this.calculatePremiumRevenue(startDate),
        this.calculateRevenueGrowth(startDate),
        this.getUsersBySubscription()
      ]);

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        subscriptionDistribution,
        avgRevenuePerUser: totalRevenue / Math.max(1, await User.countDocuments())
      };
    } catch (error) {
      logger.error('Error getting revenue metrics:', error);
      return { totalRevenue: 0, monthlyGrowth: 0, subscriptionDistribution: [], avgRevenuePerUser: 0 };
    }
  }

  static async getSavingsMetrics(startDate: Date) {
    try {
      const [totalSavings, avgSavingsPerAlert, savingsByRoute] = await Promise.all([
        this.calculateTotalSavings(startDate),
        this.calculateAvgSavingsPerAlert(startDate),
        this.getSavingsByRoute(startDate)
      ]);

      return {
        totalSavings: Math.round(totalSavings * 100) / 100,
        avgSavingsPerAlert: Math.round(avgSavingsPerAlert * 100) / 100,
        savingsByRoute: savingsByRoute.slice(0, 10)
      };
    } catch (error) {
      logger.error('Error getting savings metrics:', error);
      return { totalSavings: 0, avgSavingsPerAlert: 0, savingsByRoute: [] };
    }
  }

  static async getSubscriptionMetrics(startDate: Date) {
    try {
      const [conversionRate, churnRate, upgrades] = await Promise.all([
        this.calculateConversionRate(startDate),
        this.calculateUserChurn(startDate),
        this.getSubscriptionUpgrades(startDate)
      ]);

      return {
        conversionRate: Math.round(conversionRate * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
        upgrades
      };
    } catch (error) {
      logger.error('Error getting subscription metrics:', error);
      return { conversionRate: 0, churnRate: 0, upgrades: 0 };
    }
  }

  // System Performance Functions
  static async calculateAvgResponseTime(startDate: Date): Promise<number> {
    try {
      const result = await ApiCall.aggregate([
        // Coalesce date and normalize status
        {
          $addFields: {
            coalesceDate: { $ifNull: ['$createdAt', '$timestamp'] },
            statusNum: {
              $cond: [
                { $isNumber: '$status' },
                '$status',
                { $convert: { input: '$status', to: 'int', onError: 0, onNull: 0 } }
              ]
            }
          }
        },
        {
          $match: { 
            coalesceDate: { $gte: startDate },
            responseTime: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' }
          }
        }
      ]);
      return result[0]?.avgResponseTime || 0;
    } catch (error) {
      logger.error('Error calculating average response time:', error);
      return 0;
    }
  }

  static async calculateSystemUptime(startDate: Date): Promise<number> {
    try {
      // Use coalesced date (createdAt|timestamp) and normalized status
      const dateMatchOr = { $or: [ { createdAt: { $gte: startDate } }, { timestamp: { $gte: startDate } } ] } as any;
      const totalCalls = await ApiCall.countDocuments(dateMatchOr);
      const successfulCalls = await ApiCall.countDocuments({
        ...dateMatchOr,
        $expr: { $lt: [ { $toInt: { $ifNull: ['$status', 0] } }, 500 ] }
      });
      
      return totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 100;
    } catch (error) {
      logger.error('Error calculating system uptime:', error);
      return 0;
    }
  }

  static async calculateErrorRate(startDate: Date): Promise<number> {
    try {
      const dateMatchOr = { $or: [ { createdAt: { $gte: startDate } }, { timestamp: { $gte: startDate } } ] } as any;
      const totalCalls = await ApiCall.countDocuments(dateMatchOr);
      const errorCalls = await ApiCall.countDocuments({
        ...dateMatchOr,
        $expr: { $gte: [ { $toInt: { $ifNull: ['$status', 0] } }, 400 ] }
      });
      
      return totalCalls > 0 ? (errorCalls / totalCalls) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating error rate:', error);
      return 0;
    }
  }

  static async getResponseTimeMetrics(startDate: Date) {
    try {
      return await ApiCall.aggregate([
        {
          $addFields: {
            coalesceDate: { $ifNull: ['$createdAt', '$timestamp'] },
            statusNum: {
              $cond: [
                { $isNumber: '$status' },
                '$status',
                { $convert: { input: '$status', to: 'int', onError: 0, onNull: 0 } }
              ]
            }
          }
        },
        {
          $match: { 
            coalesceDate: { $gte: startDate },
            responseTime: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$responseTime' },
            minResponseTime: { $min: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' }
          }
        }
      ]);
    } catch (error) {
      logger.error('Error getting response time metrics:', error);
      return [{ avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0 }];
    }
  }

  static async getThroughputMetrics(startDate: Date) {
    try {
      const totalRequests = await ApiCall.countDocuments({ $or: [ { createdAt: { $gte: startDate } }, { timestamp: { $gte: startDate } } ] });
      const timeRangeHours = (Date.now() - startDate.getTime()) / (1000 * 60 * 60);
      
      return {
        requestsPerHour: timeRangeHours > 0 ? totalRequests / timeRangeHours : 0,
        totalRequests,
        peakHour: await this.getPeakHourMetrics(startDate)
      };
    } catch (error) {
      logger.error('Error getting throughput metrics:', error);
      return { requestsPerHour: 0, totalRequests: 0, peakHour: null };
    }
  }

  static async getErrorAnalysis(startDate: Date) {
    try {
      return await ApiCall.aggregate([
        {
          $addFields: {
            coalesceDate: { $ifNull: ['$createdAt', '$timestamp'] },
            statusNum: {
              $cond: [
                { $isNumber: '$status' },
                '$status',
                { $convert: { input: '$status', to: 'int', onError: 0, onNull: 0 } }
              ]
            }
          }
        },
        {
          $match: { 
            coalesceDate: { $gte: startDate },
            statusNum: { $gte: 400 }
          }
        },
        {
          $group: {
            _id: '$statusNum',
            count: { $sum: 1 },
            endpoints: { $addToSet: '$endpoint' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
    } catch (error) {
      logger.error('Error getting error analysis:', error);
      return [];
    }
  }

  // ML & AI Functions
  static async getLatestMLMaturity() {
    try {
      return await MLMaturity.findOne().sort({ evaluatedAt: -1 });
    } catch (error) {
      logger.error('Error getting latest ML maturity:', error);
      return null;
    }
  }

  static async calculatePredictionAccuracy(startDate: Date): Promise<number> {
    try {
      const mlMaturity = await this.getLatestMLMaturity();
      return mlMaturity?.predictionAccuracy?.dealDetection || 0;
    } catch (error) {
      logger.error('Error calculating prediction accuracy:', error);
      return 0;
    }
  }

  // Utility Functions
  static async calculateGrowthRate(currentValue: number, timeRange: string): Promise<number> {
    try {
      const previousPeriodStart = this.getStartDate(timeRange);
      const periodLength = Date.now() - previousPeriodStart.getTime();
      const previousStart = new Date(previousPeriodStart.getTime() - periodLength);
      
      const previousValue = await User.countDocuments({ 
        createdAt: { 
          $gte: previousStart,
          $lt: previousPeriodStart
        }
      });
      
      return previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating growth rate:', error);
      return 0;
    }
  }

  static async getDailyMetricsTrends(startDate: Date) {
    try {
      return await ApiCall.aggregate([
        {
          $addFields: {
            coalesceDate: { $ifNull: ['$createdAt', '$timestamp'] },
            statusNum: {
              $cond: [
                { $isNumber: '$status' },
                '$status',
                { $convert: { input: '$status', to: 'int', onError: 0, onNull: 0 } }
              ]
            }
          }
        },
        {
          $match: { coalesceDate: { $gte: startDate } }
        },
        {
          $group: {
            _id: {
              year: { $year: '$coalesceDate' },
              month: { $month: '$coalesceDate' },
              day: { $dayOfMonth: '$coalesceDate' }
            },
            requests: { $sum: 1 },
            errors: {
              $sum: {
                $cond: [{ $gte: ['$statusNum', 400] }, 1, 0]
              }
            }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            },
            requests: 1,
            errors: 1,
            successRate: {
              $cond: [
                { $gt: ['$requests', 0] },
                { $multiply: [ { $divide: [{ $subtract: ['$requests', '$errors'] }, '$requests'] }, 100 ] },
                0
              ]
            },
            _id: 0
          }
        }
      ]);
    } catch (error) {
      logger.error('Error getting daily metrics trends:', error);
      return [];
    }
  }

  // System Health Functions
  static getSystemHealthStatus() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const cpuUsage = process.cpuUsage();
    
    // Calculate health score based on various metrics
    let healthScore = 100;
    
    // Memory usage check (penalize if over 80% of heap used)
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 80) healthScore -= 20;
    else if (memoryUsagePercent > 60) healthScore -= 10;
    
    // Uptime check (penalize if less than 1 hour)
    if (uptime < 3600) healthScore -= 10;
    
    return {
      score: healthScore,
      status: healthScore > 90 ? 'excellent' : healthScore > 75 ? 'good' : healthScore > 50 ? 'fair' : 'poor',
      uptime,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        usage: Math.round(memoryUsagePercent)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    };
  }

  static async getQueueStatus() {
    // This would integrate with actual queue system
    // For now, return mock data
    return {
      scanning: {
        pending: 0,
        processing: 0,
        completed: 0
      },
      alerts: {
        pending: 0,
        processing: 0,
        completed: 0
      }
    };
  }

  // Helper Functions
  private static async calculateActiveUsersRatio(startDate: Date): Promise<number> {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ lastLogin: { $gte: startDate } });
      return totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating active users ratio:', error);
      return 0;
    }
  }

  private static async calculateAvgRetentionMonths(): Promise<number> {
    try {
      const users = await User.find({ subscription_type: { $in: ['premium', 'enterprise'] } })
        .select('createdAt lastLogin');
      
      if (users.length === 0) return 12; // Default assumption
      
      const avgRetention = users.reduce((sum: number, user: any) => {
        const monthsActive = user.lastLogin 
          ? Math.max(1, Math.floor((user.lastLogin.getTime() - user.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)))
          : 1;
        return sum + monthsActive;
      }, 0) / users.length;
      
      return Math.max(1, avgRetention);
    } catch (error) {
      logger.error('Error calculating average retention months:', error);
      return 12;
    }
  }

  private static async getUserFeedbackMetrics(startDate: Date) {
    try {
      // This would integrate with actual user feedback system
      // For now, return mock data based on alert quality
      const avgDiscount = await Alert.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: null,
            avgDiscount: { $avg: '$discountPercentage' }
          }
        }
      ]);
      
      const discount = avgDiscount[0]?.avgDiscount || 0;
      // Simulate satisfaction based on discount quality
      const satisfaction = Math.min(5, Math.max(1, discount / 10));
      
      return {
        avgRating: Math.round(satisfaction * 10) / 10,
        totalFeedback: Math.floor(Math.random() * 100) + 50
      };
    } catch (error) {
      logger.error('Error getting user feedback metrics:', error);
      return { avgRating: 4.0, totalFeedback: 50 };
    }
  }

  private static async calculateRevenueGrowth(startDate: Date): Promise<number> {
    try {
      const currentRevenue = await this.calculatePremiumRevenue(startDate);
      const periodLength = Date.now() - startDate.getTime();
      const previousStart = new Date(startDate.getTime() - periodLength);
      const previousRevenue = await this.calculatePremiumRevenue(previousStart);
      
      return previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating revenue growth:', error);
      return 0;
    }
  }

  private static async getSavingsByRoute(startDate: Date) {
    try {
      return await Alert.aggregate([
        {
          $match: { detectedAt: { $gte: startDate } }
        },
        {
          $group: {
            _id: { origin: '$origin', destination: '$destination' },
            totalSavings: { 
              $sum: { 
                $multiply: ['$price', { $divide: ['$discountPercentage', 100] }] 
              } 
            },
            alertCount: { $sum: 1 }
          }
        },
        {
          $sort: { totalSavings: -1 }
        },
        {
          $project: {
            route: { $concat: ['$_id.origin', ' → ', '$_id.destination'] },
            totalSavings: { $round: ['$totalSavings', 2] },
            alertCount: 1,
            _id: 0
          }
        }
      ]);
    } catch (error) {
      logger.error('Error getting savings by route:', error);
      return [];
    }
  }

  private static async calculateConversionRate(startDate: Date): Promise<number> {
    try {
      const totalUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
      const premiumUsers = await User.countDocuments({ 
        createdAt: { $gte: startDate },
        subscription_type: { $in: ['premium', 'enterprise'] }
      });
      
      return totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;
    } catch (error) {
      logger.error('Error calculating conversion rate:', error);
      return 0;
    }
  }

  private static async getSubscriptionUpgrades(startDate: Date): Promise<number> {
    try {
      // This would track actual upgrade events
      // For now, estimate based on current premium users created in period
      return await User.countDocuments({ 
        createdAt: { $gte: startDate },
        subscription_type: { $in: ['premium', 'enterprise'] }
      });
    } catch (error) {
      logger.error('Error getting subscription upgrades:', error);
      return 0;
    }
  }

  private static async getPeakHourMetrics(startDate: Date) {
    try {
      const hourlyData = await ApiCall.aggregate([
        {
          $addFields: {
            coalesceDate: { $ifNull: ['$createdAt', '$timestamp'] }
          }
        },
        {
          $match: { coalesceDate: { $gte: startDate } }
        },
        {
          $group: {
            _id: { $hour: '$coalesceDate' },
            requests: { $sum: 1 }
          }
        },
        {
          $sort: { requests: -1 }
        },
        {
          $limit: 1
        }
      ]);
      
      return hourlyData[0] ? {
        hour: hourlyData[0]._id,
        requests: hourlyData[0].requests
      } : null;
    } catch (error) {
      logger.error('Error getting peak hour metrics:', error);
      return null;
    }
  }

  // Additional system metrics
  static async getResourceUsageMetrics() {
    const memoryUsage = process.memoryUsage();
    
    return {
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        platform: process.platform,
        version: process.version
      }
    };
  }

  static async getDatabaseMetrics() {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        dataSize: Math.round(stats.dataSize / 1024 / 1024), // MB
        storageSize: Math.round(stats.storageSize / 1024 / 1024), // MB
        indexes: stats.indexes,
        avgObjSize: Math.round(stats.avgObjSize),
        objects: stats.objects
      };
    } catch (error) {
      logger.error('Error getting database metrics:', error);
      return {
        collections: 0,
        dataSize: 0,
        storageSize: 0,
        indexes: 0,
        avgObjSize: 0,
        objects: 0
      };
    }
  }

  static async getSecurityMetrics(startDate: Date) {
    try {
      const [failedLogins, blockedIPs, suspiciousActivity] = await Promise.all([
        ApiCall.countDocuments({
          createdAt: { $gte: startDate },
          endpoint: '/login',
          status: { $gte: 400 }
        }),
        // This would integrate with actual IP blocking system
        Promise.resolve(0),
        ApiCall.countDocuments({
          createdAt: { $gte: startDate },
          status: 429 // Rate limited
        })
      ]);

      return {
        failedLogins,
        blockedIPs,
        suspiciousActivity,
        riskLevel: this.calculateSecurityRiskLevel(failedLogins, suspiciousActivity)
      };
    } catch (error) {
      logger.error('Error getting security metrics:', error);
      return {
        failedLogins: 0,
        blockedIPs: 0,
        suspiciousActivity: 0,
        riskLevel: 'low'
      };
    }
  }

  private static calculateSecurityRiskLevel(failedLogins: number, suspiciousActivity: number): string {
    const totalIncidents = failedLogins + suspiciousActivity;
    
    if (totalIncidents > 100) return 'high';
    if (totalIncidents > 50) return 'medium';
    return 'low';
  }

  static async getCostAnalysis(startDate: Date) {
    try {
      // This would integrate with actual cost tracking
      // For now, estimate based on API calls and infrastructure
      const apiCalls = await ApiCall.countDocuments({ createdAt: { $gte: startDate } });
      const estimatedCost = apiCalls * 0.001; // $0.001 per API call estimate
      
      return {
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        apiCalls,
        costPerCall: 0.001,
        breakdown: {
          api: estimatedCost * 0.6,
          infrastructure: estimatedCost * 0.3,
          storage: estimatedCost * 0.1
        }
      };
    } catch (error) {
      logger.error('Error getting cost analysis:', error);
      return {
        estimatedCost: 0,
        apiCalls: 0,
        costPerCall: 0,
        breakdown: { api: 0, infrastructure: 0, storage: 0 }
      };
    }
  }

  static async calculateROI(startDate: Date) {
    try {
      const [revenue, costs, savings] = await Promise.all([
        this.calculatePremiumRevenue(startDate),
        this.getCostAnalysis(startDate),
        this.calculateTotalSavings(startDate)
      ]);

      const totalCosts = typeof costs === 'object' ? costs.estimatedCost : costs;
      const profit = revenue - totalCosts;
      const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;

      return {
        revenue: Math.round(revenue * 100) / 100,
        costs: Math.round(totalCosts * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        userSavings: Math.round(savings * 100) / 100,
        valueGenerated: Math.round((savings + profit) * 100) / 100
      };
    } catch (error) {
      logger.error('Error calculating ROI:', error);
      return {
        revenue: 0,
        costs: 0,
        profit: 0,
        roi: 0,
        userSavings: 0,
        valueGenerated: 0
      };
    }
  }
}
// Export statement removed - using export class declaration above
