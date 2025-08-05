import { Request, Response, NextFunction } from 'express';

// Fallback logger implementation
let logger: any;
try {
  logger = require('../config/logger').logger;
} catch (error) {
  // Fallback to console logging
  logger = {
    error: (message: string, meta?: any) => {
      console.error(`[ERROR] ${message}`, meta || '');
    },
    info: (message: string, meta?: any) => {
      console.log(`[INFO] ${message}`, meta || '');
    },
    warn: (message: string, meta?: any) => {
      console.warn(`[WARN] ${message}`, meta || '');
    }
  };
}

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  keyPattern?: any;
  details?: any;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`${req.method} ${req.path}`, {
    error: error.message,
    stack: error.stack,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { ...error, message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    error = { ...error, message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const validationErr = err as any;
    const message = Object.values(validationErr.errors || {}).map((val: any) => val.message);
    error = { ...error, message: message.join(', '), statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { ...error, message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { ...error, message, statusCode: 401 };
  }

  // Rate limit errors
  if (err.name === 'TooManyRequestsError') {
    const message = 'Too many requests, please try again later';
    error = { ...error, message, statusCode: 429 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);
