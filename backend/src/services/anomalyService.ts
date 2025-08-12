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

export class AnomalyService {
  /**
   * Detects price anomalies in flight data
   */
  public async detectPriceAnomaly(flights: Flight[]): Promise<Flight[]> {
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

    } catch (error) {
      console.error('Error detecting price anomalies:', error);
      throw error;
    }
  }

  private calculateMean(numbers: number[]): number {
    return numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
  }

  private calculateStdDev(numbers: number[], mean: number): number {
    const squareDiffs = numbers.map(value => {
      const diff = value - mean;
      return diff * diff;
    });
    const avgSquareDiff = this.calculateMean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}