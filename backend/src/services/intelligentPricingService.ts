// ===== backend/src/services/intelligentPricingService.ts =====
import PricePrediction, { IPricePrediction } from '../models/PricePrediction';
import StrategicRoute, { IStrategicRoute } from '../models/StrategicRoute';
import { Alert } from '../models/Alert';
import { logger } from '../config/logger';

export interface PriceValidationResult {
  isValid: boolean;
  confidence: number;
  recommendation: 'BUY_NOW' | 'WAIT' | 'MONITOR';
  reasoning: string;
  threshold: number;
  adaptiveFactors: {
    seasonality: number;
    competition: number;
    volatility: number;
    userSegment: string;
  };
}

export interface RoutePerformanceScore {
  score: number;
  roi: number;
  newApiAllocation: number;
  newScanFrequency: number;
}

export class IntelligentPricingService {
  // Limits now provided by ApiBudgetService; constants removed
  
  /**
   * Core Strategic Function: Replace Fixed 30% with Adaptive Thresholds
   */
  public static async calculateAdaptiveThreshold(
    origin: string,
    destination: string,
    currentPrice: number,
    historicalAverage: number,
    userSegment: 'free' | 'premium' | 'enterprise' = 'premium'
  ): Promise<number> {
    try {
      const route = await StrategicRoute.findOne({ origin, destination });
      if (!route) {
        return this.getDefaultThresholdBySegment(userSegment);
      }

      const season = this.getCurrentSeason();
      const seasonalPattern = route.seasonalPatterns[season];
      
      // Base threshold from strategic configuration
      let adaptiveThreshold = seasonalPattern.threshold;
      
      // Adjust for volatility
      if (route.metadata.volatility === 'HIGH') {
        adaptiveThreshold += 5; // Higher threshold for volatile routes
      } else if (route.metadata.volatility === 'LOW') {
        adaptiveThreshold -= 5; // Lower threshold for stable routes
      }
      
      // Adjust for competition
      if (route.metadata.competitionLevel === 'HIGH') {
        adaptiveThreshold -= 5; // Lower threshold in competitive markets
      }
      
      // Adjust for user segment
      if (userSegment === 'enterprise') {
        adaptiveThreshold -= 10; // More sensitive for premium users
      } else if (userSegment === 'free') {
        adaptiveThreshold += 10; // Less sensitive for free users
      }
      
      // Ensure threshold stays within strategic bounds
      const bounds = route.adaptiveThresholds[this.getSeasonKey(season)];
      adaptiveThreshold = Math.max(bounds.min, Math.min(bounds.max, adaptiveThreshold));
      
      logger.info('Adaptive threshold calculated', {
        route: `${origin}-${destination}`,
        season,
        userSegment,
        threshold: adaptiveThreshold,
        factors: {
          volatility: route.metadata.volatility,
          competition: route.metadata.competitionLevel,
          seasonal: seasonalPattern.threshold
        }
      });
      
      return adaptiveThreshold;
      
    } catch (error) {
      logger.error('Error calculating adaptive threshold:', error);
      return this.getDefaultThresholdBySegment(userSegment);
    }
  }
  
  /**
   * Multi-Level Price Validation (Statistical + Predictive + Contextual)
   */
  public static async validatePriceIntelligently(
    origin: string,
    destination: string,
    currentPrice: number,
    historicalData: number[],
    userSegment: 'free' | 'premium' | 'enterprise' = 'premium'
  ): Promise<PriceValidationResult> {
    try {
      // Level 1: Statistical Validation (Free)
      const statisticalScore = this.calculateStatisticalValidation(currentPrice, historicalData);
      
      // Level 2: Predictive Validation (with cache)
      const predictiveScore = await this.cachedPredictiveValidation(origin, destination, currentPrice);
      
      // Level 3: Contextual AI Validation (Paid - strategic budget)
      const contextualScore = await this.cachedContextualValidation(
        origin, 
        destination, 
        currentPrice, 
        historicalData
      );
      
      // Calculate adaptive threshold
      const adaptiveThreshold = await this.calculateAdaptiveThreshold(
        origin, 
        destination, 
        currentPrice, 
        this.calculateAverage(historicalData),
        userSegment
      );
      
      // Fusion of all validation methods
      const finalConfidence = this.fuseValidationScores(
        statisticalScore,
        predictiveScore,
        contextualScore
      );
      
      const discountPercentage = this.calculateDiscountPercentage(
        currentPrice, 
        this.calculateAverage(historicalData)
      );
      
      const isValid = discountPercentage >= adaptiveThreshold && finalConfidence >= 70;
      
      return {
        isValid,
        confidence: finalConfidence,
        recommendation: this.getRecommendation(finalConfidence, discountPercentage, adaptiveThreshold),
        reasoning: this.generateReasoning(discountPercentage, adaptiveThreshold, finalConfidence),
        threshold: adaptiveThreshold,
        adaptiveFactors: await this.getAdaptiveFactors(origin, destination)
      };
      
    } catch (error) {
      logger.error('Error in intelligent price validation:', error);
      
      // Fallback to basic validation
      const basicThreshold = this.getDefaultThresholdBySegment(userSegment);
      const discount = this.calculateDiscountPercentage(currentPrice, this.calculateAverage(historicalData));
      
      return {
        isValid: discount >= basicThreshold,
        confidence: 50,
        recommendation: 'MONITOR',
        reasoning: 'Fallback validation due to system error',
        threshold: basicThreshold,
        adaptiveFactors: {
          seasonality: 50,
          competition: 50,
          volatility: 50,
          userSegment
        }
      };
    }
  }
  
