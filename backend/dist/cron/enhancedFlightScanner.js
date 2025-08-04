"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedFlightScanner = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const enhancedEmailService_1 = require("../services/enhancedEmailService");
const aiAgentService_1 = require("../services/aiAgentService");
const anomalyService_1 = require("../services/anomalyService");
const generative_ai_1 = require("@google/generative-ai");
const openai_1 = require("openai");
class EnhancedFlightScanner {
    constructor(pool, redis) {
        this.pool = pool;
        this.redis = redis;
        const gemini = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.aiAgent = new aiAgentService_1.AIAgentService(pool, redis, gemini, openai);
        this.anomalyService = new anomalyService_1.AnomalyService();
        this.emailService = new enhancedEmailService_1.EnhancedEmailService(pool, redis, this.aiAgent);
    }
    startScanning() {
        // Tier 1: Every 4 hours
        node_cron_1.default.schedule('0 */4 * * *', () => this.scanTier(1));
        // Tier 2: Every 6 hours
        node_cron_1.default.schedule('0 */6 * * *', () => this.scanTier(2));
        // Tier 3: Every 12 hours
        node_cron_1.default.schedule('0 */12 * * *', () => this.scanTier(3));
    }
    async scanTier(tier) {
        try {
            // Get routes for this tier
            const routes = await this.getRoutesForTier(tier);
            // Fetch and analyze flights
            for (const route of routes) {
                const flights = await this.fetchFlights(route);
                const anomalies = await this.anomalyService.detectPriceAnomaly(flights);
                if (anomalies.length > 0) {
                    await this.processAnomalies(anomalies, route);
                }
            }
        }
        catch (error) {
            console.error(`Error scanning tier ${tier}:`, error);
        }
    }
    async getRoutesForTier(tier) {
        const { rows } = await this.pool.query(`
      SELECT DISTINCT origin, destination
      FROM routes
      WHERE tier = $1
      AND active = true
    `, [tier]);
        return rows;
    }
    async fetchFlights(route) {
        // Here you would integrate with your flight data provider API
        // For now, returning mock data for testing
        const { rows } = await this.pool.query(`
      SELECT *
      FROM flights
      WHERE origin = $1
      AND destination = $2
      AND departure_date > NOW()
      ORDER BY price ASC
      LIMIT 10
    `, [route.origin, route.destination]);
        return rows;
    }
    async processAnomalies(anomalies, route) {
        try {
            // Filter significant anomalies (>20% discount)
            const significantAnomalies = anomalies.filter(f => (f.discount || 0) > 20);
            if (significantAnomalies.length === 0)
                return;
            // Sort by discount percentage
            significantAnomalies.sort((a, b) => (b.discount || 0) - (a.discount || 0));
            // Get users who should be notified
            const interestedUsers = await this.findInterestedUsers(route, significantAnomalies[0].price);
            // Group alerts by user
            const userAlerts = this.groupAlertsByUser(interestedUsers, significantAnomalies);
            // Send alerts
            for (const [userId, alerts] of Object.entries(userAlerts)) {
                await this.emailService.sendPriceAlerts(alerts.map(alert => ({
                    userId,
                    origin: alert.origin,
                    destination: alert.destination,
                    price: alert.price,
                    discount: alert.discount || 0,
                    departureDate: alert.departure_date,
                    returnDate: alert.return_date,
                    airline: alert.airline
                })));
            }
            // Log anomalies
            await this.logAnomalies(significantAnomalies);
        }
        catch (error) {
            console.error('Error processing anomalies:', error);
        }
    }
    async findInterestedUsers(route, price) {
        const { rows } = await this.pool.query(`
      SELECT DISTINCT ua.user_id, ua.origin, ua.destination,
             ua.min_discount, ua.max_price
      FROM user_alerts ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.origin = $1
      AND ua.destination = $2
      AND ua.max_price >= $3
      AND u.active = true
    `, [route.origin, route.destination, price]);
        return rows;
    }
    async logAnomalies(anomalies) {
        const query = `
      INSERT INTO price_anomalies (
        flight_id, origin, destination, price,
        original_price, discount, detected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
        for (const anomaly of anomalies) {
            await this.pool.query(query, [
                anomaly.id,
                anomaly.origin,
                anomaly.destination,
                anomaly.price,
                anomaly.original_price,
                anomaly.discount
            ]);
        }
    }
    groupAlertsByUser(users, flights) {
        const userAlerts = {};
        for (const user of users) {
            const relevantFlights = flights.filter(flight => flight.origin === user.origin &&
                flight.destination === user.destination &&
                (flight.discount || 0) >= user.min_discount &&
                flight.price <= user.max_price);
            if (relevantFlights.length > 0) {
                userAlerts[user.user_id] = relevantFlights;
            }
        }
        return userAlerts;
    }
}
exports.EnhancedFlightScanner = EnhancedFlightScanner;
