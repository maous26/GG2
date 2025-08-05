// filepath: /Users/moussa/globegenius/backend/src/cron/strategicFlightScanner.ts
import cron from 'node-cron';
import { Route } from '../models/Route';
import { Alert } from '../models/Alert';
import User from '../models/User';
import { FlightLabsService, FlightDeal } from '../services/flightLabsService';
import { IntelligentPricingService } from '../services/intelligentPricingService';
import { 
  STRATEGIC_ROUTES, 
  getRoutesByTier, 
  calculateRouteStrategy,
  convertToRouteModel 
} from '../utils/strategicRoutes';

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
    this.initializeStrategicRoutes();
    this.startScheduledScanning();
    
    // Afficher les statistiques de la stratégie
    const strategy = calculateRouteStrategy();
    console.log('🎯 Strategic Route Strategy Initialized:');
    console.log(`   📊 Total Routes: ${strategy.total.routes}`);
    console.log(`   🥇 Tier 1 (3h): ${strategy.tier1.routes} routes`);
    console.log(`   🥈 Tier 2 (6h): ${strategy.tier2.routes} routes`);
    console.log(`   🥉 Tier 3 (12h): ${strategy.tier3.routes} routes`);
    console.log(`   📞 API Calls/Day: ${Math.round(strategy.total.callsPerDay)}`);
    console.log(`   📅 API Calls/Month: ${Math.round(strategy.total.callsPerMonth)}`);
    console.log(`   ⚖️ Avg Calls/Route: ${(strategy.total.callsPerDay / strategy.total.routes).toFixed(1)}`);
  }

  /**
   * Initialise les routes stratégiques en base de données
   */
  private async initializeStrategicRoutes(): Promise<void> {
    try {
      console.log('🔄 Initializing strategic routes in database...');

      // Supprimer les anciennes routes pour les remplacer par la stratégie
      await Route.deleteMany({});

      // Créer les nouvelles routes stratégiques
      for (const strategicRoute of STRATEGIC_ROUTES) {
        const routeData = convertToRouteModel(strategicRoute);
        await Route.create(routeData);
      }

      console.log(`✅ Initialized ${STRATEGIC_ROUTES.length} strategic routes in database`);
    } catch (error) {
      console.error('❌ Error initializing strategic routes:', error);
    }
  }

  /**
   * Démarre les scans programmés selon la stratégie par tiers
   */
  private startScheduledScanning(): void {
    console.log('🚀 Starting strategic flight scanning...');

    // TIER 1 - Toutes les 2 heures (routes premium ultra haute fréquence)
    cron.schedule('0 */2 * * *', async () => {
      console.log('🥇 Starting Tier 1 scan (every 2h)');
      await this.scanTier(1);
    });

    // TIER 2 - Toutes les 4 heures (routes régionales optimisées) ET 6 heures (routes standards)
    cron.schedule('0 */4 * * *', async () => {
      console.log('🥈 Starting Tier 2 scan (every 4h)');
      await this.scanTierByFrequency(2, 4);
    });

    cron.schedule('0 */6 * * *', async () => {
      console.log('🥈 Starting Tier 2 scan (every 6h)');
      await this.scanTierByFrequency(2, 6);
    });

    // TIER 3 - Toutes les 12 heures (routes de surveillance)
    cron.schedule('0 */12 * * *', async () => {
      console.log('🥉 Starting Tier 3 scan (every 12h)');
      await this.scanTier(3);
    });

    // Scan initial immédiat de quelques routes tier 1 pour tester
    setTimeout(async () => {
      console.log('🔥 Running initial test scan on Tier 1 routes...');
      await this.scanTier(1, 3); // Scan seulement 3 routes tier 1 pour test
    }, 5000);

    // Rapport quotidien à 9h00
    cron.schedule('0 9 * * *', () => {
      this.generateDailyReport();
    });
  }

  /**
   * Scanne toutes les routes d'un tier donné
   */
  private async scanTier(tier: 1 | 2 | 3, limitRoutes?: number): Promise<void> {
    if (this.isScanning) {
      console.log(`⏸️ Tier ${tier} scan skipped - already scanning`);
      return;
    }

    this.isScanning = true;
    const startTime = Date.now();

    try {
      const routes = getRoutesByTier(tier);
      const routesToScan = limitRoutes ? routes.slice(0, limitRoutes) : routes;
      
      console.log(`🔍 Scanning ${routesToScan.length} routes for Tier ${tier}`);
      
      let dealsFoundInScan = 0;
      let apiCallsInScan = 0;

      for (const strategicRoute of routesToScan) {
        try {
          // Rechercher des bonnes affaires sur cette route
          const deals = await this.flightLabsService.detectDeals(strategicRoute);
          apiCallsInScan += strategicRoute.estimatedCallsPerScan;

          if (deals.length > 0) {
            console.log(`💰 Found ${deals.length} deals on ${strategicRoute.origin}-${strategicRoute.destination}`);
            
            // Traiter chaque bonne affaire
            for (const deal of deals) {
              await this.processDeal(deal, strategicRoute);
              dealsFoundInScan++;
            }
          }

          // Mettre à jour la dernière heure de scan de la route
          await Route.updateOne(
            { origin: strategicRoute.origin, destination: strategicRoute.destination },
            { 
              lastScan: new Date(),
              $inc: { 'performance.totalAlerts': deals.length }
            }
          );

          // Petit délai pour éviter de surcharger l'API
          await this.sleep(200);

        } catch (error) {
          console.error(`❌ Error scanning route ${strategicRoute.origin}-${strategicRoute.destination}:`, error);
        }
      }

      // Mettre à jour les statistiques
      this.scanStats.totalScans++;
      this.scanStats.dealsFound += dealsFoundInScan;
      this.scanStats.apiCallsUsed += apiCallsInScan;
      this.scanStats.lastScanTimes[`tier${tier}` as keyof typeof this.scanStats.lastScanTimes] = new Date();

      const duration = Date.now() - startTime;
      console.log(`✅ Tier ${tier} scan completed in ${duration}ms`);
      console.log(`   💎 Deals found: ${dealsFoundInScan}`);
      console.log(`   📞 API calls used: ${apiCallsInScan}`);

    } catch (error) {
      console.error(`❌ Error during Tier ${tier} scan:`, error);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Scan les routes d'un tier spécifique avec une fréquence donnée
   */
  private async scanTierByFrequency(tier: number, frequency: number, maxRoutes?: number): Promise<void> {
    if (this.isScanning) {
      console.log(`⏳ Scanner already running, skipping Tier ${tier} (${frequency}h) scan`);
      return;
    }

    this.isScanning = true;
    const startTime = Date.now();

    try {
      // Récupérer les routes du tier avec la fréquence spécifiée
      const routes = await Route.find({ 
        tier, 
        isActive: true, 
        scanFrequencyHours: frequency 
      }).limit(maxRoutes || 100);

      if (routes.length === 0) {
        console.log(`📭 No routes found for Tier ${tier} with ${frequency}h frequency`);
        return;
      }

      console.log(`🔍 Scanning ${routes.length} routes for Tier ${tier} (${frequency}h frequency)`);

      let dealsFound = 0;
      let apiCallsUsed = 0;

      for (const route of routes) {
        try {
          // Convertir la route en format StrategicRoute complet pour l'API
          const strategicRoute = {
            origin: route.origin,
            destination: route.destination,
            tier: route.tier as 1 | 2 | 3,
            scanFrequencyHours: route.scanFrequencyHours as 2 | 3 | 4 | 6 | 12,
            estimatedCallsPerScan: route.metadata?.estimatedCallsPerScan || 5,
            remarks: route.metadata?.remarks || '',
            priority: route.metadata?.priority || 'medium',
            expectedDiscountRange: route.metadata?.expectedDiscountRange || '20-40%',
            targetUserTypes: route.metadata?.targetUserTypes || ['premium'],
            geographicRegion: 'europe' as const, // Default since not in Route model
            seasonalBoost: false, // Default since not in Route model  
            aiTestRoute: false // Default since not in Route model
          } as const;

          const deals = await this.flightLabsService.detectDeals(strategicRoute);
          apiCallsUsed += strategicRoute.estimatedCallsPerScan;

          if (deals.length > 0) {
            console.log(`💰 Found ${deals.length} deals on ${route.origin}-${route.destination}`);
            
            for (const deal of deals) {
              await this.processDeal(deal, strategicRoute);
              dealsFound++;
            }
          }

          // Mettre à jour la route
          await Route.updateOne(
            { _id: route._id },
            { 
              lastScan: new Date(),
              $inc: { 'performance.totalAlerts': deals.length }
            }
          );

          await this.sleep(300);

        } catch (error) {
          console.error(`❌ Error scanning route ${route.origin}-${route.destination}:`, error);
        }
      }

      // Statistiques
      this.scanStats.totalScans++;
      this.scanStats.dealsFound += dealsFound;
      this.scanStats.apiCallsUsed += apiCallsUsed;
      this.scanStats.lastScanTimes[`tier${tier}` as keyof typeof this.scanStats.lastScanTimes] = new Date();

      const scanTime = Date.now() - startTime;
      console.log(`✅ Tier ${tier} (${frequency}h) scan completed in ${scanTime}ms`);
      console.log(`   💎 Deals found: ${dealsFound}`);
      console.log(`   📞 API calls used: ${apiCallsUsed}`);

    } catch (error) {
      console.error(`❌ Error in Tier ${tier} (${frequency}h) scanning:`, error);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Récupère l'historique des prix pour une route donnée
   */
  private async getPriceHistory(origin: string, destination: string): Promise<number[]> {
    try {
      // Récupérer les alertes précédentes pour cette route (historique des prix)
      const recentAlerts = await Alert.find({
        origin,
        destination,
        detectedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 derniers jours
      })
      .sort({ detectedAt: -1 })
      .limit(20)
      .select('price');

      const priceHistory = recentAlerts.map(alert => alert.price);
      
      // Si pas assez d'historique, utiliser des données par défaut basées sur la route
      if (priceHistory.length < 3) {
        const route = await Route.findOne({ origin, destination });
        if (route && route.performance.avgDiscount) {
          // Générer un historique simulé basé sur les performances moyennes
          const estimatedBasePrice = 400; // Prix de base estimé
          return [
            estimatedBasePrice * 1.2,  // Prix élevé
            estimatedBasePrice * 1.1,  // Prix moyen-élevé
            estimatedBasePrice,        // Prix moyen
            estimatedBasePrice * 0.95, // Prix moyen-bas
            estimatedBasePrice * 0.85  // Prix bas
          ];
        }
        
        // Valeurs par défaut si aucune donnée disponible
        return [500, 450, 400, 380, 350];
      }
      
      return priceHistory;
    } catch (error) {
      console.error(`❌ Error fetching price history for ${origin}-${destination}:`, error);
      return [500, 450, 400, 380, 350]; // Valeurs par défaut
    }
  }

  /**
   * Traite une bonne affaire détectée avec validation intelligente
   */
  private async processDeal(deal: FlightDeal, strategicRoute: any): Promise<void> {
    try {
      // Récupérer l'historique des prix pour cette route
      const priceHistory = await this.getPriceHistory(deal.origin, deal.destination);
      
      // Récupérer la route stratégique pour obtenir le seuil adaptatif
      const route = await Route.findOne({
        origin: deal.origin,
        destination: deal.destination
      });

      // Validation intelligente du prix avec le nouveau système adaptatif
      const validation = await IntelligentPricingService.validatePriceIntelligently(
        deal.origin,
        deal.destination,
        deal.currentPrice,
        priceHistory,
        'premium' // Default segment, will be refined per user
      );

      // Ne procéder que si la validation est positive
      if (!validation.isValid) {
        console.log(`❌ Deal rejected by intelligent pricing: ${deal.origin}-${deal.destination} (${validation.reasoning})`);
        
        // Mettre à jour les statistiques de la route
        if (route) {
          await Route.updateOne(
            { _id: route._id },
            { 
              $inc: { 
                'performance.totalAlerts': 0,
                'performance.totalScans': 1
              }
            }
          );
        }
        return;
      }

      // Créer l'alerte en base de données avec les informations de validation
      const alert = await Alert.create({
        origin: deal.origin,
        destination: deal.destination,
        airline: deal.airline,
        price: deal.currentPrice,
        discountPercentage: deal.discountPercentage,
        detectedAt: deal.detectedAt,
        expiresAt: deal.validUntil,
        sentTo: [],
        // Ajouter les métriques de validation intelligente
        validationScore: validation.confidence,
        adaptiveThreshold: validation.threshold,
        recommendation: validation.recommendation,
        validationMethod: 'CONTEXTUAL',
        priceHistory: priceHistory,
        seasonalAdjustment: route?.seasonalScore?.summer || 0
      });

      // Trouver les utilisateurs intéressés selon la stratégie intelligente
      const interestedUsers = await this.findInterestedUsers(deal, strategicRoute);
      
      if (interestedUsers.length > 0) {
        // Envoyer les alertes aux utilisateurs
        await this.sendAlertsToUsers(alert, interestedUsers, deal);
        console.log(`📧 Sent ${interestedUsers.length} alerts for ${deal.origin}-${deal.destination} (-${deal.discountPercentage}%) [Confidence: ${validation.confidence}%]`);
        
        this.scanStats.alertsSent += interestedUsers.length;

        // Mettre à jour les statistiques de performance de la route
        if (route) {
          await Route.updateOne(
            { _id: route._id },
            { 
              $inc: { 
                'performance.totalAlerts': 1,
                'performance.totalScans': 1
              },
              $set: {
                'performance.lastAlertPrice': deal.currentPrice,
                'performance.lastAlertDate': new Date(),
                'performance.avgValidationScore': validation.confidence
              }
            }
          );
        }
      }

    } catch (error) {
      console.error('❌ Error processing deal:', error);
    }
  }

  /**
   * Trouve les utilisateurs intéressés par une bonne affaire selon la stratégie intelligente
   */
  private async findInterestedUsers(deal: FlightDeal, strategicRoute: any): Promise<any[]> {
    const query: any = {
      $or: [
        { departure_airports: deal.origin },
        { departure_airports: { $size: 0 } } // Utilisateurs sans préférence d'aéroport
      ]
    };

    // Filtrage selon le type d'utilisateur cible de la route
    if (strategicRoute.targetUserTypes && strategicRoute.targetUserTypes.length > 0) {
      query.subscription_type = { $in: strategicRoute.targetUserTypes };
    }

    // Critères de discount adaptatifs selon l'abonnement et la validation IA
    const minDiscountForFree = 35; // 35% minimum pour utilisateurs gratuits (adaptatif)
    const minDiscountForPremium = 25; // 25% minimum pour premium (adaptatif)
    const minDiscountForEnterprise = 20; // 20% minimum pour enterprise (adaptatif)

    // Si la réduction est insuffisante pour les gratuits, les exclure
    if (deal.discountPercentage < minDiscountForFree) {
      query.subscription_type = { $in: ['premium', 'enterprise'] };
    }

    const users = await User.find(query).limit(150); // Limiter à 150 utilisateurs par deal

    return users.filter(user => {
      // Vérifier les critères spécifiques par type d'utilisateur avec seuils adaptatifs
      if (user.subscription_type === 'free' && deal.discountPercentage < minDiscountForFree) {
        return false;
      }
      if (user.subscription_type === 'premium' && deal.discountPercentage < minDiscountForPremium) {
        return false;
      }
      if (user.subscription_type === 'enterprise' && deal.discountPercentage < minDiscountForEnterprise) {
        return false;
      }
      return true;
    });
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

    // Mettre à jour l'alerte avec les destinataires
    await Alert.updateOne(
      { _id: alert._id },
      { $push: { sentTo: { $each: sentToData } } }
    );

    // Incrémenter le compteur d'alertes reçues pour chaque utilisateur
    const userIds = users.map(u => u._id);
    await User.updateMany(
      { _id: { $in: userIds } },
      { $inc: { alerts_received: 1 } }
    );

    // TODO: Intégrer ici l'envoi d'emails via EnhancedEmailService
    console.log(`📬 Alert sent to ${users.length} users for ${deal.airline} ${deal.origin}-${deal.destination} at €${deal.currentPrice} (-${deal.discountPercentage}%)`);
  }

  /**
   * Génère un rapport quotidien
   */
  private generateDailyReport(): void {
    console.log('\n📊 DAILY STRATEGIC SCANNING REPORT');
    console.log('=====================================');
    console.log(`🔢 Total scans performed: ${this.scanStats.totalScans}`);
    console.log(`💎 Total deals found: ${this.scanStats.dealsFound}`);
    console.log(`📧 Total alerts sent: ${this.scanStats.alertsSent}`);
    console.log(`📞 Total API calls used: ${this.scanStats.apiCallsUsed}`);
    console.log(`🕐 Last Tier 1 scan: ${this.scanStats.lastScanTimes.tier1.toLocaleString()}`);
    console.log(`🕕 Last Tier 2 scan: ${this.scanStats.lastScanTimes.tier2.toLocaleString()}`);
    console.log(`🕛 Last Tier 3 scan: ${this.scanStats.lastScanTimes.tier3.toLocaleString()}`);
    
    // Calcul de l'efficacité
    const efficiency = this.scanStats.dealsFound / Math.max(this.scanStats.apiCallsUsed, 1);
    console.log(`⚡ Efficiency: ${(efficiency * 100).toFixed(2)}% deals per API call`);
    console.log('=====================================\n');
  }

  /**
   * Force un scan immédiat pour test
   */
  public async forceScan(tier?: 1 | 2 | 3, maxRoutes: number = 5): Promise<void> {
    if (tier) {
      console.log(`🔧 Force scanning Tier ${tier} (max ${maxRoutes} routes)`);
      await this.scanTier(tier, maxRoutes);
    } else {
      console.log(`🔧 Force scanning all tiers (max ${maxRoutes} routes each)`);
      await this.scanTier(1, maxRoutes);
      await this.sleep(2000);
      await this.scanTier(2, maxRoutes);
      await this.sleep(2000);
      await this.scanTier(3, maxRoutes);
    }
  }

  /**
   * Obtient les statistiques actuelles
   */
  public getStats() {
    return {
      ...this.scanStats,
      isCurrentlyScanning: this.isScanning,
      strategy: calculateRouteStrategy()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance globale du scanner
let strategicScanner: StrategicFlightScanner | null = null;

/**
 * Initialise le scanner stratégique
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

// Auto-initialisation si ce module est importé
initializeStrategicScanner();
