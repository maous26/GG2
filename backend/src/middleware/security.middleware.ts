import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { securityLogger } from '../config/logger';
import requestIp from 'request-ip';

// Enhanced rate limiting with different limits per endpoint
export const createRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
    max: options.max || 100,
    message: {
      error: options.message || 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skip: (req) => req.method === 'OPTIONS',
    handler: (req, res) => {
      const clientIp = requestIp.getClientIp(req);
      securityLogger.warn('Rate limit exceeded', {
        ip: clientIp,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      res.status(429).json({
        error: options.message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.round(options.windowMs! / 1000) || 900
      });
    }
  });
};

// Rate limiting DISABLED for debugging - allows unlimited auth attempts
export const authRateLimit = (req: any, res: any, next: any) => next();

// All rate limiting DISABLED for debugging - allows unlimited requests
export const adminRateLimit = (req: any, res: any, next: any) => next();
export const adminDashboardRateLimit = (req: any, res: any, next: any) => next();
export const adminActionRateLimit = (req: any, res: any, next: any) => next();
export const apiRateLimit = (req: any, res: any, next: any) => next();

// Slow down middleware for suspicious activity
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skip: (req) => req.method === 'OPTIONS',
  validate: { delayMs: false } // Disable warning
});

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Set security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const clientIp = requestIp.getClientIp(req);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: clientIp,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length') || '0'
    };

    if (res.statusCode >= 400) {
      securityLogger.warn('HTTP Error Response', logData);
    } else if (duration > 5000) {
      securityLogger.warn('Slow Request', logData);
    }
  });
  
  next();
};

// Suspicious activity detection
export const suspiciousActivityDetector = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = requestIp.getClientIp(req);
  const userAgent = req.get('User-Agent') || '';
  const path = req.path;
  
  // Check for common attack patterns
  const suspiciousPatterns = [
    /\.\.\//,  // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // Javascript injection
    /vbscript:/i,  // VBScript injection
    /onload=/i,    // Event handler injection
    /wp-admin/,    // WordPress attacks
    /phpmyadmin/,  // PHPMyAdmin attacks
    /\.env/,       // Environment file access
    /\.git/        // Git file access
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(path) || 
    pattern.test(JSON.stringify(req.query)) || 
    pattern.test(JSON.stringify(req.body))
  );
  
  // Check for bot-like behavior
  const isBotLike = /bot|crawler|spider|scraper/i.test(userAgent) && 
                   !userAgent.includes('Googlebot');
  
  if (isSuspicious || isBotLike) {
    securityLogger.error('Suspicious Activity Detected', {
      ip: clientIp,
      userAgent,
      path,
      method: req.method,
      query: req.query,
      body: req.body,
      headers: req.headers
    });
    
    return res.status(403).json({ 
      error: 'Forbidden: Suspicious activity detected' 
    });
  }
  
  next();
};
