"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightScanner = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const flightService_1 = require("../services/flightService");
class FlightScanner {
    constructor(pool, redis) {
        this.pool = pool;
        this.redis = redis;
        this.flightService = new flightService_1.FlightService(pool, redis);
    }
    startScanning() {
        // Tier 1: Every 4 hours
        node_cron_1.default.schedule('0 */4 * * *', async () => {
            console.info('🔍 Starting Tier 1 route scan (every 4 hours)...');
            await this.scanTier(1);
        });
        // Tier 2: Every 6 hours
        node_cron_1.default.schedule('0 */6 * * *', async () => {
            console.info('🔍 Starting Tier 2 route scan (every 6 hours)...');
            await this.scanTier(2);
        });
        // Tier 3: Every 12 hours
        node_cron_1.default.schedule('0 */12 * * *', async () => {
            console.info('🔍 Starting Tier 3 route scan (every 12 hours)...');
            await this.scanTier(3);
        });
    }
    async scanTier(tier) {
        try {
            // Get routes for this tier
            const routes = await this.getRoutesForTier(tier);
            // Scan each route
            for (const route of routes) {
                await this.scanRoute(route);
                // Small delay between scans to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            console.info(`✅ Tier ${tier} scan completed`);
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
    async scanRoute(route) {
        try {
            // Check if we need to scan this route (based on last scan time)
            const lastScanKey = `last_scan:${route.origin}:${route.destination}`;
            const lastScan = await this.redis.get(lastScanKey);
            if (lastScan) {
                const hoursSinceLastScan = (Date.now() - parseInt(lastScan)) / (1000 * 60 * 60);
                const { rows: [routeConfig] } = await this.pool.query(`
          SELECT scan_frequency_hours FROM routes
          WHERE origin = $1 AND destination = $2
        `, [route.origin, route.destination]);
                if (hoursSinceLastScan < (routeConfig?.scan_frequency_hours || 4)) {
                    return; // Skip this route
                }
            }
            // Search flights
            const flights = await this.flightService.searchFlights(route.origin, route.destination);
            // Process flights with significant discounts
            const goodDeals = flights.filter(flight => flight.discount >= 30);
            if (goodDeals.length > 0) {
                console.info(`💎 Found ${goodDeals.length} deals for ${route.origin}-${route.destination}`);
                await this.saveDeals(goodDeals);
            }
            // Update last scan time
            await this.redis.set(lastScanKey, Date.now().toString());
        }
        catch (error) {
            console.error(`Error scanning route ${route.origin}-${route.destination}:`, error);
        }
    }
    async saveDeals(deals) {
        const query = `
      INSERT INTO deals (
        origin, destination, price, original_price,
        discount, airline, departure_date, return_date,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;
        for (const deal of deals) {
            try {
                await this.pool.query(query, [
                    deal.origin,
                    deal.destination,
                    deal.price,
                    deal.original_price,
                    deal.discount,
                    deal.airline,
                    deal.departure_date,
                    deal.return_date
                ]);
            }
            catch (error) {
                console.error('Error saving deal:', error);
            }
        }
    }
}
exports.FlightScanner = FlightScanner;
