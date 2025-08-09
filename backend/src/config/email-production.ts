/**
 * Production Email Configuration for Enhanced Email Alert System
 * Supports multiple email service providers for production deployment
 */

export interface EmailProviderConfig {
  provider: 'smtp' | 'sendgrid' | 'aws-ses';
  config: any;
}

export interface ProductionEmailConfig {
  enabled: boolean;
  provider: EmailProviderConfig;
  templates: {
    enhancedPriceAlert: {
      htmlTemplate: string;
      textTemplate: string;
    };
  };
  tracking: {
    enableOpens: boolean;
    enableClicks: boolean;
    webhookUrl?: string;
  };
  rateLimiting: {
    emailsPerHour: number;
    emailsPerDay: number;
  };
}

/**
 * Get production email configuration based on environment
 */
export function getProductionEmailConfig(): ProductionEmailConfig {
  const provider = process.env.EMAIL_PROVIDER as EmailProviderConfig['provider'] || 'smtp';
  
  const baseConfig: ProductionEmailConfig = {
    enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_EMAIL_SENDING === 'true',
    provider: {
      provider,
      config: getProviderConfig(provider)
    },
    templates: {
      enhancedPriceAlert: {
        htmlTemplate: 'enhanced-price-alert-html',
        textTemplate: 'enhanced-price-alert-text'
      }
    },
    tracking: {
      enableOpens: true,
      enableClicks: true,
      webhookUrl: process.env.EMAIL_WEBHOOK_URL
    },
    rateLimiting: {
      emailsPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_HOUR || '100'),
      emailsPerDay: parseInt(process.env.EMAIL_RATE_LIMIT_DAY || '1000')
    }
  };

  return baseConfig;
}

/**
 * Get provider-specific configuration
 */
function getProviderConfig(provider: EmailProviderConfig['provider']) {
  switch (provider) {
    case 'sendgrid':
      return {
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.FROM_EMAIL || 'alerts@globegenius.app',
        fromName: process.env.FROM_NAME || 'GlobeGenius Alerts'
      };
      
    case 'aws-ses':
      return {
        region: process.env.AWS_REGION || 'eu-west-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        fromEmail: process.env.FROM_EMAIL || 'alerts@globegenius.app',
        fromName: process.env.FROM_NAME || 'GlobeGenius Alerts'
      };
      
    case 'smtp':
    default:
      return {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        fromEmail: process.env.FROM_EMAIL || 'alerts@globegenius.app',
        fromName: process.env.FROM_NAME || 'GlobeGenius Alerts'
      };
  }
}

/**
 * Email provider validation
 */
export function validateEmailConfig(config: ProductionEmailConfig): boolean {
  if (!config.enabled) return true;

  const { provider } = config.provider;
  const providerConfig = config.provider.config;

  switch (provider) {
    case 'sendgrid':
      return !!(providerConfig.apiKey && providerConfig.fromEmail);
      
    case 'aws-ses':
      return !!(providerConfig.accessKeyId && providerConfig.secretAccessKey && providerConfig.fromEmail);
      
    case 'smtp':
      return !!(providerConfig.host && providerConfig.auth?.user && providerConfig.fromEmail);
      
    default:
      return false;
  }
}
