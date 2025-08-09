// ===== backend/src/services/enhancedEmailService.ts =====
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { AIAgentService } from './aiAgentService';
import { EmailService, EmailOptions } from './emailService';
import { Queue, QueueEvents, Worker, JobsOptions } from 'bullmq';
import { randomUUID } from 'crypto';

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

  private getQueue() {
    const connection = { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } };
    return new Queue('email-send', connection);
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

      // Enqueue each subscriber email (retry, backoff)
      const queue = this.getQueue();
      const jobOptions: JobsOptions = { attempts: 3, backoff: { type: 'exponential', delay: 3000 } };
      for (const subscriberId of group.subscribers) {
        await queue.add('send', { ...options, to: subscriberId }, jobOptions);
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
   * Sends a batch of price alert emails with comprehensive baggage policy information
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
    baggagePolicy?: {
      cabin: { included: boolean; weight: string; dimensions: string; };
      checked: { included: boolean; weight: string; price: number; currency: string; };
      additional: { extraBagPrice: number; sportEquipment: boolean; currency: string; };
    };
  }>): Promise<void> {
    try {
      for (const alert of alerts) {
        const { rows: [user] } = await this.pool.query(`
          SELECT email, first_name, subscription_type
          FROM users
          WHERE id = $1
        `, [alert.userId]);

        if (!user) continue;

        // Per-user daily cap using Redis (max 5/day)
        const capKey = `emailcap:${user.email}:${new Date().toISOString().split('T')[0]}`;
        const sentToday = Number(await this.redis.get(capKey)) || 0;
        if (sentToday >= 5) {
          continue; // skip sending more today
        }

        // Calculate original price and savings
        const originalPrice = Math.round(alert.price / (1 - alert.discount / 100));
        const savings = originalPrice - alert.price;

        // Enhanced email content with baggage policy
        const emailContent = this.generateEnhancedAlertEmailContent({
          firstName: user.first_name,
          origin: alert.origin,
          destination: alert.destination,
          airline: alert.airline,
          price: alert.price,
          originalPrice,
          savings,
          discount: alert.discount,
          departureDate: alert.departureDate,
          returnDate: alert.returnDate,
          searchLink: this.generateSearchLink(alert, {
            source: 'email',
            medium: 'price_alert',
            campaign: 'deal_detection',
            content: `${alert.origin}-${alert.destination}`
          }),
          baggagePolicy: alert.baggagePolicy
        });

        // Simple A/B subject testing
        const variant = Math.random() < 0.5 ? 'A' : 'B';
        const subjectA = `✈️ ${alert.airline} ${alert.origin} → ${alert.destination} : €${alert.price} (-${Math.round(alert.discount)}%)`;
        const subjectB = `💥 ${Math.round(alert.discount)}% de réduction • ${alert.origin} → ${alert.destination} à €${alert.price}`;
        const subject = variant === 'A' ? subjectA : subjectB;

        await this.sendTransactionalEmail({
          to: user.email,
          subject,
          template: 'enhanced-price-alert',
          data: { ...emailContent, variant }
        });

        // Track alert sent
        await this.trackAlertSent(alert.userId, alert.origin, alert.destination);
        await this.redis.set(capKey, String(sentToday + 1), 'EX', 24 * 3600);
      }
    } catch (error) {
      console.error('Error sending enhanced price alerts:', error);
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
  }, utm?: { source?: string; medium?: string; campaign?: string; content?: string }): string {
    return super.generateSearchLink(opt, utm);
  }

  /**
   * Generates enhanced email content with comprehensive baggage policy information
   */
  private generateEnhancedAlertEmailContent(data: {
    firstName: string;
    origin: string;
    destination: string;
    airline: string;
    price: number;
    originalPrice: number;
    savings: number;
    discount: number;
    departureDate: Date;
    returnDate: Date;
    searchLink: string;
    baggagePolicy?: {
      cabin: { included: boolean; weight: string; dimensions: string; };
      checked: { included: boolean; weight: string; price: number; currency: string; };
      additional: { extraBagPrice: number; sportEquipment: boolean; currency: string; };
    };
  }): Record<string, any> {
    const formatCurrency = (amount: number) => `€${amount}`;
    
    // Generate baggage policy text
    let baggagePolicyText = '';
    if (data.baggagePolicy) {
      const policy = data.baggagePolicy;
      
      baggagePolicyText = `
🧳 POLITIQUE BAGAGES ${data.airline}:

🎒 BAGAGE CABINE:
   • ${policy.cabin.included ? 'INCLUS' : 'NON INCLUS'} - ${policy.cabin.weight}
   • Dimensions: ${policy.cabin.dimensions}

🧳 BAGAGE EN SOUTE:
   • ${policy.checked.included ? 'INCLUS dans le tarif' : 'Supplément ' + formatCurrency(policy.checked.price)}
   • Poids: ${policy.checked.weight}

💰 BAGAGES SUPPLÉMENTAIRES:
   • Coût: ${formatCurrency(policy.additional.extraBagPrice)}
   • Équipement sportif: ${policy.additional.sportEquipment ? 'Disponible' : 'Non disponible'}

💡 CONSEIL PRATIQUE:
${this.getAirlineBaggageTip(data.airline)}
`;
    } else {
      baggagePolicyText = `
🧳 INFORMATIONS BAGAGES:
   • Consultez les conditions de ${data.airline} avant votre réservation
   • Vérifiez les dimensions et poids autorisés
`;
    }

    return {
      firstName: data.firstName,
      origin: data.origin,
      destination: data.destination,
      airline: data.airline,
      price: data.price,
      originalPrice: data.originalPrice,
      savings: data.savings,
      discount: Math.round(data.discount),
      departureDate: data.departureDate.toLocaleDateString('fr-FR'),
      returnDate: data.returnDate.toLocaleDateString('fr-FR'),
      searchLink: data.searchLink,
      baggagePolicyText,
      savingsMessage: `Économisez ${formatCurrency(data.savings)} (${Math.round(data.discount)}% de réduction)`,
      priceComparisonText: `Prix normal: ${formatCurrency(data.originalPrice)} | Prix alerte: ${formatCurrency(data.price)}`
    };
  }

  /**
   * Provides airline-specific baggage tips
   */
  private getAirlineBaggageTip(airline: string): string {
    const tips: Record<string, string> = {
      'Air France': 'Air France inclut généralement les bagages sur les vols long-courriers. Vérifiez votre classe tarifaire.',
      'Vueling': 'Vueling est une compagnie low-cost. Le bagage en soute n\'est pas toujours inclus dans le tarif de base.',
      'Turkish Airlines': 'Turkish Airlines offre une allocation bagages généreuse, notamment sur les vols internationaux.',
      'Iberia': 'Iberia inclut généralement un bagage en soute sur les vols internationaux.',
      'Emirates': 'Emirates propose l\'une des meilleures politiques bagages avec des allowances généreuses.',
      'Ryanair': 'Ryanair facture les bagages en soute. Réservez vos bagages à l\'avance pour économiser.',
      'EasyJet': 'EasyJet propose des options bagages flexibles. Ajoutez vos bagages lors de la réservation.',
      'Lufthansa': 'Lufthansa inclut généralement les bagages sur les vols long-courriers selon la classe tarifaire.'
    };
    
    return tips[airline] || `Vérifiez la politique bagages de ${airline} sur leur site officiel avant de réserver.`;
  }
}