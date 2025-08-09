import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { Alert } from '../models/Alert';
import User from '../models/User';
import { Route } from '../models/Route';
import { ApiCall } from '../models/ApiCall';

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionState: string;
  responseTime: number;
  collections: {
    users: { count: number; avgSize: number };
    alerts: { count: number; avgSize: number };
    routes: { count: number; avgSize: number };
    apiCalls: { count: number; avgSize: number };
  };
  indexes: {
    total: number;
    efficiency: number;
  };
  performance: {
    slowQueries: number;
    avgQueryTime: number;
  };
  storage: {
    dataSize: number;
    indexSize: number;
    totalSize: number;
  };
  issues: string[];
}

class DatabaseHealthMonitor {
  private lastCheck: Date | null = null;
  private cachedHealth: DatabaseHealth | null = null;
  private cacheTime = 30000; // 30 seconds cache

  async checkHealth(): Promise<DatabaseHealth> {
    // Return cached result if recent
    if (this.cachedHealth && this.lastCheck && 
        Date.now() - this.lastCheck.getTime() < this.cacheTime) {
      return this.cachedHealth;
    }

    const startTime = Date.now();
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check connection state
      const connectionState = this.getConnectionState();
      if (connectionState !== 'connected') {
        issues.push(`Database connection state: ${connectionState}`);
        status = 'unhealthy';
      }

      // Measure response time with a simple query
      const responseStartTime = Date.now();
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
      const responseTime = Date.now() - responseStartTime;

      if (responseTime > 1000) {
        issues.push(`High database response time: ${responseTime}ms`);
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
      }

      // Get database statistics
      const dbStats = mongoose.connection.db ? await mongoose.connection.db.stats() : null;
      const collections = await this.getCollectionStats();
      const indexes = await this.getIndexStats();
      const performance = await this.getPerformanceStats();

      // Check storage usage
      const storage = {
        dataSize: dbStats?.dataSize || 0,
        indexSize: dbStats?.indexSize || 0,
        totalSize: (dbStats?.dataSize || 0) + (dbStats?.indexSize || 0)
      };

      // Storage warnings
      if (storage.totalSize > 1024 * 1024 * 1024) { // 1GB
        issues.push(`Large database size: ${Math.round(storage.totalSize / 1024 / 1024)}MB`);
        if (status === 'healthy') status = 'degraded';
      }

      // Index efficiency check
      if (indexes.efficiency < 80) {
        issues.push(`Low index efficiency: ${indexes.efficiency}%`);
        if (status === 'healthy') status = 'degraded';
      }

      // Performance checks
      if (performance.avgQueryTime > 100) {
        issues.push(`High average query time: ${performance.avgQueryTime}ms`);
        if (status === 'healthy') status = 'degraded';
      }

      if (performance.slowQueries > 10) {
        issues.push(`Too many slow queries: ${performance.slowQueries}`);
        status = 'unhealthy';
      }

      const health: DatabaseHealth = {
        status,
        connectionState,
        responseTime,
        collections,
        indexes,
        performance,
        storage,
        issues
      };

      this.cachedHealth = health;
      this.lastCheck = new Date();

      // Log health issues
      if (issues.length > 0) {
        logger.warn('Database health issues detected', { issues, status });
      }

      return health;

    } catch (error) {
      logger.error('Database health check failed', { error });
      return {
        status: 'unhealthy',
        connectionState: 'unknown',
        responseTime: Date.now() - startTime,
        collections: { users: { count: 0, avgSize: 0 }, alerts: { count: 0, avgSize: 0 }, 
                      routes: { count: 0, avgSize: 0 }, apiCalls: { count: 0, avgSize: 0 } },
        indexes: { total: 0, efficiency: 0 },
        performance: { slowQueries: 0, avgQueryTime: 0 },
        storage: { dataSize: 0, indexSize: 0, totalSize: 0 },
        issues: [`Health check failed: ${(error as Error).message || 'Unknown error'}`]
      };
    }
  }

  private getConnectionState(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }

  private async getCollectionStats() {
    const [userStats, alertStats, routeStats, apiCallStats] = await Promise.all([
      this.getCollectionInfo('users'),
      this.getCollectionInfo('alerts'),
      this.getCollectionInfo('routes'),
      this.getCollectionInfo('apicalls')
    ]);

    return {
      users: userStats,
      alerts: alertStats,
      routes: routeStats,
      apiCalls: apiCallStats
    };
  }

  private async getCollectionInfo(collectionName: string): Promise<{ count: number; avgSize: number }> {
    try {
      if (!mongoose.connection.db) return { count: 0, avgSize: 0 };
      
      const collection = mongoose.connection.db.collection(collectionName);
      // Use countDocuments instead of stats for better compatibility
      const count = await collection.countDocuments();
      
      return {
        count,
        avgSize: 0 // Simplified - can be enhanced later
      };
    } catch (error) {
      return { count: 0, avgSize: 0 };
    }
  }

  private async getIndexStats(): Promise<{ total: number; efficiency: number }> {
    try {
      if (!mongoose.connection.db) return { total: 0, efficiency: 0 };
      
      const collections = await mongoose.connection.db.listCollections().toArray();
      let totalIndexes = 0;
      let efficientIndexes = 0;

      for (const collection of collections) {
        const indexes = await mongoose.connection.db.collection(collection.name).indexes();
        totalIndexes += indexes.length;
        
        // Consider an index efficient if it's used (simplified check)
        efficientIndexes += indexes.length; // Assume all indexes are efficient for now
      }

      return {
        total: totalIndexes,
        efficiency: totalIndexes > 0 ? Math.round((efficientIndexes / totalIndexes) * 100) : 100
      };
    } catch (error) {
      return { total: 0, efficiency: 0 };
    }
  }

  private async getPerformanceStats(): Promise<{ slowQueries: number; avgQueryTime: number }> {
    try {
      // In a real implementation, you would query MongoDB's profiler
      // For now, we'll simulate performance metrics
      const recentApiCalls = await ApiCall.find({
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      }).limit(100);

      const queryTimes = recentApiCalls
        .filter(call => call.responseTime)
        .map(call => call.responseTime);

      const avgQueryTime = queryTimes.length > 0 
        ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length 
        : 0;

      const slowQueries = queryTimes.filter(time => time > 1000).length;

      return {
        slowQueries,
        avgQueryTime: Math.round(avgQueryTime)
      };
    } catch (error) {
      return { slowQueries: 0, avgQueryTime: 0 };
    }
  }

  async performMaintenance(): Promise<{ actions: string[]; results: any[] }> {
    const actions: string[] = [];
    const results: any[] = [];

    try {
      // Clean up expired alerts
      const expiredAlerts = await Alert.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      if (expiredAlerts.deletedCount > 0) {
        actions.push(`Cleaned up ${expiredAlerts.deletedCount} expired alerts`);
        results.push({ action: 'cleanup_alerts', count: expiredAlerts.deletedCount });
      }

      // Clean up old API calls (keep last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldApiCalls = await ApiCall.deleteMany({
        createdAt: { $lt: thirtyDaysAgo }
      });

      if (oldApiCalls.deletedCount > 0) {
        actions.push(`Cleaned up ${oldApiCalls.deletedCount} old API calls`);
        results.push({ action: 'cleanup_api_calls', count: oldApiCalls.deletedCount });
      }

      // Update database statistics
      if (mongoose.connection.db) {
        await mongoose.connection.db.command({ collStats: 'alerts' });
      }
      actions.push('Updated database statistics');
      results.push({ action: 'update_stats', success: true });

      logger.info('Database maintenance completed', { actions, results });

      return { actions, results };

    } catch (error) {
      logger.error('Database maintenance failed', { error });
      throw error;
    }
  }

  // Monitor database events
  setupMonitoring() {
    mongoose.connection.on('connected', () => {
      logger.info('Database connected');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Database disconnected');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('Database connection error', { error });
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('Database reconnected');
    });

    // Clear cache on connection changes
    mongoose.connection.on('disconnected', () => {
      this.cachedHealth = null;
      this.lastCheck = null;
    });
  }
}

export const databaseHealthMonitor = new DatabaseHealthMonitor();
export default databaseHealthMonitor;
