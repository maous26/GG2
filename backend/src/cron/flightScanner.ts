// ===== backend/src/cron/flightScanner.ts =====
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import cron from 'node-cron';
import { FlightService } from '../services/flightService';

export class FlightScanner {
  private readonly flightService: FlightService;

  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis
  ) {
    this.flightService = new FlightService(pool, redis);
  }

  public startScanning(): void {
// Tier 1: Every 4 hours
cron.schedule('0 */4 * * *', async () => {
      console.info('🔍 Starting Tier 1 route scan (every 4 hours)...');
      await this.scanTier(1);
});

    // Tier 2: Every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.info('🔍 Starting Tier 2 route scan (every 6 hours)...');
      await this.scanTier(2);
    });

    // Tier 3: Every 12 hours
    cron.schedule('0 */12 * * *', async () => {
      console.info('🔍 Starting Tier 3 route scan (every 12 hours)...');
      await this.scanTier(3);
    });
  }

  private async scanTier(tier: number): Promise<void> {
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
    } catch (error) {
      console.error(`Error scanning tier ${tier}:`, error);
    }
  }

  private async getRoutesForTier(tier: number): Promise<Array<{ origin: string; destination: string }>> {
    const { rows } = await this.pool.query(`
      SELECT DISTINCT origin, destination
      FROM routes
      WHERE tier = $1
      AND active = true
    `, [tier]);

    return rows;
  }

  private async scanRoute(route: { origin: string; destination: string }): Promise<void> {
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

    } catch (error) {
      console.error(`Error scanning route ${route.origin}-${route.destination}:`, error);
    }
  }

  private async saveDeals(deals: Array<{
    origin: string;
    destination: string;
    price: number;
    original_price: number;
    discount: number;
    airline: string;
    departure_date: Date;
    return_date: Date;
  }>): Promise<void> {
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
      } catch (error) {
        console.error('Error saving deal:', error);
      }
    }
  }
}