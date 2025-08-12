// ===== Strategic Route Initialization Service =====
// Implements the strategic study recommendations for CDG/ORY hub strategy

import StrategicRoute, { IStrategicRoute } from '../models/StrategicRoute';
import PricePrediction, { IPricePrediction } from '../models/PricePrediction';
import { IntelligentPricingService } from './intelligentPricingService';
import { logger } from '../config/logger';

export class StrategicRouteInitializer {
  
  /**
   * Initialize strategic routes based on CDG/ORY hub strategy
   * CDG: 60% budget allocation (Premium International + Long-haul)
   * ORY: 25% budget allocation (Regional Business + DOM-TOM)
   * Other: 15% budget allocation (Emerging + AI Tests)
   */
  public static async initializeStrategicRoutes(): Promise<void> {
    try {
      logger.info('🚀 Initializing strategic routes with CDG/ORY hub strategy...');
      
      // Clear existing strategic routes
      await StrategicRoute.deleteMany({});
      
      // Initialize CDG Hub Routes (60% budget - Premium International)
      const cdgRoutes = await this.initializeCDGHubRoutes();
      
      // Initialize ORY Hub Routes (25% budget - Regional + DOM-TOM)
      const oryRoutes = await this.initializeORYHubRoutes();
      
      // Initialize Other Hub Routes (15% budget - Emerging + AI Tests)
      const otherRoutes = await this.initializeOtherHubRoutes();
      
      const totalRoutes = cdgRoutes.length + oryRoutes.length + otherRoutes.length;
      
      logger.info('✅ Strategic routes initialized successfully', {
        cdgRoutes: cdgRoutes.length,
        oryRoutes: oryRoutes.length,
        otherRoutes: otherRoutes.length,
        totalRoutes
      });
      
      // Initialize price predictions for key routes
      await this.initializePricePredictions(cdgRoutes.concat(oryRoutes));
      
    } catch (error) {
      logger.error('❌ Error initializing strategic routes:', error);
      throw error;
    }
  }
  
  /**
   * CDG Hub - Premium International Routes (60% budget allocation)
   * Focus: Long-haul international, premium segments
   * Adaptive thresholds: 15-50% based on route volatility
   */
  private static async initializeCDGHubRoutes(): Promise<IStrategicRoute[]> {
    const cdgRoutes = [
      // Tier 1 Premium Long-Haul (Americas)
      {
        origin: 'CDG', destination: 'JFK', hub: 'CDG', tier: 1,
        category: 'PREMIUM_INTERNATIONAL',
        scanFrequencyHours: 2, dailyApiCalls: 48, monthlyApiBudget: 1440,
        adaptiveThresholds: {
          normal: { min: 20, max: 50 },
          highSeason: { min: 15, max: 45 },
          lowSeason: { min: 25, max: 50 },
          current: 30
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 70, priceVariance: 25, threshold: 28 },
          summer: { demand: 90, priceVariance: 35, threshold: 25 },
          fall: { demand: 65, priceVariance: 20, threshold: 32 },
          winter: { demand: 50, priceVariance: 30, threshold: 35 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: true,
          validationBudget: 20,
          minConfidenceScore: 85
        },
        metadata: {
          priority: 'HIGH',
          userSegments: ['premium', 'enterprise'],
          expectedDiscountRange: '30-70%',
          competitionLevel: 'HIGH',
          volatility: 'HIGH',
          description: 'Premium route with high volatility and strong demand'
        }
      },
      {
        origin: 'CDG', destination: 'LAX', hub: 'CDG', tier: 1,
        category: 'PREMIUM_INTERNATIONAL',
        scanFrequencyHours: 3, dailyApiCalls: 24, monthlyApiBudget: 720,
        adaptiveThresholds: {
          normal: { min: 18, max: 45 },
          highSeason: { min: 15, max: 40 },
          lowSeason: { min: 22, max: 50 },
          current: 25
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 75, priceVariance: 20, threshold: 25 },
          summer: { demand: 85, priceVariance: 30, threshold: 22 },
          fall: { demand: 60, priceVariance: 18, threshold: 28 },
          winter: { demand: 45, priceVariance: 25, threshold: 32 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: true,
          validationBudget: 15,
          minConfidenceScore: 85
        },
        metadata: {
          priority: 'HIGH',
          userSegments: ['premium', 'enterprise'],
          expectedDiscountRange: '20-35%',
          competitionLevel: 'HIGH',
          volatility: 'MEDIUM',
          description: 'Premium west coast route with moderate volatility'
        }
      },
      // Tier 1 Premium Long-Haul (Asia)
      {
        origin: 'CDG', destination: 'BKK', hub: 'CDG', tier: 1,
        category: 'PREMIUM_INTERNATIONAL',
        scanFrequencyHours: 3, dailyApiCalls: 32, monthlyApiBudget: 960,
        adaptiveThresholds: {
          normal: { min: 22, max: 50 },
          highSeason: { min: 18, max: 45 },
          lowSeason: { min: 25, max: 50 },
          current: 30
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 80, priceVariance: 30, threshold: 25 },
          summer: { demand: 95, priceVariance: 40, threshold: 20 },
          fall: { demand: 70, priceVariance: 25, threshold: 30 },
          winter: { demand: 85, priceVariance: 35, threshold: 22 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: true,
          validationBudget: 18,
          minConfidenceScore: 85
        },
        metadata: {
          priority: 'HIGH',
          userSegments: ['premium', 'enterprise'],
          expectedDiscountRange: '25-45%',
          competitionLevel: 'HIGH',
          volatility: 'HIGH',
          description: 'High-demand Asian destination with seasonal patterns'
        }
      },
      {
        origin: 'CDG', destination: 'DXB', hub: 'CDG', tier: 1,
        category: 'PREMIUM_INTERNATIONAL',
        scanFrequencyHours: 3, dailyApiCalls: 24, monthlyApiBudget: 720,
        adaptiveThresholds: {
          normal: { min: 20, max: 45 },
          highSeason: { min: 15, max: 40 },
          lowSeason: { min: 25, max: 50 },
          current: 28
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 75, priceVariance: 25, threshold: 27 },
          summer: { demand: 60, priceVariance: 20, threshold: 32 },
          fall: { demand: 80, priceVariance: 30, threshold: 25 },
          winter: { demand: 90, priceVariance: 35, threshold: 20 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: true,
          validationBudget: 15,
          minConfidenceScore: 85
        },
        metadata: {
          priority: 'HIGH',
          userSegments: ['premium', 'enterprise'],
          expectedDiscountRange: '25-40%',
          competitionLevel: 'MEDIUM',
          volatility: 'MEDIUM',
          description: 'Strategic Middle East hub with business focus'
        }
      }
    ];
    
    const createdRoutes: IStrategicRoute[] = [];
    for (const routeData of cdgRoutes) {
      const route = await StrategicRoute.create(routeData);
      createdRoutes.push(route);
    }
    
    logger.info('✅ CDG hub routes initialized', { count: createdRoutes.length });
    return createdRoutes;
  }
  
