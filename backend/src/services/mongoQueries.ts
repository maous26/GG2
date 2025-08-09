import User, { IUser } from '../models/User';
import Route, { IRoute } from '../models/Route';
import Alert, { IAlert } from '../models/Alert';
import ApiCall from '../models/ApiCall';
import AIUsage from '../models/AIUsage';
import { Types } from 'mongoose';

export class MongoQueries {
  
  // User queries
  static async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }
  
  static async getUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  }
  
  static async updateUserSubscription(userId: string, type: 'free' | 'premium') {
    const expiresAt = type === 'premium' 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : null;
      
    return User.findByIdAndUpdate(
      userId,
      { 
        subscriptionType: type,
        subscriptionExpiresAt: expiresAt
      },
      { new: true }
    );
  }
  
  // Route queries
  static async getActiveRoutesByTier(tier: number): Promise<IRoute[]> {
    return Route.find({ tier, isActive: true });
  }
  
  static async updateRoutePerformance(routeId: string, performance: any) {
    return Route.findByIdAndUpdate(
      routeId,
      { 
        $set: { performance },
        lastScan: new Date()
      },
      { new: true }
    );
  }
  
  static async getRouteStats() {
    return Route.aggregate([
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
  static async saveAlert(alertData: any): Promise<IAlert> {
    const alert = new Alert({
      ...alertData,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    });
    return alert.save();
  }
  
  static async getUserAlerts(userId: string, limit: number = 20) {
    return Alert.find({ 'sentTo.user': userId })
      .populate('route', 'origin destination')
      .sort({ detectedAt: -1 })
      .limit(limit);
  }
  
  static async markAlertOpened(alertId: string, userId: string) {
    return Alert.updateOne(
      { 
        _id: alertId,
        'sentTo.user': userId
      },
      {
        $set: { 'sentTo.$.openedAt': new Date() }
      }
    );
  }
  
  static async markAlertClicked(alertId: string, userId: string) {
    return Alert.updateOne(
      { 
        _id: alertId,
        'sentTo.user': userId
      },
      {
        $set: { 'sentTo.$.clickedAt': new Date() }
      }
    );
  }
  
  static async getAlertsSentToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const count = await Alert.countDocuments({
      'sentTo.user': userId,
      'sentTo.sentAt': { $gte: today }
    });
    
    return count;
  }
  
  // Stats queries
  static async getUserStats(userId: string) {
    const pipeline = [
      {
        $match: { 'sentTo.user': new Types.ObjectId(userId) }
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
    
    const results = await Alert.aggregate(pipeline);
    return results[0] || { totalAlerts: 0, totalSavings: 0, avgDiscount: 0, maxDiscount: 0 };
  }
  
  static async getTopDestinations(userId: string, limit: number = 10) {
    return Alert.aggregate([
      {
        $match: { 'sentTo.user': new Types.ObjectId(userId) }
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
  static async logApiCall(data: any) {
    const apiCall = new ApiCall(data);
    return apiCall.save();
  }
  
  static async getApiUsageStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyStats = await ApiCall.aggregate([
      {
        $match: {
          apiName: 'flightapi',
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
    
    const monthlyCount = await ApiCall.countDocuments({
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
  static async logAIUsage(data: any) {
    const usage = new AIUsage(data);
    return usage.save();
  }
  
  static async getAIBudgetStatus() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const usage = await AIUsage.aggregate([
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
    
    const result: Record<string, { cost: number; calls: number }> = {
      gemini: { cost: 0, calls: 0 },
      gpt: { cost: 0, calls: 0 }
    };
    
    usage.forEach((item: any) => {
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
    const [
      totalUsers,
      premiumUsers,
      activeRoutes,
      totalAlerts,
      todayAlerts
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ subscriptionType: 'premium' }),
      Route.countDocuments({ isActive: true }),
      Alert.countDocuments(),
      Alert.countDocuments({
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
