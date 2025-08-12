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

        // Build proposed itineraries under constraints (>= J+30, <= 9 months, min stay by region)
        const proposedItins = this.buildProposedItineraries(alert.origin, alert.destination);

        // Enhanced content (structured)
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

        // Minimal HTML template focusing on essentials + proposed date options
        const html = this.generateAlertEmailHtml({
          ...emailContent,
          proposedItins
        });

        // Simple A/B subject testing
        const variant = Math.random() < 0.5 ? 'A' : 'B';
        const subjectA = `✈️ ${alert.airline} ${alert.origin} → ${alert.destination} : €${alert.price} (-${Math.round(alert.discount)}%)`;
        const subjectB = `💥 ${Math.round(alert.discount)}% de réduction • ${alert.origin} → ${alert.destination} à €${alert.price}`;
        const subject = variant === 'A' ? subjectA : subjectB;

        await this.sendTransactionalEmail({
          to: user.email,
          subject,
          template: html,
          data: {}
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
   * Generate proposed date options under constraints
   * - departure >= J+30, <= 9 months
   * - min stay: Europe/North Africa 7d, otherwise 10d
   */
  private buildProposedItineraries(origin: string, destination: string): Array<{ label: string; depart: string; ret: string; days: number }>{
    const today = new Date();
    const addDays = (d: Date, n: number) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR');

    // naive geo check: consider Europe/North Africa short-haul
    const shortHaul = ['LHR','AMS','FCO','BCN','MAD','LIS','BER','VIE','BUD','CMN','RAK','TUN','ALG','FES','OUD','AGA'].includes(destination);
    const esPt = new Set(['MAD','BCN','AGP','PMI','IBZ','VLC','SVQ','TFS','TFN','LPA','ACE','FUE','BIO','XRY','MAH','LIS','OPO','FAO','FNC','PDL']);
    const minStay = esPt.has(destination) ? 5 : (shortHaul ? 7 : 10);

    const start1 = addDays(today, 30 + 15); // J+45
    const start2 = addDays(today, 30 + 40); // J+70
    const start3 = addDays(today, 30 + 65); // J+95

    const opt = (start: Date, days: number) => ({ label: `Option`, depart: fmt(start), ret: fmt(addDays(start, days)), days });
    return [
      opt(start1, minStay),
      opt(start2, minStay + 2),
      opt(start3, minStay + 4)
    ];
  }

  /** Simple, condensed HTML email rendering */
  private generateAlertEmailHtml(payload: any): string {
    const itineraryList = (payload.proposedItins || []).map((i: any) => `<li>${i.depart} → ${i.ret} (${i.days} jours)</li>`).join('');
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Alerte Prix</title>
    <style>body{margin:0;background:#f6f8fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a}
    .wrap{max-width:680px;margin:0 auto;padding:20px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:12px 0}
    .hdr{background:linear-gradient(135deg,#0f172a,#1e3a8a 55%,#3b82f6);color:#fff;border-radius:12px;padding:18px}.title{margin:0;font-weight:900;font-size:20px}
    .sub{margin:6px 0 0;opacity:.95}.row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed #e5e7eb}
    .row:last-child{border-bottom:0}.k{color:#6b7280;font-size:13px}.v{font-weight:700}.cta{display:inline-block;margin-top:8px;padding:12px 16px;border-radius:10px;background:#3b82f6;color:#fff;text-decoration:none;font-weight:800}
    .muted{color:#6b7280;font-size:12px;margin-top:8px}</style></head><body>
    <div class="wrap">
    <div class="hdr"><h1 class="title">🌍 GlobeGenius — Alerte Prix</h1><p class="sub">${payload.origin} → ${payload.destination} • ${payload.airline}</p></div>
    <div class="card">
      <div class="row"><span class="k">Prix</span><span class="v">€${payload.price}</span></div>
      <div class="row"><span class="k">Réduction</span><span class="v">-${payload.discount}%</span></div>
      <div class="row"><span class="k">Prix habituel</span><span class="v">€${payload.originalPrice}</span></div>
      <div class="row"><span class="k">Économies estimées</span><span class="v">€${payload.savings}</span></div>
    </div>
    <div class="card">
      <h3 style="margin:0 0 8px">📅 Dates proposées</h3>
      <ul>${itineraryList}</ul>
      <a class="cta" href="${payload.searchLink}" target="_blank" rel="noopener">Voir & réserver</a>
      <p class="muted">Départs ≥ J+30, ≤ 9 mois • Europe/Nord Afrique: 7 jours min • Long‑courrier: 10 jours min.</p>
    </div>
    <div class="card">
      <h3 style="margin:0 0 8px">🧳 Bagages (${payload.airline})</h3>
      <pre style="white-space:pre-line;margin:0">${payload.baggagePolicyText}</pre>
    </div>
    <p class="muted">Gérez vos préférences: http://localhost:3000/dashboard • Support: contact@globegenius.app</p>
    </div></body></html>`;
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