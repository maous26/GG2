import { logger, securityLogger } from '../config/logger';
import User from '../models/User';
import { ApiCall } from '../models/ApiCall';
import mongoose from 'mongoose';

export interface SecurityEvent {
  type: 'login_attempt' | 'failed_auth' | 'suspicious_activity' | 'admin_access' | 'rate_limit' | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  details: any;
  timestamp: Date;
}

export interface SecurityReport {
  period: { start: Date; end: Date };
  summary: {
    totalEvents: number;
    criticalEvents: number;
    highSeverityEvents: number;
    uniqueIPs: number;
    suspiciousIPs: string[];
  };
  events: SecurityEvent[];
  recommendations: string[];
}

class SecurityAuditService {
  private events: SecurityEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Set<string>();

  // Log security event
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    this.events.push(securityEvent);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to file
    securityLogger.info('Security Event', securityEvent);

    // Check for patterns
    this.analyzePattern(securityEvent);

    // Auto-block critical threats
    if (event.severity === 'critical') {
      this.handleCriticalThreat(securityEvent);
    }
  }

  // Analyze patterns for suspicious behavior
  private analyzePattern(event: SecurityEvent): void {
    const recentEvents = this.events.filter(e => 
      e.ip === event.ip && 
      Date.now() - e.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    // Multiple failed login attempts
    if (event.type === 'failed_auth' && recentEvents.filter(e => e.type === 'failed_auth').length >= 5) {
      this.suspiciousIPs.add(event.ip);
      this.logEvent({
        type: 'suspicious_activity',
        severity: 'high',
        ip: event.ip,
        userAgent: event.userAgent,
        details: {
          reason: 'Multiple failed login attempts',
          attemptCount: recentEvents.length,
          timeWindow: '5 minutes'
        }
      });
    }

    // Rapid requests from same IP
    if (recentEvents.length > 100) {
      this.suspiciousIPs.add(event.ip);
      this.logEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        ip: event.ip,
        userAgent: event.userAgent,
        details: {
          reason: 'Rapid requests detected',
          requestCount: recentEvents.length,
          timeWindow: '5 minutes'
        }
      });
    }

    // Admin access from new IP
    if (event.type === 'admin_access') {
      const adminEvents = this.events.filter(e => 
        e.type === 'admin_access' && 
        e.userId === event.userId
      );
      
      const knownIPs = [...new Set(adminEvents.map(e => e.ip))];
      
      if (!knownIPs.includes(event.ip)) {
        this.logEvent({
          type: 'suspicious_activity',
          severity: 'high',
          ip: event.ip,
          userAgent: event.userAgent,
          userId: event.userId,
          details: {
            reason: 'Admin access from new IP address',
            knownIPs: knownIPs.slice(-5) // Last 5 known IPs
          }
        });
      }
    }
  }

  // Handle critical security threats
  private handleCriticalThreat(event: SecurityEvent): void {
    // Block IP temporarily
    this.blockedIPs.add(event.ip);
    
    // Send immediate alert
    securityLogger.error('CRITICAL SECURITY THREAT', {
      event,
      action: 'IP_BLOCKED',
      timestamp: new Date().toISOString()
    });

    // Remove block after 1 hour
    setTimeout(() => {
      this.blockedIPs.delete(event.ip);
      securityLogger.info('IP unblocked', { ip: event.ip });
    }, 60 * 60 * 1000);
  }

  // Check if IP is blocked
  isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  // Check if IP is suspicious
  isSuspicious(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  // Generate security report
  async generateReport(startDate: Date, endDate: Date): Promise<SecurityReport> {
    const periodEvents = this.events.filter(event => 
      event.timestamp >= startDate && event.timestamp <= endDate
    );

    const criticalEvents = periodEvents.filter(e => e.severity === 'critical').length;
    const highSeverityEvents = periodEvents.filter(e => e.severity === 'high').length;
    const uniqueIPs = [...new Set(periodEvents.map(e => e.ip))];
    
    // Identify suspicious IPs in this period
    const ipEventCounts = new Map<string, number>();
    periodEvents.forEach(event => {
      ipEventCounts.set(event.ip, (ipEventCounts.get(event.ip) || 0) + 1);
    });

    const suspiciousIPs = Array.from(ipEventCounts.entries())
      .filter(([ip, count]) => count > 50 || this.suspiciousIPs.has(ip))
      .map(([ip]) => ip);

    // Generate recommendations
    const recommendations = this.generateRecommendations(periodEvents);

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents: periodEvents.length,
        criticalEvents,
        highSeverityEvents,
        uniqueIPs: uniqueIPs.length,
        suspiciousIPs
      },
      events: periodEvents.slice(-100), // Last 100 events
      recommendations
    };
  }

  // Generate security recommendations
  private generateRecommendations(events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];
    
    const failedAuthCount = events.filter(e => e.type === 'failed_auth').length;
    const suspiciousCount = events.filter(e => e.type === 'suspicious_activity').length;
    const adminAccessCount = events.filter(e => e.type === 'admin_access').length;

    if (failedAuthCount > 100) {
      recommendations.push('Consider implementing CAPTCHA after 3 failed login attempts');
      recommendations.push('Enable two-factor authentication for all users');
    }

    if (suspiciousCount > 50) {
      recommendations.push('Review and strengthen rate limiting policies');
      recommendations.push('Consider implementing IP-based geolocation filtering');
    }

    if (adminAccessCount > 20) {
      recommendations.push('Audit admin access patterns and consider restricting admin access hours');
      recommendations.push('Implement admin session timeout policies');
    }

    const uniqueIPs = [...new Set(events.map(e => e.ip))];
    if (uniqueIPs.length > 1000) {
      recommendations.push('Monitor for potential DDoS activity');
      recommendations.push('Consider implementing progressive rate limiting');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture looks good - maintain current monitoring');
    }

    return recommendations;
  }

  // Get real-time security dashboard data
  getDashboardData() {
    const now = new Date();
    const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const lastHour = this.events.filter(e => e.timestamp >= oneHour);
    const lastDay = this.events.filter(e => e.timestamp >= oneDay);

    return {
      currentThreats: {
        blockedIPs: Array.from(this.blockedIPs),
        suspiciousIPs: Array.from(this.suspiciousIPs),
        activeAlerts: lastHour.filter(e => e.severity === 'critical').length
      },
      metrics: {
        lastHour: {
          totalEvents: lastHour.length,
          failedLogins: lastHour.filter(e => e.type === 'failed_auth').length,
          suspiciousActivity: lastHour.filter(e => e.type === 'suspicious_activity').length
        },
        lastDay: {
          totalEvents: lastDay.length,
          uniqueIPs: [...new Set(lastDay.map(e => e.ip))].length,
          criticalEvents: lastDay.filter(e => e.severity === 'critical').length
        }
      },
      recentEvents: this.events.slice(-10).reverse() // Last 10 events, newest first
    };
  }

  // Check for data breach indicators
  async checkDataBreachIndicators(): Promise<{
    indicators: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }> {
    const indicators: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    try {
      // Check for unusual data access patterns
      const recentApiCalls = await ApiCall.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).limit(1000);

      // Check for mass data export attempts
      const dataExportAttempts = recentApiCalls.filter(call => 
        call.endpoint?.includes('export') || 
        call.endpoint?.includes('download') ||
        call.responseTime > 5000 // > 5 second responses (large data)
      );

      if (dataExportAttempts.length > 10) {
        indicators.push('Unusual data export activity detected');
        riskLevel = 'medium';
      }

      // Check for admin account creation/modification
      const recentUsers = await User.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        subscription_type: 'enterprise'
      });

      if (recentUsers.length > 1) {
        indicators.push('Multiple admin accounts created recently');
        riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      }

      // Check for off-hours admin access
      const adminEvents = this.events.filter(e => 
        e.type === 'admin_access' && 
        Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000
      );

      const offHoursAccess = adminEvents.filter(event => {
        const hour = event.timestamp.getHours();
        return hour < 6 || hour > 22; // Before 6 AM or after 10 PM
      });

      if (offHoursAccess.length > 0) {
        indicators.push('Admin access detected during off-hours');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      const recommendations = this.generateBreachRecommendations(indicators, riskLevel);

      return { indicators, riskLevel, recommendations };

    } catch (error) {
      logger.error('Error checking data breach indicators', { error });
      return {
        indicators: ['Error checking breach indicators'],
        riskLevel: 'medium',
        recommendations: ['Investigate data breach check system']
      };
    }
  }

  private generateBreachRecommendations(indicators: string[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('IMMEDIATE: Disable all admin accounts and investigate');
      recommendations.push('IMMEDIATE: Review all recent data access logs');
      recommendations.push('IMMEDIATE: Change all admin passwords and API keys');
    } else if (riskLevel === 'high') {
      recommendations.push('Review admin access logs for the past 48 hours');
      recommendations.push('Verify identity of recent admin account activities');
      recommendations.push('Consider temporary additional monitoring');
    } else if (riskLevel === 'medium') {
      recommendations.push('Monitor unusual patterns for next 24 hours');
      recommendations.push('Review access logs for anomalies');
    } else {
      recommendations.push('Continue normal security monitoring');
    }

    return recommendations;
  }

  // Clear old events (cleanup)
  cleanup(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp >= oneWeekAgo);
    
    // Clear old suspicious IPs (reset every 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSuspiciousActivity = this.events.filter(e => 
      e.type === 'suspicious_activity' && e.timestamp >= oneDayAgo
    );
    
    this.suspiciousIPs.clear();
    recentSuspiciousActivity.forEach(event => {
      if (event.ip) this.suspiciousIPs.add(event.ip);
    });

    logger.info('Security audit cleanup completed', {
      eventsRetained: this.events.length,
      suspiciousIPs: this.suspiciousIPs.size,
      blockedIPs: this.blockedIPs.size
    });
  }
}

export const securityAudit = new SecurityAuditService();
export { SecurityAuditService };
export default securityAudit;
