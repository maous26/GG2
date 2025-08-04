"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyService = void 0;
class AnomalyService {
    /**
     * Detects price anomalies in flight data
     */
    async detectPriceAnomaly(flights) {
        try {
            if (!flights || flights.length === 0) {
                return [];
            }
            // Calculate price statistics
            const prices = flights.map(f => f.price);
            const mean = this.calculateMean(prices);
            const stdDev = this.calculateStdDev(prices, mean);
            // Identify anomalies (prices more than 2 standard deviations below mean)
            const anomalies = flights.filter(flight => {
                const zScore = (flight.price - mean) / stdDev;
                return zScore < -2;
            });
            // Sort by discount percentage
            return anomalies.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        }
        catch (error) {
            console.error('Error detecting price anomalies:', error);
            throw error;
        }
    }
    calculateMean(numbers) {
        return numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
    }
    calculateStdDev(numbers, mean) {
        const squareDiffs = numbers.map(value => {
            const diff = value - mean;
            return diff * diff;
        });
        const avgSquareDiff = this.calculateMean(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    }
}
exports.AnomalyService = AnomalyService;
