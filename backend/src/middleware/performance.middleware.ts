import { Request, Response, NextFunction } from 'express';
import { performanceLogger } from '../config/logger';
import os from 'os';
import v8 from 'v8';

interface PerformanceMetrics {
  requestDuration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeHandles: number;
  activeRequests: number;
}

class PerformanceMonitor {
  private activeRequests = 0;
  private metrics: PerformanceMetrics[] = [];
  private lastCpuUsage = process.cpuUsage();
  private lastTime = Date.now();

  // Performance monitoring middleware
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      const startCpu = process.cpuUsage();
      
      this.activeRequests++;

      res.on('finish', () => {
        this.activeRequests--;
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        const endCpu = process.cpuUsage(startCpu);
        const cpuPercent = (endCpu.user + endCpu.system) / 1000; // Convert to milliseconds
        
        const metrics: PerformanceMetrics = {
          requestDuration: duration,
          memoryUsage: process.memoryUsage(),
          cpuUsage: cpuPercent,
          activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
          activeRequests: this.activeRequests
        };

        // Log slow requests
        if (duration > 1000) {
          performanceLogger.warn('Slow Request Detected', {
            method: req.method,
            url: req.url,
            duration: `${duration.toFixed(2)}ms`,
            statusCode: res.statusCode,
            memoryUsage: `${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
            cpuUsage: `${cpuPercent.toFixed(2)}ms`
          });
        }

        // Store metrics for analysis
        this.metrics.push(metrics);
        
        // Keep only last 1000 metrics
        if (this.metrics.length > 1000) {
          this.metrics.shift();
        }

        // Log performance warnings
        this.checkPerformanceThresholds(metrics, req, res);
      });

      next();
    };
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics, req: Request, res: Response) {
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    
    // Memory usage warning
    if (memoryUsageMB > 512) {
      performanceLogger.warn('High Memory Usage', {
        memoryUsage: `${Math.round(memoryUsageMB)}MB`,
        url: req.url,
        method: req.method
      });
    }

    // High CPU usage warning
    if (metrics.cpuUsage > 100) {
      performanceLogger.warn('High CPU Usage', {
        cpuUsage: `${metrics.cpuUsage.toFixed(2)}ms`,
        url: req.url,
        method: req.method
      });
    }

    // Too many active requests
    if (metrics.activeRequests > 50) {
      performanceLogger.warn('High Concurrent Requests', {
        activeRequests: metrics.activeRequests,
        url: req.url,
        method: req.method
      });
    }
  }

  // Get performance statistics
  getStats() {
    if (this.metrics.length === 0) {
      return null;
    }

    const recent = this.metrics.slice(-100); // Last 100 requests
    const durations = recent.map(m => m.requestDuration);
    const memoryUsages = recent.map(m => m.memoryUsage.heapUsed / 1024 / 1024);
    
    return {
      requests: {
        total: this.metrics.length,
        active: this.activeRequests,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations)
      },
      memory: {
        current: process.memoryUsage(),
        average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        max: Math.max(...memoryUsages),
        v8HeapStats: v8.getHeapStatistics()
      },
      system: {
        uptime: process.uptime(),
        platform: os.platform(),
        cpus: os.cpus().length,
        loadAverage: os.loadavg(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem()
      }
    };
  }

  // Health check endpoint data
  getHealthStatus() {
    const stats = this.getStats();
    if (!stats) {
      return { status: 'unknown', details: 'No metrics available' };
    }

    const memoryUsagePercent = (stats.memory.current.heapUsed / stats.memory.current.heapTotal) * 100;
    const systemMemoryPercent = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
    
    let status = 'healthy';
    const issues = [];

    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      issues.push('High heap memory usage');
    } else if (memoryUsagePercent > 75) {
      status = 'degraded';
      issues.push('Elevated heap memory usage');
    }

    if (systemMemoryPercent > 90) {
      status = 'unhealthy';
      issues.push('High system memory usage');
    } else if (systemMemoryPercent > 80) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push('Elevated system memory usage');
    }

    if (stats.requests.averageDuration > 2000) {
      status = 'unhealthy';
      issues.push('High average response time');
    } else if (stats.requests.averageDuration > 1000) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push('Elevated average response time');
    }

    return {
      status,
      issues: issues.length > 0 ? issues : undefined,
      metrics: {
        memoryUsagePercent: Math.round(memoryUsagePercent),
        systemMemoryPercent: Math.round(systemMemoryPercent),
        averageResponseTime: Math.round(stats.requests.averageDuration),
        activeRequests: stats.requests.active,
        uptime: Math.round(stats.system.uptime)
      }
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
