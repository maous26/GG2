import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

// Custom Joi extensions for our use cases
const customJoi = Joi.extend({
  type: 'string',
  base: Joi.string(),
  messages: {
    'string.iata': '{{#label}} must be a valid IATA airport code',
    'string.email.domain': '{{#label}} must be from an allowed domain'
  },
  rules: {
    iata: {
      method() {
        return this.$_addRule({ name: 'iata' });
      },
      validate(value, helpers) {
        if (!/^[A-Z]{3}$/.test(value)) {
          return helpers.error('string.iata');
        }
        return value;
      }
    },
    allowedEmailDomain: {
      method(domains: string[]) {
        return this.$_addRule({ name: 'allowedEmailDomain', args: { domains } });
      },
      validate(value, helpers, args) {
        const domain = value.split('@')[1];
        if (!args.domains.includes(domain)) {
          return helpers.error('string.email.domain');
        }
        return value;
      }
    }
  }
});

// Validation schemas
export const schemas = {
  // Auth schemas
  login: {
    body: customJoi.object({
      email: customJoi.string().email().required(),
      password: customJoi.string().min(6).required()
    })
  },

  register: {
    body: customJoi.object({
      email: customJoi.string().email().required(),
      password: customJoi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
        .messages({
          'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
        }),
      firstName: customJoi.string().min(2).max(50).required(),
      lastName: customJoi.string().min(2).max(50).required(),
      subscription_type: customJoi.string().valid('free', 'premium', 'enterprise').default('free')
    })
  },

  // Alert schemas
  createAlert: {
    body: customJoi.object({
      origin: customJoi.string().iata().required(),
      destination: customJoi.string().iata().required(),
      maxPrice: customJoi.number().min(1).max(10000).required(),
      minDiscount: customJoi.number().min(0).max(100).default(20),
      departureDate: customJoi.date().min('now').optional(),
      returnDate: customJoi.date().min(Joi.ref('departureDate')).optional(),
      passengerCount: customJoi.number().min(1).max(9).default(1),
      class: customJoi.string().valid('economy', 'business', 'first').default('economy')
    })
  },

  // Route schemas
  createRoute: {
    body: customJoi.object({
      origin: customJoi.string().iata().required(),
      destination: customJoi.string().iata().required(),
      tier: customJoi.number().min(1).max(3).required(),
      targetUserTypes: customJoi.array().items(
        customJoi.string().valid('free', 'premium', 'enterprise')
      ).min(1).required(),
      estimatedMonthlySavings: customJoi.number().min(0).optional(),
      scanFrequencyHours: customJoi.number().min(1).max(168).optional()
    })
  },

  // Admin schemas
  adminStats: {
    query: customJoi.object({
      days: customJoi.number().min(1).max(365).default(30),
      detailed: customJoi.boolean().default(false)
    })
  },

  // Pagination
  pagination: {
    query: customJoi.object({
      page: customJoi.number().min(1).default(1),
      limit: customJoi.number().min(1).max(100).default(20),
      sort: customJoi.string().optional(),
      order: customJoi.string().valid('asc', 'desc').default('desc')
    })
  },

  // ID parameter
  mongoId: {
    params: customJoi.object({
      id: customJoi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
        .messages({
          'string.pattern.base': 'Invalid ID format'
        })
    })
  }
};

// Validation middleware factory
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    // Validate query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      } else {
        // Don't reassign req.query directly, merge the values instead
        Object.assign(req.query, value);
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    if (errors.length > 0) {
      logger.warn('Validation failed', {
        url: req.url,
        method: req.method,
        errors,
        body: req.body,
        query: req.query,
        params: req.params
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
};

// Sanitization middleware
export const sanitize = (req: Request, res: Response, next: NextFunction) => {
  // Remove any undefined values
  if (req.body && typeof req.body === 'object') {
    req.body = JSON.parse(JSON.stringify(req.body));
  }

  // Trim string values
  const trimStrings = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(trimStrings);
    }
    if (obj && typeof obj === 'object') {
      const trimmed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        trimmed[key] = trimStrings(value);
      }
      return trimmed;
    }
    return obj;
  };

  if (req.body && typeof req.body === 'object') {
    try {
      req.body = trimStrings(req.body);
    } catch (error) {
      // If trimming fails, skip it
    }
  }

  // Don't modify req.query as it's read-only in newer Express versions
  next();
};

// File upload validation
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (req: Request & { file?: any }, res: Response, next: NextFunction) => {
    const file = req.file;
    const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
    const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'];

    if (options.required && !file) {
      return res.status(400).json({
        success: false,
        error: 'File is required'
      });
    }

    if (file) {
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
    }

    next();
  };
};
