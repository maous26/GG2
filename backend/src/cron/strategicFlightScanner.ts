// Strategic Flight Scanner with AI-Driven Pricing System
// Replaces fixed 30% threshold with adaptive intelligent validation

import cron from 'node-cron';
import { Route } from '../models/Route';
import { Alert } from '../models/Alert';
import User from '../models/User';
import { FlightLabsService, FlightDeal } from '../services/flightLabsService';
import { IntelligentPricingService } from '../services/intelligentPricingService';

export class StrategicFlightScanner {
  private flightLabsService: FlightLabsService;
  private isScanning: boolean = false;
  private scanStats = {
    totalScans: 0,
    dealsFound: 0,
    alertsSent: 0,
    apiCallsUsed: 0,
    lastScanTimes: {
      tier1: new Date(),
      tier2: new Date(),
      tier3: new Date()
    }
  };

  constructor() {
    this.flightLabsService = new FlightLabsService();
    this.startScheduledScanning();
    
    console.log('🎯 Strategic AI-Driven Flight Scanner Initialized');
    console.log('   ✅ Fixed 30% threshold → Replaced with adaptive thresholds');
    console.log('   ✅ Multi-level validation → Active');
    console.log('   ✅ User segment optimization → Active');
  }

  /**
   * Démarre les scans programmés
   */
  private startScheduledScanning(): void {
    console.log('🚀 Starting strategic flight scanning with AI pricing...');

    // TIER 1 - Toutes les 2 heures (routes premium)
    cron.schedule('0 */2 * * *', async () => {
      console.log('🥇 Starting Tier 1 AI scan');
      await this.scanWithAI(1);
    });

    // TIER 2 - Toutes les 6 heures
    cron.schedule('0 */6 * * *', async () => {
      console.log('🥈 Starting Tier 2 AI scan');
      await this.scanWithAI(2);
    });

    // TIER 3 - Toutes les 12 heures
    cron.schedule('0 */12 * * *', async () => {
      console.log('🥉 Starting Tier 3 AI scan');
      await this.scanWithAI(3);
    });

    // Rapport quotidien
    cron.schedule('0 9 * * *', () => {
      this.generateDailyReport();
    });

    // Test initial (after 30 seconds)
    setTimeout(async () => {
      console.log('🔥 Running initial AI-powered test scan...');
      await this.scanWithAI(1, 2);
    }, 30000);
  }

