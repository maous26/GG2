import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

import { SES } from 'aws-sdk';
import { EnhancedEmailService } from '../services/enhancedEmailService';
import { getProductionEmailConfig, validateEmailConfig } from '../config/email-production';

/**
 * Production Email Service with real email delivery
 * Extends EnhancedEmailService with actual email provider integration
 */
export class ProductionEmailService extends EnhancedEmailService {
  private emailConfig = getProductionEmailConfig();
  private transporter: any;

  constructor(pool: any, redis: any, aiAgent: any) {
    super(pool, redis, aiAgent);
    this.initializeEmailProvider();
  }

  /**
   * Initialize the email provider based on configuration
   */
  private async initializeEmailProvider(): Promise<void> {
    if (!validateEmailConfig(this.emailConfig)) {
      console.warn('⚠️ Email configuration invalid - emails will be logged only');
      return;
    }

    const { provider, config } = this.emailConfig.provider;

    try {
      switch (provider) {
        case 'sendgrid':
          sgMail.setApiKey(config.apiKey);
          console.log('✅ SendGrid email provider initialized');
          break;

        case 'aws-ses':
          const sesConfig = {
            region: config.region,
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey
          };
          this.transporter = new SES(sesConfig);
          console.log('✅ AWS SES email provider initialized');
          break;

        case 'smtp':
          this.transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth
          });
          console.log('✅ SMTP email provider initialized');
          break;
      }
    } catch (error) {
      console.error('❌ Failed to initialize email provider:', error);
    }
  }

  /**
   * Send actual emails with production providers
   */
  protected async sendTransactionalEmail(options: {
    to: string;
    subject: string;
    template: string;
    data: any;
  }): Promise<void> {
    if (!this.emailConfig.enabled) {
      console.log('📧 Email sending disabled - would send:', options.subject, 'to', options.to);
      return;
    }

    const htmlContent = this.generateHtmlContent(options.template, options.data);
    const textContent = this.generateTextContent(options.template, options.data);

    try {
      await this.sendWithProvider({
        to: options.to,
        subject: options.subject,
        html: htmlContent,
        text: textContent
      });

      console.log(`✅ Email sent successfully to ${options.to}: ${options.subject}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Send email using the configured provider
   */
  private async sendWithProvider(emailData: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const { provider, config } = this.emailConfig.provider;

    switch (provider) {
      case 'sendgrid':
        await this.sendWithSendGrid(emailData, config);
        break;

      case 'aws-ses':
        await this.sendWithAWSSES(emailData, config);
        break;

      case 'smtp':
        await this.sendWithSMTP(emailData, config);
        break;

      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendWithSendGrid(emailData: any, config: any): Promise<void> {
    const msg = {
      to: emailData.to,
      from: {
        email: config.fromEmail,
        name: config.fromName
      },
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      trackingSettings: {
        clickTracking: {
          enable: this.emailConfig.tracking.enableClicks
        },
        openTracking: {
          enable: this.emailConfig.tracking.enableOpens
        }
      }
    };

    await sgMail.send(msg);
  }

  /**
   * Send email via AWS SES
   */
  private async sendWithAWSSES(emailData: any, config: any): Promise<void> {
    const params = {
      Source: `${config.fromName} <${config.fromEmail}>`,
      Destination: {
        ToAddresses: [emailData.to]
      },
      Message: {
        Subject: {
          Data: emailData.subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: emailData.html,
            Charset: 'UTF-8'
          },
          Text: {
            Data: emailData.text,
            Charset: 'UTF-8'
          }
        }
      }
    };

    await this.transporter.sendEmail(params).promise();
  }

  /**
   * Send email via SMTP
   */
  private async sendWithSMTP(emailData: any, config: any): Promise<void> {
    const mailOptions = {
      from: `${config.fromName} <${config.fromEmail}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Generate HTML content from template and data
   */
  private generateHtmlContent(template: string, data: any): string {
    if (template === 'enhanced-price-alert') {
      return this.generateEnhancedAlertHtmlTemplate(data);
    }
    return `<html><body><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
  }

  /**
   * Generate text content from template and data
   */
  private generateTextContent(template: string, data: any): string {
    if (template === 'enhanced-price-alert') {
      return this.generateEnhancedAlertTextTemplate(data);
    }
    return JSON.stringify(data, null, 2);
  }

  /**
   * Generate professional HTML email template for enhanced alerts
   */
  private generateEnhancedAlertHtmlTemplate(data: any): string {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alerte Prix GlobeGenius</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
        .flight-card { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .price-highlight { background: #28a745; color: white; padding: 10px; border-radius: 5px; text-align: center; font-size: 1.2em; margin: 10px 0; }
        .baggage-section { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 15px 0; }
        .baggage-item { margin: 10px 0; padding: 8px; background: white; border-radius: 5px; }
        .tip-section { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        .cta-button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; }
        .icon { font-size: 1.2em; margin-right: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✈️ Alerte Prix GlobeGenius</h1>
            <p>Bonjour ${data.firstName},</p>
        </div>

        <div class="flight-card">
            <h2>🎉 Excellent Deal Détecté!</h2>
            <p><strong>Route:</strong> ${data.origin} → ${data.destination}</p>
            <p><strong>Compagnie:</strong> ${data.airline}</p>
            <p><strong>Dates:</strong> ${data.departureDate} - ${data.returnDate}</p>
            
            <div class="price-highlight">
                <strong>€${data.price}</strong> (au lieu de €${data.originalPrice})
                <br>
                <small>${data.savingsMessage}</small>
            </div>
        </div>

        <div class="baggage-section">
            <h3>🧳 Politique Bagages ${data.airline}</h3>
            ${data.baggagePolicyText.split('\n').map((line: string) => `<div class="baggage-item">${line}</div>`).join('')}
        </div>

        <div class="tip-section">
            <h3>💡 Conseil Expert</h3>
            <p>${data.baggagePolicyText.split('💡 CONSEIL PRATIQUE:')[1] || 'Vérifiez les conditions de la compagnie avant réservation.'}</p>
        </div>

        <div style="text-align: center;">
            <a href="${data.searchLink}" class="cta-button">🔍 Réserver Maintenant</a>
        </div>

        <div class="footer">
            <p>Cet email a été envoyé par GlobeGenius - L'assistant voyage intelligent</p>
            <p>🌍 Voyagez malin, voyagez informé</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate text email template for enhanced alerts
   */
  private generateEnhancedAlertTextTemplate(data: any): string {
    return `
✈️ ALERTE PRIX GLOBEGENIUS ✈️

Bonjour ${data.firstName},

🎉 EXCELLENTE NOUVELLE !
Nous avons trouvé un vol à prix réduit correspondant à vos critères :

✈️ VOL DÉTECTÉ:
• Route: ${data.origin} → ${data.destination}
• Compagnie: ${data.airline}
• Prix: €${data.price} (au lieu de €${data.originalPrice})
• ${data.savingsMessage}
• Dates: ${data.departureDate} - ${data.returnDate}

${data.baggagePolicyText}

🔗 RÉSERVER MAINTENANT:
${data.searchLink}

---
GlobeGenius - L'assistant voyage intelligent
🌍 Voyagez malin, voyagez informé
`;
  }
}
