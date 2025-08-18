import { createHash } from 'crypto';
import { getRedis } from '../config/redis';
import { FlightPrice } from './flightApiService';
import { StrategicRoute } from '../utils/strategicRoutes';

interface CacheOptions {
  departureDate?: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabin?: string;
  currency?: string;
}

export class FlightCacheService {
  private static redis = getRedis();
  private static readonly CACHE_TTL = 30 * 60; // 30 minutes en secondes
  private static readonly CACHE_PREFIX = 'flight_cache:';

  /**
   * Génère une clé de cache unique pour une recherche
   */
  private static generateCacheKey(route: StrategicRoute, options: CacheOptions): string {
    const keyData = {
      origin: route.origin,
      destination: route.destination,
      departureDate: options.departureDate,
      returnDate: options.returnDate,
      adults: options.adults || 1,
      children: options.children || 0,
      infants: options.infants || 0,
      cabin: options.cabin || 'Economy',
      currency: options.currency || 'EUR'
    };
    
    const hash = createHash('md5').update(JSON.stringify(keyData)).digest('hex');
    return `${this.CACHE_PREFIX}${route.origin}_${route.destination}_${hash}`;
  }

  /**
   * Récupère les résultats depuis le cache si disponibles
   */
  static async getCachedResults(route: StrategicRoute, options: CacheOptions): Promise<FlightPrice[] | null> {
    try {
      const cacheKey = this.generateCacheKey(route, options);
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        console.log(`🎯 [Cache] Cache hit for ${route.origin}-${route.destination} (saved API call)`);
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.warn('Cache read error:', error);
      return null;
    }
  }

  /**
   * Met en cache les résultats d'une recherche
   */
  static async cacheResults(route: StrategicRoute, options: CacheOptions, results: FlightPrice[]): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(route, options);
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(results));
      console.log(`💾 [Cache] Results cached for ${route.origin}-${route.destination} (30min TTL)`);
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  /**
   * Efface le cache pour une route spécifique (si nécessaire)
   */
  static async clearRouteCache(route: StrategicRoute): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}${route.origin}_${route.destination}_*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️ [Cache] Cleared ${keys.length} cache entries for ${route.origin}-${route.destination}`);
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Statistiques du cache
   */
  static async getCacheStats(): Promise<{ totalKeys: number; hitRate?: number }> {
    try {
      const keys = await this.redis.keys(`${this.CACHE_PREFIX}*`);
      return { totalKeys: keys.length };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return { totalKeys: 0 };
    }
  }
}