  /**
   * Scan avec intelligence artificielle
   */
  private async scanWithAI(tier: 1 | 2 | 3, limitRoutes?: number): Promise<void> {
    if (this.isScanning) {
      console.log(`⏸️ Tier ${tier} AI scan skipped - already scanning`);
      return;
    }

    this.isScanning = true;
    const startTime = Date.now();

    try {
      // Récupérer les routes actives du tier
      const routes = await Route.find({ 
        tier, 
        isActive: true 
      }).limit(limitRoutes || 50);

      if (routes.length === 0) {
        console.log(`📭 No active routes found for Tier ${tier}`);
        return;
      }

      console.log(`🧠 AI-scanning ${routes.length} routes for Tier ${tier}`);
      
      let dealsFoundInScan = 0;
      let apiCallsInScan = 0;

      for (const route of routes) {
        try {
          // Simuler la détection de deals (remplace FlightLabs API)
          const mockDeals = await this.generateMockDeals(route);
          apiCallsInScan += 1;

          if (mockDeals.length > 0) {
            console.log(`💰 Found ${mockDeals.length} potential deals on ${route.origin}-${route.destination}`);
            
            // Traiter chaque deal avec validation IA
            for (const deal of mockDeals) {
              const processed = await this.processDealWithAI(deal, route);
              if (processed) {
                dealsFoundInScan++;
              }
            }
          }

          // Mettre à jour la route
          await Route.updateOne(
            { _id: route._id },
            { 
              lastScan: new Date(),
              $inc: { 'performance.totalScans': 1 }
            }
          );

          // Délai pour éviter la surcharge
          await this.sleep(100);

        } catch (error) {
          console.error(`❌ Error scanning route ${route.origin}-${route.destination}:`, error);
        }
      }

      // Statistiques
      this.scanStats.totalScans++;
      this.scanStats.dealsFound += dealsFoundInScan;
      this.scanStats.apiCallsUsed += apiCallsInScan;
      this.scanStats.lastScanTimes[`tier${tier}` as keyof typeof this.scanStats.lastScanTimes] = new Date();

      const duration = Date.now() - startTime;
      console.log(`✅ Tier ${tier} AI scan completed in ${duration}ms`);
      console.log(`   💎 Valid deals found: ${dealsFoundInScan}`);
      console.log(`   📞 API calls used: ${apiCallsInScan}`);

    } catch (error) {
      console.error(`❌ Error during Tier ${tier} AI scan:`, error);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Génère des deals mock pour test
   */
  private async generateMockDeals(route: any): Promise<FlightDeal[]> {
    // Simuler 20% de chance de trouver un deal
    if (Math.random() > 0.2) {
      return [];
    }

    const currentPrice = Math.round(300 + Math.random() * 400);
    const originalPrice = Math.round(currentPrice * (1.2 + Math.random() * 0.5));
    const discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);

    const departureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    return [{
      origin: route.origin,
      destination: route.destination,
      airline: 'AF',
      currentPrice,
      originalPrice,
      discountPercentage,
      currency: 'EUR',
      departureDate: departureDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
      deepLink: 'https://www.example.com/flight-deal',
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h validity
      cabin: 'economy',
      stops: 0,
      duration: '2h 30m',
      detectedAt: new Date()
    }];
  }

  /**
   * Traite un deal avec validation IA
   */
  private async processDealWithAI(deal: FlightDeal, route: any): Promise<boolean> {
    try {
      // Récupérer l'historique des prix
      const priceHistory = await this.getPriceHistory(deal.origin, deal.destination);
      
      // *** VALIDATION INTELLIGENTE - REMPLACE LE SEUIL FIXE DE 30% ***
      const validation = await IntelligentPricingService.validatePriceIntelligently(
        deal.origin,
        deal.destination,
        deal.currentPrice,
        priceHistory,
        'premium' // Segment par défaut
      );

      // Validation basée sur l'IA au lieu du seuil fixe
      if (!validation.isValid) {
        console.log(`❌ Deal rejected by AI: ${deal.origin}-${deal.destination} (${validation.reasoning})`);
        return false;
      }

      // Créer l'alerte avec métriques IA
      const alert = await Alert.create({
        origin: deal.origin,
        destination: deal.destination,
        airline: deal.airline,
        price: deal.currentPrice,
        discountPercentage: deal.discountPercentage,
        detectedAt: deal.detectedAt,
        expiresAt: deal.validUntil,
        sentTo: [],
        // Nouvelles métriques IA
        validationScore: validation.confidence,
        adaptiveThreshold: validation.threshold,
        recommendation: validation.recommendation,
        validationMethod: 'CONTEXTUAL',
        priceHistory: priceHistory
      });

      // Trouver les utilisateurs intéressés avec seuils adaptatifs
      const interestedUsers = await this.findUsersWithAdaptiveThresholds(deal);
      
      if (interestedUsers.length > 0) {
        await this.sendAlertsToUsers(alert, interestedUsers, deal);
        
        console.log(`📧 Sent ${interestedUsers.length} AI-validated alerts for ${deal.origin}-${deal.destination}`);
        console.log(`   └─ Discount: ${deal.discountPercentage}% | AI Confidence: ${validation.confidence}% | Threshold: ${validation.threshold}%`);
        
        this.scanStats.alertsSent += interestedUsers.length;

        // Mettre à jour les performances de la route
        await Route.updateOne(
          { _id: route._id },
          { 
            $inc: { 'performance.totalAlerts': 1 },
            $set: { 'performance.avgValidationScore': validation.confidence }
          }
        );

        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Error processing deal with AI:', error);
      return false;
    }
  }

  /**
   * Trouve les utilisateurs avec seuils adaptatifs
   */
  private async findUsersWithAdaptiveThresholds(deal: FlightDeal): Promise<any[]> {
    const query: any = {
      $or: [
        { departure_airports: deal.origin },
        { departure_airports: { $size: 0 } }
      ]
    };

    // Seuils adaptatifs par segment (remplace le 30% fixe)
    const adaptiveThresholds = {
      free: 35,      // 35% pour gratuit (au lieu de 30% fixe)
      premium: 25,   // 25% pour premium (au lieu de 30% fixe)
      enterprise: 20 // 20% pour enterprise (au lieu de 30% fixe)
    };

    // Filtrer selon le discount et le segment
    if (deal.discountPercentage < adaptiveThresholds.free) {
      query.subscription_type = { $in: ['premium', 'enterprise'] };
    }

    const users = await User.find(query).limit(100);

    return users.filter(user => {
      const threshold = adaptiveThresholds[user.subscription_type as keyof typeof adaptiveThresholds] || 30;
      return deal.discountPercentage >= threshold;
    });
  }

  /**
   * Récupère l'historique des prix
   */
  private async getPriceHistory(origin: string, destination: string): Promise<number[]> {
    try {
      const recentAlerts = await Alert.find({
        origin,
        destination,
        detectedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
      .sort({ detectedAt: -1 })
      .limit(15)
      .select('price');

      const prices = recentAlerts.map(alert => alert.price);
      
      // Si pas assez d'historique, générer des données simulées
      if (prices.length < 3) {
        return [500, 480, 520, 490, 510, 460, 530];
      }
      
      return prices;
    } catch (error) {
      console.error(`❌ Error fetching price history:`, error);
      return [500, 480, 520, 490, 510];
    }
  }

  /**
   * Envoie les alertes aux utilisateurs
   */
  private async sendAlertsToUsers(alert: any, users: any[], deal: FlightDeal): Promise<void> {
    const sentToData = users.map(user => ({
      user: user._id,
      sentAt: new Date(),
      opened: false,
      clicked: false
    }));

    await Alert.updateOne(
      { _id: alert._id },
      { $push: { sentTo: { $each: sentToData } } }
    );

    const userIds = users.map(u => u._id);
    await User.updateMany(
      { _id: { $in: userIds } },
      { $inc: { alerts_received: 1 } }
    );

    console.log(`📬 AI-powered alert sent to ${users.length} users`);
  }

  /**
   * Génère un rapport quotidien
   */
  private generateDailyReport(): void {
    console.log('\n📊 DAILY AI-POWERED SCANNING REPORT');
    console.log('=====================================');
    console.log(`🔢 Total scans performed: ${this.scanStats.totalScans}`);
    console.log(`💎 AI-validated deals: ${this.scanStats.dealsFound}`);
    console.log(`📧 Alerts sent: ${this.scanStats.alertsSent}`);
    console.log(`📞 API calls used: ${this.scanStats.apiCallsUsed}`);
    
    const efficiency = this.scanStats.dealsFound / Math.max(this.scanStats.apiCallsUsed, 1);
    console.log(`⚡ AI Efficiency: ${(efficiency * 100).toFixed(2)}% valid deals per call`);
    console.log(`🎯 System: ADAPTIVE THRESHOLDS (15-60%) vs OLD FIXED 30%`);
    console.log('=====================================\n');
  }

  /**
   * Force un scan pour test
   */
  public async forceScan(tier?: 1 | 2 | 3, maxRoutes: number = 3): Promise<void> {
    if (tier) {
      console.log(`🔧 Force AI scan Tier ${tier} (max ${maxRoutes} routes)`);
      await this.scanWithAI(tier, maxRoutes);
    } else {
      console.log(`🔧 Force AI scan all tiers`);
      await this.scanWithAI(1, maxRoutes);
      await this.sleep(2000);
      await this.scanWithAI(2, maxRoutes);
      await this.sleep(2000);
      await this.scanWithAI(3, maxRoutes);
    }
  }

  /**
   * Obtient les statistiques
   */
  public getStats() {
    return {
      ...this.scanStats,
      isCurrentlyScanning: this.isScanning,
      aiPowered: true,
      systemType: 'ADAPTIVE_THRESHOLDS'
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance globale
let strategicScanner: StrategicFlightScanner | null = null;

/**
 * Initialise le scanner
 */
export function initializeStrategicScanner(): StrategicFlightScanner {
  if (!strategicScanner) {
    strategicScanner = new StrategicFlightScanner();
  }
  return strategicScanner;
}

/**
 * Obtient l'instance du scanner
 */
export function getStrategicScanner(): StrategicFlightScanner | null {
  return strategicScanner;
}

// Auto-initialisation
initializeStrategicScanner();