  /**
   * ORY Hub - Regional Business & DOM-TOM Routes (25% budget allocation)
   * Focus: Regional European, DOM-TOM territories
   * Adaptive thresholds: 20-55% for domestic/regional routes
   */
  private static async initializeORYHubRoutes(): Promise<IStrategicRoute[]> {
    const oryRoutes = [
      // Tier 2 Regional Business
      {
        origin: 'ORY', destination: 'YUL', hub: 'ORY', tier: 2,
        category: 'REGIONAL_BUSINESS',
        scanFrequencyHours: 6, dailyApiCalls: 12, monthlyApiBudget: 360,
        adaptiveThresholds: {
          normal: { min: 25, max: 50 },
          highSeason: { min: 20, max: 50 },
          lowSeason: { min: 30, max: 60 },
          current: 35
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 60, priceVariance: 20, threshold: 35 },
          summer: { demand: 80, priceVariance: 30, threshold: 28 },
          fall: { demand: 55, priceVariance: 18, threshold: 38 },
          winter: { demand: 40, priceVariance: 25, threshold: 42 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: false,
          validationBudget: 8,
          minConfidenceScore: 80
        },
        metadata: {
          priority: 'MEDIUM',
          userSegments: ['free', 'premium', 'enterprise'],
          expectedDiscountRange: '30-50%',
          competitionLevel: 'MEDIUM',
          volatility: 'MEDIUM',
          description: 'Regional route with good discount potential'
        }
      },
      // DOM-TOM Routes
      {
        origin: 'ORY', destination: 'FDF', hub: 'ORY', tier: 2,
        category: 'DOM_TOM',
        scanFrequencyHours: 6, dailyApiCalls: 12, monthlyApiBudget: 360,
        adaptiveThresholds: {
          normal: { min: 30, max: 60 },
          highSeason: { min: 25, max: 50 },
          lowSeason: { min: 35, max: 65 },
          current: 40
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 70, priceVariance: 25, threshold: 35 },
          summer: { demand: 90, priceVariance: 35, threshold: 28 },
          fall: { demand: 65, priceVariance: 20, threshold: 38 },
          winter: { demand: 85, priceVariance: 30, threshold: 30 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: false,
          validationBudget: 10,
          minConfidenceScore: 80
        },
        metadata: {
          priority: 'MEDIUM',
          userSegments: ['free', 'premium', 'enterprise'],
          expectedDiscountRange: '35-55%',
          competitionLevel: 'LOW',
          volatility: 'HIGH',
          description: 'DOM-TOM route with high seasonal demand'
        }
      },
      {
        origin: 'ORY', destination: 'PTP', hub: 'ORY', tier: 2,
        category: 'DOM_TOM',
        scanFrequencyHours: 6, dailyApiCalls: 12, monthlyApiBudget: 360,
        adaptiveThresholds: {
          normal: { min: 30, max: 60 },
          highSeason: { min: 25, max: 50 },
          lowSeason: { min: 35, max: 65 },
          current: 40
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 65, priceVariance: 22, threshold: 38 },
          summer: { demand: 85, priceVariance: 32, threshold: 30 },
          fall: { demand: 60, priceVariance: 18, threshold: 40 },
          winter: { demand: 80, priceVariance: 28, threshold: 32 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: false,
          validationBudget: 10,
          minConfidenceScore: 80
        },
        metadata: {
          priority: 'MEDIUM',
          userSegments: ['free', 'premium', 'enterprise'],
          expectedDiscountRange: '30-50%',
          competitionLevel: 'LOW',
          volatility: 'HIGH',
          description: 'DOM-TOM route with consistent demand'
        }
      }
    ];
    
    const createdRoutes: IStrategicRoute[] = [];
    for (const routeData of oryRoutes) {
      const route = await StrategicRoute.create(routeData);
      createdRoutes.push(route);
    }
    
    logger.info('✅ ORY hub routes initialized', { count: createdRoutes.length });
    return createdRoutes;
  }
  
