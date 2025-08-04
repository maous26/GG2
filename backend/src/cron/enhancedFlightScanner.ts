// ===== backend/src/cron/enhancedFlightScanner.ts =====
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import cron from 'node-cron';
import { EnhancedEmailService } from '../services/enhancedEmailService';
import { AIAgentService } from '../services/aiAgentService';
import { AnomalyService } from '../services/anomalyService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';

interface Flight {
  id: string;
  origin: string;
  destination: string;
  departure_date: Date;
  return_date: Date;
  price: number;
  original_price: number;
  discount: number;
  airline: string;
  stops: number;
  tier: number;
}

interface UserAlert {
  user_id: string;
  origin: string;
  destination: string;
  min_discount: number;
  max_price: number;
}

export class EnhancedFlightScanner {
  private readonly emailService: EnhancedEmailService;
  private readonly aiAgent: AIAgentService;
  private readonly anomalyService: AnomalyService;

  constructor(
    private readonly pool: Pool,
    private readonly redis: Redis
  ) {
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.aiAgent = new AIAgentService(pool, redis, gemini, openai);
    this.anomalyService = new AnomalyService();
    this.emailService = new EnhancedEmailService(pool, redis, this.aiAgent);
  }

  public startScanning(): void {
    // Tier 1: Every 4 hours
    cron.schedule('0 */4 * * *', () => this.scanTier(1));

    // Tier 2: Every 6 hours
    cron.schedule('0 */6 * * *', () => this.scanTier(2));

    // Tier 3: Every 12 hours
    cron.schedule('0 */12 * * *', () => this.scanTier(3));
  }

  private async scanTier(tier: number): Promise<void> {
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

  private async fetchFlights(route: { origin: string; destination: string }): Promise<Flight[]> {
    // Here you would integrate with your flight data provider API
    // For now, returning mock data for testing
    const { rows } = await this.pool.query<Flight>(`
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

  private async processAnomalies(anomalies: Flight[], route: { origin: string; destination: string }): Promise<void> {
    try {
      // Filter significant anomalies (>20% discount)
      const significantAnomalies = anomalies.filter(f => (f.discount || 0) > 20);
      
      if (significantAnomalies.length === 0) return;

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

    } catch (error) {
      console.error('Error processing anomalies:', error);
    }
  }

  private async findInterestedUsers(
    route: { origin: string; destination: string },
    price: number
  ): Promise<UserAlert[]> {
    const { rows } = await this.pool.query<UserAlert>(`
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

  private async logAnomalies(anomalies: Flight[]): Promise<void> {
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

  private groupAlertsByUser(users: UserAlert[], flights: Flight[]): Record<string, Flight[]> {
    const userAlerts: Record<string, Flight[]> = {};

    for (const user of users) {
      const relevantFlights = flights.filter(flight => 
        flight.origin === user.origin &&
        flight.destination === user.destination &&
        (flight.discount || 0) >= user.min_discount &&
        flight.price <= user.max_price
      );

      if (relevantFlights.length > 0) {
        userAlerts[user.user_id] = relevantFlights;
      }
    }

    return userAlerts;
  }
}
