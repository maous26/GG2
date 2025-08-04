"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedEmailService = void 0;
const emailService_1 = require("./emailService");
class EnhancedEmailService extends emailService_1.EmailService {
    constructor(pool, redis, aiAgent) {
        super(pool);
        this.redis = redis;
        this.aiAgent = aiAgent;
    }
    /**
     * Sends a personalized email with AI-enhanced content
     */
    async sendPersonalizedEmail(userId, type) {
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
        }
        catch (error) {
            console.error('Error sending personalized email:', error);
            throw error;
        }
    }
    /**
     * Sends a batch of emails to a group
     */
    async sendGroupEmail(groupId, options) {
        try {
            // Get group data
            const { rows: [group] } = await this.pool.query(`
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
        }
        catch (error) {
            console.error('Error sending group email:', error);
            throw error;
        }
    }
    /**
     * Sends a batch of price alert emails
     */
    async sendPriceAlerts(alerts) {
        try {
            for (const alert of alerts) {
                const { rows: [user] } = await this.pool.query(`
          SELECT email, first_name, subscription_type
          FROM users
          WHERE id = $1
        `, [alert.userId]);
                if (!user)
                    continue;
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
        }
        catch (error) {
            console.error('Error sending price alerts:', error);
            throw error;
        }
    }
    async checkGroupRateLimit(group) {
        if (!group.lastSent)
            return true;
        const hoursSinceLastSent = Math.abs(new Date().getTime() - new Date(group.lastSent).getTime()) / 36e5;
        // Minimum 24 hours between group emails
        return hoursSinceLastSent >= 24;
    }
    async trackEmailSent(userId, type) {
        await this.pool.query(`
      INSERT INTO email_logs (user_id, type, sent_at)
      VALUES ($1, $2, NOW())
    `, [userId, type]);
    }
    async trackAlertSent(userId, origin, destination) {
        await this.pool.query(`
      INSERT INTO alert_logs (user_id, origin, destination, sent_at)
      VALUES ($1, $2, $3, NOW())
    `, [userId, origin, destination]);
    }
    getSubjectByType(type, firstName) {
        const subjects = {
            welcome: `👋 Bienvenue ${firstName} !`,
            promo: `🎉 Offre spéciale pour vous, ${firstName}`,
            digest: `✈️ Vos opportunités de voyage, ${firstName}`,
            reminder: `🔔 Ne manquez pas ces offres, ${firstName}`
        };
        return subjects[type] || 'GlobeGenius';
    }
    generateSearchLink(opt) {
        const baseUrl = 'https://www.skyscanner.fr/transport/vols';
        const from = opt.origin;
        const to = opt.destination;
        const depart = opt.departureDate.toISOString().split('T')[0];
        const ret = opt.returnDate.toISOString().split('T')[0];
        return `${baseUrl}/${from}/${to}/${depart}/${ret}`;
    }
}
exports.EnhancedEmailService = EnhancedEmailService;