  /**
   * Strategic Route Performance Auto-Optimization
   */
  public static async optimizeRoutePerformance(): Promise<void> {
    try {
      const routes = await StrategicRoute.find({ isActive: true });
      // Use ApiBudgetService daily cap
      const { ApiBudgetService } = await import('./apiBudget.service');
      const cfg = await ApiBudgetService.getConfig();
      const totalBudget = Math.floor(cfg.monthlyCalls / 30);
      let allocatedCalls = 0;
      
      // Calculate performance scores for all routes
      const routeScores: { route: IStrategicRoute; score: RoutePerformanceScore }[] = [];
      
      for (const route of routes) {
        const score = await this.calculateRoutePerformanceScore(route);
        routeScores.push({ route, score });
      }
      
      // Sort by performance (ROI)
      routeScores.sort((a, b) => b.score.roi - a.score.roi);
      
      // Reallocate budget based on performance
      for (const { route, score } of routeScores) {
        if (allocatedCalls >= totalBudget) break;
        
        let newAllocation = score.newApiAllocation;
        
        // Ensure we don't exceed budget
        if (allocatedCalls + newAllocation > totalBudget) {
          newAllocation = totalBudget - allocatedCalls;
        }
        
        allocatedCalls += newAllocation;
        
        // Update route configuration
        await StrategicRoute.findByIdAndUpdate(route._id, {
          dailyApiCalls: newAllocation,
          scanFrequencyHours: score.newScanFrequency,
          'performance.lastWeekPerformance': score.score
        });
        
        logger.info('Route performance optimized', {
          route: `${route.origin}-${route.destination}`,
          oldCalls: route.dailyApiCalls,
          newCalls: newAllocation,
          roi: score.roi,
          performanceScore: score.score
        });
      }
      
      logger.info('Route optimization completed', {
        totalRoutes: routes.length,
        totalAllocatedCalls: allocatedCalls,
        budgetUtilization: (allocatedCalls / totalBudget) * 100
      });
      
    } catch (error) {
      logger.error('Error optimizing route performance:', error);
    }
  }
  
  /**
   * Seasonal Threshold Adjustment (Strategic Intelligence)
   */
  public static async adjustSeasonalThresholds(): Promise<void> {
    try {
      const currentSeason = this.getCurrentSeason();
      const routes = await StrategicRoute.find({ isActive: true });
      
      for (const route of routes) {
        const seasonalPattern = route.seasonalPatterns[currentSeason];
        const seasonKey = this.getSeasonKey(currentSeason);
        const seasonalThresholds = route.adaptiveThresholds[seasonKey];
        
        // Update current threshold based on seasonal intelligence
        let newThreshold = seasonalPattern.threshold;
        
        // Adjust for seasonal demand
        if (seasonalPattern.demand > 70) {
          newThreshold -= 5; // Lower threshold during high demand
        } else if (seasonalPattern.demand < 30) {
          newThreshold += 5; // Higher threshold during low demand
        }
        
        // Ensure within bounds
        newThreshold = Math.max(
          seasonalThresholds.min,
          Math.min(seasonalThresholds.max, newThreshold)
        );
        
        await StrategicRoute.findByIdAndUpdate(route._id, {
          'adaptiveThresholds.current': newThreshold
        });
        
        logger.info('Seasonal threshold adjusted', {
          route: `${route.origin}-${route.destination}`,
          season: currentSeason,
          newThreshold,
          demand: seasonalPattern.demand
        });
      }
      
    } catch (error) {
      logger.error('Error adjusting seasonal thresholds:', error);
    }
  }
  
