import winston from 'winston';
import path from 'path';
import morgan from 'morgan';

const logDir = path.join(__dirname, '../../logs');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    return `${info.timestamp} [${info.level}]: ${info.message}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'globegenius-backend' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add performance logging
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'performance' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'performance.log'),
      maxsize: 5242880,
      maxFiles: 3
    })
  ]
});

// Add security logging
export const securityLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'security.log'),
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// HTTP request logging
export const httpLogger = morgan(
  (tokens, req: any, res: any) => {
    // Clone the query object to avoid "TypeError: Cannot set property query of #<IncomingMessage> which has only a getter"
    const query = { ...req.query };

    // Remove sensitive data from the log
    if (query.password) {
      delete query.password;
    }
    if (req.body && req.body.password) {
      delete req.body.password;
    }

    const logEntry = {
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: Number(tokens.status(req, res)),
      contentLength: tokens.res(req, res, 'content-length'),
      responseTime: Number(tokens['response-time'](req, res)),
      ip: req.ip,
      userAgent: tokens['user-agent'](req, res),
      params: req.params,
      query: query, // Use the cloned query object
      body: req.body,
      service: 'globegenius-backend',
    };

    // Log the request details
    logger.info(JSON.stringify(logEntry));

    return null;
  }
);

export default logger;
