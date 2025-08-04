"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
class EmailService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Sends a transactional email
     */
    async sendTransactionalEmail(options) {
        try {
            // Log the email attempt
            await this.pool.query(`
        INSERT INTO email_logs (recipient, subject, template, sent_at)
        VALUES ($1, $2, $3, NOW())
      `, [options.to, options.subject, options.template]);
            // Here you would integrate with your email service provider
            // For example: SendGrid, Brevo, etc.
            console.log('Sending email:', options);
        }
        catch (error) {
            console.error('Error sending transactional email:', error);
            throw error;
        }
    }
    /**
     * Generates a link to search for flights
     */
    generateSearchLink(opt) {
        const baseUrl = 'https://www.skyscanner.fr/transport/vols';
        const from = opt.origin;
        const to = opt.destination;
        const depart = opt.departureDate.toISOString().split('T')[0];
        const ret = opt.returnDate.toISOString().split('T')[0];
        return `${baseUrl}/${from}/${to}/${depart}/${ret}`;
    }
}
exports.EmailService = EmailService;
