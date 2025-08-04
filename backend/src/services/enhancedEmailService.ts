// ===== backend/src/services/enhancedEmailService.ts =====
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { AIAgentService } from './aiAgentService';
import { EmailService, EmailOptions } from './emailService';

interface EmailGroup {
  id: string;
  name: string;
  description: string;
  subscribers: string[];
  lastSent?: Date;
}

export class EnhancedEmailService extends EmailService {
  constructor(
    pool: Pool,
    private readonly redis: Redis,
    private readonly aiAgent: AIAgentService
  ) {
    super(pool);
  }

  /**
   * Sends a personalized email with AI-enhanced content
   */
  public async sendPersonalizedEmail(userId: string, type: string): Promise<void> {
    try {
      // Get user data
      const { rows: [user] } = await this.pool.query(`
        SELECT email, first_name, subscription_type
        FROM users
        WHERE id = $1
      `, [userId]);

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      // Generate personalized content
      const content = await this.aiAgent.generatePersonalizedContent(userId, type);
      
      // Send email
      await this.sendTransactionalEmail({
        to: user.email,
        subject: this.getSubjectByType(type, user.first_name),
        template: 'personalized',
        data: {
          firstName: user.first_name,
          content,
          subscriptionType: user.subscription_type
        }
      });
      
      // Track email sent
      await this.trackEmailSent(userId, type);
      
    } catch (error) {
      console.error('Error sending personalized email:', error);
      throw error;
    }
  }
  
  /**
   * Sends a batch of emails to a group
   */
  public async sendGroupEmail(groupId: string, options: EmailOptions): Promise<void> {
    try {
      // Get group data
      const { rows: [group] } = await this.pool.query<EmailGroup>(`
        SELECT * FROM email_groups WHERE id = $1
      `, [groupId]);

      if (!group) {
        throw new Error(`Group not found: ${groupId}`);
  }
  
      // Check rate limits
      const canSend = await this.checkGroupRateLimit(group);
      if (!canSend) {
        throw new Error(`Rate limit exceeded for group: ${group.name}`);
      }

      // Send to each subscriber
      for (const subscriberId of group.subscribers) {
        await this.sendTransactionalEmail({
          ...options,
          to: subscriberId
        });
            }

      // Update last sent timestamp
      await this.pool.query(`
        UPDATE email_groups
        SET last_sent = NOW()
        WHERE id = $1
      `, [groupId]);

    } catch (error) {
      console.error('Error sending group email:', error);
      throw error;
    }
  }

  /**
   * Sends a batch of price alert emails
   */
  public async sendPriceAlerts(alerts: Array<{
    userId: string;
    origin: string;
    destination: string;
    price: number;
    discount: number;
    departureDate: Date;
    returnDate: Date;
    airline: string;
  }>): Promise<void> {
    try {
      for (const alert of alerts) {
        const { rows: [user] } = await this.pool.query(`
          SELECT email, first_name, subscription_type
          FROM users
          WHERE id = $1
        `, [alert.userId]);

        if (!user) continue;

        await this.sendTransactionalEmail({
          to: user.email,
          subject: `✈️ Prix en baisse : ${alert.origin} → ${alert.destination} (-${Math.round(alert.discount)}%)`,
          template: 'price-alert',
          data: {
            firstName: user.first_name,
            origin: alert.origin,
            destination: alert.destination,
            price: alert.price,
            discount: alert.discount,
            departureDate: alert.departureDate,
            returnDate: alert.returnDate,
            airline: alert.airline,
            searchLink: this.generateSearchLink(alert)
          }
        });

        // Track alert sent
        await this.trackAlertSent(alert.userId, alert.origin, alert.destination);
      }
    } catch (error) {
      console.error('Error sending price alerts:', error);
      throw error;
    }
  }

  private async checkGroupRateLimit(group: EmailGroup): Promise<boolean> {
    if (!group.lastSent) return true;

    const hoursSinceLastSent = Math.abs(
      new Date().getTime() - new Date(group.lastSent).getTime()
    ) / 36e5;

    // Minimum 24 hours between group emails
    return hoursSinceLastSent >= 24;
  }

  private async trackEmailSent(userId: string, type: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO email_logs (user_id, type, sent_at)
      VALUES ($1, $2, NOW())
    `, [userId, type]);
  }
  
  private async trackAlertSent(userId: string, origin: string, destination: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO alert_logs (user_id, origin, destination, sent_at)
      VALUES ($1, $2, $3, NOW())
    `, [userId, origin, destination]);
  }
  
  private getSubjectByType(type: string, firstName: string): string {
    const subjects: Record<string, string> = {
      welcome: `👋 Bienvenue ${firstName} !`,
      promo: `🎉 Offre spéciale pour vous, ${firstName}`,
      digest: `✈️ Vos opportunités de voyage, ${firstName}`,
      reminder: `🔔 Ne manquez pas ces offres, ${firstName}`
    };
    return subjects[type] || 'GlobeGenius';
  }
  
  protected generateSearchLink(opt: {
    origin: string;
    destination: string;
    departureDate: Date;
    returnDate: Date;
  }): string {
    const baseUrl = 'https://www.skyscanner.fr/transport/vols';
    const from = opt.origin;
    const to = opt.destination;
    const depart = opt.departureDate.toISOString().split('T')[0];
    const ret = opt.returnDate.toISOString().split('T')[0];
    
    return `${baseUrl}/${from}/${to}/${depart}/${ret}`;
  }
}