  /**
   * Other Hubs - Emerging & AI Test Routes (15% budget allocation)
   * Focus: Emerging markets, AI-driven discovery
   * Adaptive thresholds: 15-60% for experimental routes
   */
  private static async initializeOtherHubRoutes(): Promise<IStrategicRoute[]> {
    const otherRoutes = [
      // Tier 3 Emerging Markets
      {
        origin: 'CDG', destination: 'IST', hub: 'CDG', tier: 3,
        category: 'EMERGING',
        scanFrequencyHours: 12, dailyApiCalls: 4, monthlyApiBudget: 120,
        adaptiveThresholds: {
          normal: { min: 15, max: 60 },
          highSeason: { min: 12, max: 50 },
          lowSeason: { min: 20, max: 65 },
          current: 25
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 50, priceVariance: 30, threshold: 30 },
          summer: { demand: 70, priceVariance: 40, threshold: 25 },
          fall: { demand: 45, priceVariance: 25, threshold: 35 },
          winter: { demand: 35, priceVariance: 20, threshold: 40 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: true,
          validationBudget: 5,
          minConfidenceScore: 75
        },
        metadata: {
          priority: 'LOW',
          userSegments: ['premium', 'enterprise'],
          expectedDiscountRange: '20-35%',
          competitionLevel: 'MEDIUM',
          volatility: 'HIGH',
          description: 'Emerging market with AI-driven analysis'
        }
      },
      // AI Test Routes
      {
        origin: 'CDG', destination: 'HAN', hub: 'CDG', tier: 3,
        category: 'EMERGING',
        scanFrequencyHours: 12, dailyApiCalls: 4, monthlyApiBudget: 120,
        adaptiveThresholds: {
          normal: { min: 15, max: 60 },
          highSeason: { min: 10, max: 50 },
          lowSeason: { min: 20, max: 65 },
          current: 30
        },
        performance: { roi: 0, totalAlerts: 0, clickRate: 0, conversionRate: 0, avgDiscount: 0, lastWeekPerformance: 0 },
        seasonalPatterns: {
          spring: { demand: 45, priceVariance: 25, threshold: 32 },
          summer: { demand: 65, priceVariance: 35, threshold: 28 },
          fall: { demand: 40, priceVariance: 20, threshold: 35 },
          winter: { demand: 30, priceVariance: 15, threshold: 40 }
        },
        aiConfig: {
          enablePrediction: true,
          enableContextualValidation: true,
          validationBudget: 8,
          minConfidenceScore: 70
        },
        metadata: {
          priority: 'LOW',
          userSegments: ['premium', 'enterprise'],
          expectedDiscountRange: '20-35%',
          competitionLevel: 'LOW',
          volatility: 'HIGH',
          description: 'AI test route for Vietnam market discovery'
        }
      }
    ];
    
    const createdRoutes: IStrategicRoute[] = [];
    for (const routeData of otherRoutes) {
      const route = await StrategicRoute.create(routeData);
      createdRoutes.push(route);
    }
    
    logger.info('✅ Other hub routes initialized', { count: createdRoutes.length });
    return createdRoutes;
  }
  