  // ===== PRIVATE HELPER METHODS =====
  
  private static calculateStatisticalValidation(currentPrice: number, historicalData: number[]): number {
    if (historicalData.length < 3) return 50;
    
    const mean = this.calculateAverage(historicalData);
    const stdDev = this.calculateStandardDeviation(historicalData);
    const zScore = Math.abs((currentPrice - mean) / stdDev);
    
    // Convert Z-score to confidence (0-100)
    return Math.min(100, zScore * 25);
  }
  
  private static async calculatePredictiveValidation(
    origin: string,
    destination: string,
    currentPrice: number
  ): Promise<number> {
    try {
      const prediction = await PricePrediction.findOne({
        origin,
        destination,
        predictionDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ predictionDate: -1 });
      
      if (!prediction) return 50;
      
      const predictedPrice = prediction.predictedPrice['1day'];
      const priceDeviation = Math.abs(currentPrice - predictedPrice) / predictedPrice;
      
      // Lower deviation = higher confidence
      return Math.max(0, 100 - (priceDeviation * 100));
      
    } catch (error) {
      logger.error('Error in predictive validation:', error);
      return 50;
    }
  }

  // Cached wrappers (1h TTL)
  private static async cachedPredictiveValidation(origin: string, destination: string, currentPrice: number): Promise<number> {
    try {
      const { getRedis } = await import('../config/redis');
      const redis = getRedis();
      const key = `cache:predictive:${origin}:${destination}`;
      const hit = await redis.get(key);
      if (hit) return Number(hit);
      const score = await this.calculatePredictiveValidation(origin, destination, currentPrice);
      await redis.setex(key, 3600, String(score));
      return score;
    } catch {
      return this.calculatePredictiveValidation(origin, destination, currentPrice);
    }
  }

  private static async cachedContextualValidation(origin: string, destination: string, currentPrice: number, historicalData: number[]): Promise<number> {
    try {
      const { getRedis } = await import('../config/redis');
      const redis = getRedis();
      const key = `cache:contextual:${origin}:${destination}`;
      const hit = await redis.get(key);
      if (hit) return Number(hit);
      const score = await this.calculateContextualValidation(origin, destination, currentPrice, historicalData);
      await redis.setex(key, 3600, String(score));
      return score;
    } catch {
      return this.calculateContextualValidation(origin, destination, currentPrice, historicalData);
    }
  }
  
  private static async calculateContextualValidation(
    origin: string,
    destination: string,
    currentPrice: number,
    historicalData: number[]
  ): Promise<number> {
    try {
      // Simulated AI contextual validation
      // In production, this would call OpenAI GPT-4 for market context analysis
      // Budget: $0.05 per validation, monthly limit based on route configuration
      
      const route = await StrategicRoute.findOne({ origin, destination });
      if (!route?.aiConfig.enableContextualValidation) return 70;
      
      // Simulate AI analysis considering:
      // - Market conditions
      // - Seasonal events
      // - Competition
      // - Historical patterns
      
      const marketConditionScore = this.analyzeMarketConditions(origin, destination);
      const seasonalEventScore = this.analyzeSeasonalEvents();
      const competitionScore = route.metadata.competitionLevel === 'HIGH' ? 80 : 60;
      
      return Math.round((marketConditionScore + seasonalEventScore + competitionScore) / 3);
      
    } catch (error) {
      logger.error('Error in contextual validation:', error);
      return 70;
    }
  }
  
  private static fuseValidationScores(
    statistical: number,
    predictive: number,
    contextual: number
  ): number {
    // Weighted fusion: Statistical 30%, Predictive 40%, Contextual 30%
    return Math.round(
      (statistical * 0.3) + (predictive * 0.4) + (contextual * 0.3)
    );
  }
  
