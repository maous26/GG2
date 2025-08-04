"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightService = void 0;
const anomalyService_1 = require("./anomalyService");
class FlightService {
    constructor(pool, redis) {
        this.pool = pool;
        this.redis = redis;
        this.anomalyService = new anomalyService_1.AnomalyService();
    }
    async searchFlights(origin, destination) {
        try {
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
      `, [origin, destination]);
            return rows;
        }
        catch (error) {
            console.error('Error searching flights:', error);
            throw error;
        }
    }
    async getApiUsageStats() {
        try {
            const { rows: [stats] } = await this.pool.query(`
        SELECT 
          COUNT(*) as total_calls,
          (SELECT value::int FROM api_config WHERE key = 'monthly_limit') as monthly_limit,
          (SELECT reset_date FROM api_config WHERE key = 'reset_date') as reset_date
        FROM api_calls
        WHERE created_at >= (
          SELECT reset_date 
          FROM api_config 
          WHERE key = 'reset_date'
        )
      `);
            const remainingCalls = stats.monthly_limit - stats.total_calls;
            const percentage = (stats.total_calls / stats.monthly_limit) * 100;
            return {
                total_calls: stats.total_calls,
                remaining_calls: remainingCalls,
                reset_date: stats.reset_date,
                percentage
            };
        }
        catch (error) {
            console.error('Error getting API usage stats:', error);
            throw error;
        }
    }
    async trackApiCall(endpoint, params) {
        try {
            await this.pool.query(`
        INSERT INTO api_calls (endpoint, parameters, created_at)
        VALUES ($1, $2, NOW())
      `, [endpoint, JSON.stringify(params)]);
        }
        catch (error) {
            console.error('Error tracking API call:', error);
            throw error;
        }
    }
    async analyzeFlightTrends(origin, destination) {
        try {
            const flights = await this.searchFlights(origin, destination);
            const anomalies = await this.anomalyService.detectPriceAnomaly(flights);
            // Cache the analysis results
            const cacheKey = `trends:${origin}:${destination}`;
            await this.redis.setex(cacheKey, 3600, JSON.stringify(anomalies));
            return anomalies;
        }
        catch (error) {
            console.error('Error analyzing flight trends:', error);
            throw error;
        }
    }
}
exports.FlightService = FlightService;