  /**
   * Initialize price predictions for strategic routes
   */
  private static async initializePricePredictions(routes: IStrategicRoute[]): Promise<void> {
    logger.info('🔮 Initializing price predictions for strategic routes...');
    
    for (const route of routes) {
      const currentPrice = this.generateMockPrice(route);
      
      // Create initial price prediction with correct schema
      await PricePrediction.create({
        origin: route.origin,
        destination: route.destination,
        predictionDate: new Date(),
        currentPrice: currentPrice,
        predictedPrice: {
          '1day': this.generateMockPrice(route),
          '7days': this.generateMockPrice(route, 0.95),
          '30days': this.generateMockPrice(route, 0.90)
        },
        confidence: {
          '1day': 85,
          '7days': 75,
          '30days': 65
        },
        recommendation: 'MONITOR',
        features: {
          seasonality: route.seasonalPatterns.spring.demand,
          demand: route.seasonalPatterns.spring.demand,
          competition: route.metadata.competitionLevel === 'HIGH' ? 80 : 60,
          fuelPrice: 75, // Mock fuel price index
          events: ['normal'], // No special events
          daysToDeparture: 30, // Default 30 days
          historicalVariance: 15 // 15% variance
        },
        modelVersion: '1.0.0'
      });
    }
    
    logger.info('✅ Price predictions initialized', { count: routes.length });
  }
  
  /**
   * Generate mock price for initial predictions
   */
  private static generateMockPrice(route: IStrategicRoute, multiplier: number = 1): number {
    const basePrices: Record<string, number> = {
      'JFK': 800, 'LAX': 750, 'BKK': 650, 'DXB': 550,
      'YUL': 400, 'FDF': 450, 'PTP': 450, 'IST': 300, 'HAN': 550
    };
    
    const basePrice = basePrices[route.destination] || 500;
    const variance = Math.random() * 0.2 - 0.1; // ±10% variance
    
    return Math.round(basePrice * multiplier * (1 + variance));
  }
  
  /**
   * Update existing strategic routes with new intelligence
   */
  public static async updateStrategicIntelligence(): Promise<void> {
    try {
      logger.info('🧠 Updating strategic intelligence for existing routes...');
      
      const routes = await StrategicRoute.find({ isActive: true });
      
      for (const route of routes) {
        // Update adaptive thresholds based on performance
        const newThreshold = await IntelligentPricingService.calculateAdaptiveThreshold(
          route.origin,
          route.destination,
          this.generateMockPrice(route),
          this.generateMockPrice(route, 1.1)
        );
        
        // Update current threshold
        route.adaptiveThresholds.current = newThreshold;
        
        // Update performance metrics (mock data for now)
        route.performance.roi = Math.random() * 10;
        route.performance.clickRate = Math.random() * 20;
        route.performance.conversionRate = Math.random() * 5;
        
        await route.save();
      }
      
      logger.info('✅ Strategic intelligence updated', { routes: routes.length });
      
    } catch (error) {
      logger.error('❌ Error updating strategic intelligence:', error);
      throw error;
    }
  }
  
  /**
   * Get strategic route statistics
   */
  public static async getStrategicRouteStats(): Promise<any> {
    const stats = await StrategicRoute.aggregate([
      {
        $group: {
          _id: '$hub',
          totalRoutes: { $sum: 1 },
          totalBudget: { $sum: '$monthlyApiBudget' },
          avgROI: { $avg: '$performance.roi' },
          categories: { $push: '$category' }
        }
      }
    ]);
    
    const totalBudget = await StrategicRoute.aggregate([
      { $group: { _id: null, total: { $sum: '$monthlyApiBudget' } } }
    ]);
    
    return {
      byHub: stats,
      totalMonthlyBudget: totalBudget[0]?.total || 0,
      budgetAllocation: {
        cdg: Math.round((stats.find((s: any) => s._id === 'CDG')?.totalBudget || 0) / (totalBudget[0]?.total || 1) * 100),
        ory: Math.round((stats.find((s: any) => s._id === 'ORY')?.totalBudget || 0) / (totalBudget[0]?.total || 1) * 100)
      }
    };
  }
}
