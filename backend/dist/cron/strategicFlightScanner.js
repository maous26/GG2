"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategicFlightScanner = void 0;
exports.initializeStrategicScanner = initializeStrategicScanner;
exports.getStrategicScanner = getStrategicScanner;
const node_cron_1 = __importDefault(require("node-cron"));
const Route_1 = require("../models/Route");
const Alert_1 = require("../models/Alert");
const User_1 = __importDefault(require("../models/User"));
const flightLabsService_1 = require("../services/flightLabsService");
const strategicRoutes_1 = require("../utils/strategicRoutes");
class StrategicFlightScanner {
    constructor() {
        this.isScanning = false;
        this.scanStats = {
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
        this.flightLabsService = new flightLabsService_1.FlightLabsService();
        this.initializeStrategicRoutes();
        this.startScheduledScanning();
        // Afficher les statistiques de la stratégie
        const strategy = (0, strategicRoutes_1.calculateRouteStrategy)();
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
    async initializeStrategicRoutes() {
        try {
            console.log('🔄 Initializing strategic routes in database...');
            // Supprimer les anciennes routes pour les remplacer par la stratégie
            await Route_1.Route.deleteMany({});
            // Créer les nouvelles routes stratégiques
            for (const strategicRoute of strategicRoutes_1.STRATEGIC_ROUTES) {
                const routeData = (0, strategicRoutes_1.convertToRouteModel)(strategicRoute);
                await Route_1.Route.create(routeData);
            }
            console.log(`✅ Initialized ${strategicRoutes_1.STRATEGIC_ROUTES.length} strategic routes in database`);
        }
        catch (error) {
            console.error('❌ Error initializing strategic routes:', error);
        }
    }
    /**
     * Démarre les scans programmés selon la stratégie par tiers
     */
    startScheduledScanning() {
        console.log('🚀 Starting strategic flight scanning...');
        // TIER 1 - Toutes les 2 heures (routes premium ultra haute fréquence)
        node_cron_1.default.schedule('0 */2 * * *', async () => {
            console.log('🥇 Starting Tier 1 scan (every 2h)');
            await this.scanTier(1);
        });
        // TIER 2 - Toutes les 4 heures (routes régionales optimisées) ET 6 heures (routes standards)
        node_cron_1.default.schedule('0 */4 * * *', async () => {
            console.log('🥈 Starting Tier 2 scan (every 4h)');
            await this.scanTierByFrequency(2, 4);
        });
        node_cron_1.default.schedule('0 */6 * * *', async () => {
            console.log('🥈 Starting Tier 2 scan (every 6h)');
            await this.scanTierByFrequency(2, 6);
        });
        // TIER 3 - Toutes les 12 heures (routes de surveillance)
        node_cron_1.default.schedule('0 */12 * * *', async () => {
            console.log('🥉 Starting Tier 3 scan (every 12h)');
            await this.scanTier(3);
        });
        // Scan initial immédiat de quelques routes tier 1 pour tester
        setTimeout(async () => {
            console.log('🔥 Running initial test scan on Tier 1 routes...');
            await this.scanTier(1, 3); // Scan seulement 3 routes tier 1 pour test
        }, 5000);
        // Rapport quotidien à 9h00
        node_cron_1.default.schedule('0 9 * * *', () => {
            this.generateDailyReport();
        });
    }
    /**
     * Scanne toutes les routes d'un tier donné
     */
    async scanTier(tier, limitRoutes) {
        if (this.isScanning) {
            console.log(`⏸️ Tier ${tier} scan skipped - already scanning`);
            return;
        }
        this.isScanning = true;
        const startTime = Date.now();
        try {
            const routes = (0, strategicRoutes_1.getRoutesByTier)(tier);
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
                    await Route_1.Route.updateOne({ origin: strategicRoute.origin, destination: strategicRoute.destination }, {
                        lastScan: new Date(),
                        $inc: { 'performance.totalAlerts': deals.length }
                    });
                    // Petit délai pour éviter de surcharger l'API
                    await this.sleep(200);
                }
                catch (error) {
                    console.error(`❌ Error scanning route ${strategicRoute.origin}-${strategicRoute.destination}:`, error);
                }
            }
            // Mettre à jour les statistiques
            this.scanStats.totalScans++;
            this.scanStats.dealsFound += dealsFoundInScan;
            this.scanStats.apiCallsUsed += apiCallsInScan;
            this.scanStats.lastScanTimes[`tier${tier}`] = new Date();
            const duration = Date.now() - startTime;
            console.log(`✅ Tier ${tier} scan completed in ${duration}ms`);
            console.log(`   💎 Deals found: ${dealsFoundInScan}`);
            console.log(`   📞 API calls used: ${apiCallsInScan}`);
        }
        catch (error) {
            console.error(`❌ Error during Tier ${tier} scan:`, error);
        }
        finally {
            this.isScanning = false;
        }
    }
    /**
     * Scan les routes d'un tier spécifique avec une fréquence donnée
     */
    async scanTierByFrequency(tier, frequency, maxRoutes) {
        if (this.isScanning) {
            console.log(`⏳ Scanner already running, skipping Tier ${tier} (${frequency}h) scan`);
            return;
        }
        this.isScanning = true;
        const startTime = Date.now();
        try {
            // Récupérer les routes du tier avec la fréquence spécifiée
            const routes = await Route_1.Route.find({
                tier,
                isActive: true,
                scanFrequencyHours: frequency
            }).limit(maxRoutes || 100);
            if (routes.length === 0) {
                console.log(`ℹ️ No routes found for Tier ${tier} with ${frequency}h frequency`);
                return;
            }
            console.log(`🔍 Scanning ${routes.length} routes for Tier ${tier} (${frequency}h frequency)`);
            let dealsFound = 0;
            let apiCallsUsed = 0;
            for (const route of routes) {
                try {
                    // Simulation d'appels API avec données réalistes selon la fréquence
                    const callsForRoute = 2; // Fallback simple en attendant la mise à jour du modèle
                    const deals = await this.flightLabsService.detectDeals({
                        origin: route.origin,
                        destination: route.destination,
                        tier: route.tier,
                        scanFrequencyHours: route.scanFrequencyHours,
                        estimatedCallsPerScan: callsForRoute,
                        remarks: '',
                        priority: 'medium',
                        expectedDiscountRange: '20-40%',
                        targetUserTypes: ['free', 'premium'],
                        geographicRegion: 'europe',
                        seasonalBoost: false,
                        aiTestRoute: false
                    });
                    apiCallsUsed += callsForRoute;
                    if (deals && deals.length > 0) {
                        dealsFound += deals.length;
                        for (const deal of deals) {
                            await this.processDeal(deal, route);
                        }
                    }
                    // Mettre à jour la dernière fois scanné
                    await Route_1.Route.findByIdAndUpdate(route._id, { lastScan: new Date() });
                }
                catch (error) {
                    console.error(`❌ Error scanning route ${route.origin}-${route.destination}:`, error);
                }
            }
            // Mettre à jour les statistiques
            this.scanStats.totalScans++;
            this.scanStats.dealsFound += dealsFound;
            this.scanStats.apiCallsUsed += apiCallsUsed;
            this.scanStats.lastScanTimes[`tier${tier}`] = new Date();
            const scanTime = Date.now() - startTime;
            console.log(`✅ Tier ${tier} (${frequency}h) scan completed in ${scanTime}ms`);
            console.log(`   💎 Deals found: ${dealsFound}`);
            console.log(`   📞 API calls used: ${apiCallsUsed}`);
        }
        catch (error) {
            console.error(`❌ Error in Tier ${tier} (${frequency}h) scanning:`, error);
        }
        finally {
            this.isScanning = false;
        }
    }
    /**
     * Traite une bonne affaire détectée
     */
    async processDeal(deal, strategicRoute) {
        try {
            // Créer l'alerte en base de données
            const alert = await Alert_1.Alert.create({
                origin: deal.origin,
                destination: deal.destination,
                airline: deal.airline,
                price: deal.currentPrice,
                discountPercentage: deal.discountPercentage,
                detectedAt: deal.detectedAt,
                expiresAt: deal.validUntil,
                sentTo: []
            });
            // Trouver les utilisateurs intéressés selon la stratégie
            const interestedUsers = await this.findInterestedUsers(deal, strategicRoute);
            if (interestedUsers.length > 0) {
                // Envoyer les alertes aux utilisateurs
                await this.sendAlertsToUsers(alert, interestedUsers, deal);
                console.log(`📧 Sent ${interestedUsers.length} alerts for ${deal.origin}-${deal.destination} (-${deal.discountPercentage}%)`);
                this.scanStats.alertsSent += interestedUsers.length;
            }
        }
        catch (error) {
            console.error('❌ Error processing deal:', error);
        }
    }
    /**
     * Trouve les utilisateurs intéressés par une bonne affaire selon la stratégie
     */
    async findInterestedUsers(deal, strategicRoute) {
        const query = {
            $or: [
                { departure_airports: deal.origin },
                { departure_airports: { $size: 0 } } // Utilisateurs sans préférence d'aéroport
            ]
        };
        // Filtrage selon le type d'utilisateur cible de la route
        if (strategicRoute.targetUserTypes.length > 0) {
            query.subscription_type = { $in: strategicRoute.targetUserTypes };
        }
        // Critères de discount selon l'abonnement
        const minDiscountForFree = 30; // 30% minimum pour utilisateurs gratuits
        const minDiscountForPremium = 20; // 20% minimum pour premium
        // Si la réduction est insuffisante pour les gratuits, les exclure
        if (deal.discountPercentage < minDiscountForFree) {
            query.subscription_type = { $in: ['premium', 'enterprise'] };
        }
        const users = await User_1.default.find(query).limit(100); // Limiter à 100 utilisateurs par deal
        return users.filter(user => {
            // Vérifier les critères spécifiques par type d'utilisateur
            if (user.subscription_type === 'free' && deal.discountPercentage < minDiscountForFree) {
                return false;
            }
            if (user.subscription_type === 'premium' && deal.discountPercentage < minDiscountForPremium) {
                return false;
            }
            return true;
        });
    }
    /**
     * Envoie les alertes aux utilisateurs
     */
    async sendAlertsToUsers(alert, users, deal) {
        const sentToData = users.map(user => ({
            user: user._id,
            sentAt: new Date(),
            opened: false,
            clicked: false
        }));
        // Mettre à jour l'alerte avec les destinataires
        await Alert_1.Alert.updateOne({ _id: alert._id }, { $push: { sentTo: { $each: sentToData } } });
        // Incrémenter le compteur d'alertes reçues pour chaque utilisateur
        const userIds = users.map(u => u._id);
        await User_1.default.updateMany({ _id: { $in: userIds } }, { $inc: { alerts_received: 1 } });
        // TODO: Intégrer ici l'envoi d'emails via EnhancedEmailService
        console.log(`📬 Alert sent to ${users.length} users for ${deal.airline} ${deal.origin}-${deal.destination} at €${deal.currentPrice} (-${deal.discountPercentage}%)`);
    }
    /**
     * Génère un rapport quotidien
     */
    generateDailyReport() {
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
    async forceScan(tier, maxRoutes = 5) {
        if (tier) {
            console.log(`🔧 Force scanning Tier ${tier} (max ${maxRoutes} routes)`);
            await this.scanTier(tier, maxRoutes);
        }
        else {
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
    getStats() {
        return {
            ...this.scanStats,
            isCurrentlyScanning: this.isScanning,
            strategy: (0, strategicRoutes_1.calculateRouteStrategy)()
        };
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.StrategicFlightScanner = StrategicFlightScanner;
// Instance globale du scanner
let strategicScanner = null;
/**
 * Initialise le scanner stratégique
 */
function initializeStrategicScanner() {
    if (!strategicScanner) {
        strategicScanner = new StrategicFlightScanner();
    }
    return strategicScanner;
}
/**
 * Obtient l'instance du scanner
 */
function getStrategicScanner() {
    return strategicScanner;
}
// Auto-initialisation si ce module est importé
initializeStrategicScanner();