  private static async calculateRoutePerformanceScore(route: IStrategicRoute): Promise<RoutePerformanceScore> {
    // Calculate ROI: (Alerts × Click Rate × Conversions) / API Calls
    const { totalAlerts, clickRate, conversionRate } = route.performance;
    const monthlyApiCalls = route.dailyApiCalls * 30;
    
    const roi = monthlyApiCalls > 0 
      ? (totalAlerts * (clickRate / 100) * (conversionRate / 100)) / monthlyApiCalls
      : 0;
    
    // Performance score considers ROI, tier, and strategic importance
    let score = roi * 100;
    
    // Boost for Tier 1 routes (strategic importance)
    if (route.tier === 1) score *= 1.2;
    
    // Boost for high-priority routes
    if (route.metadata.priority === 'HIGH') score *= 1.1;
    
    // Calculate new API allocation based on performance
    let newApiAllocation = route.dailyApiCalls;
    
    if (roi > 4.0) {
      newApiAllocation = Math.min(route.dailyApiCalls * 1.5, 150); // Boost high performers
    } else if (roi < 1.5) {
      newApiAllocation = Math.max(route.dailyApiCalls * 0.75, 10); // Reduce poor performers
    }
    
    // Calculate new scan frequency
    let newScanFrequency = route.scanFrequencyHours;
    if (roi > 3.0) {
      newScanFrequency = Math.max(2, newScanFrequency - 1); // Scan more frequently
    } else if (roi < 2.0) {
      newScanFrequency = Math.min(12, newScanFrequency + 2); // Scan less frequently
    }
    
    return {
      score,
      roi,
      newApiAllocation: Math.round(newApiAllocation),
      newScanFrequency
    };
  }
  
  private static getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }
  
  private static getSeasonKey(season: string): 'normal' | 'highSeason' | 'lowSeason' {
    const currentMonth = new Date().getMonth() + 1;
    
    // High season: June-August (summer) and December-February (winter holidays)
    if ((currentMonth >= 6 && currentMonth <= 8) || 
        (currentMonth >= 12 || currentMonth <= 2)) {
      return 'highSeason';
    }
    
    // Low season: March-May and September-November
    if ((currentMonth >= 3 && currentMonth <= 5) || 
        (currentMonth >= 9 && currentMonth <= 11)) {
      return 'lowSeason';
    }
    
    return 'normal';
  }
  
  private static getDefaultThresholdBySegment(userSegment: string): number {
    switch (userSegment) {
      case 'enterprise': return 20;
      case 'premium': return 25;
      case 'free': return 35;
      default: return 30;
    }
  }
  
  private static calculateDiscountPercentage(currentPrice: number, historicalAverage: number): number {
    if (historicalAverage <= 0) return 0;
    return ((historicalAverage - currentPrice) / historicalAverage) * 100;
  }
  
  private static calculateAverage(numbers: number[]): number {
    return numbers.length > 0 ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0;
  }
  
  private static calculateStandardDeviation(numbers: number[]): number {
    const avg = this.calculateAverage(numbers);
    const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
    const avgSquaredDiff = this.calculateAverage(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }
  
  private static getRecommendation(
    confidence: number, 
    discountPercentage: number, 
    threshold: number
  ): 'BUY_NOW' | 'WAIT' | 'MONITOR' {
    if (confidence >= 85 && discountPercentage >= threshold) return 'BUY_NOW';
    if (confidence >= 70 && discountPercentage >= threshold * 0.8) return 'MONITOR';
    return 'WAIT';
  }
  
  private static generateReasoning(
    discountPercentage: number, 
    threshold: number, 
    confidence: number
  ): string {
    if (discountPercentage >= threshold && confidence >= 85) {
      return `Excellent deal: ${discountPercentage.toFixed(1)}% discount exceeds adaptive threshold of ${threshold}% with high confidence (${confidence}%)`;
    }
    
    if (discountPercentage >= threshold) {
      return `Good deal: ${discountPercentage.toFixed(1)}% discount meets threshold but moderate confidence (${confidence}%)`;
    }
    
    return `Below threshold: ${discountPercentage.toFixed(1)}% discount below adaptive threshold of ${threshold}%`;
  }
  
  private static async getAdaptiveFactors(origin: string, destination: string) {
    const route = await StrategicRoute.findOne({ origin, destination });
    const season = this.getCurrentSeason();
    
    return {
      seasonality: route?.seasonalPatterns[season]?.demand || 50,
      competition: route?.metadata.competitionLevel === 'HIGH' ? 80 : 50,
      volatility: route?.metadata.volatility === 'HIGH' ? 80 : 50,
      userSegment: 'adaptive'
    };
  }
  
  private static analyzeMarketConditions(origin: string, destination: string): number {
    // Simulate market condition analysis
    // In production, this would analyze real market data
    return 60 + Math.random() * 30; // 60-90 range
  }
  
  private static analyzeSeasonalEvents(): number {
    // Simulate seasonal event analysis
    // In production, this would check for holidays, events, etc.
    return 50 + Math.random() * 40; // 50-90 range
  }
}
