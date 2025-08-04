// ===== backend/src/services/emailService.ts =====
import { Pool } from 'pg';

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export class EmailService {
  constructor(protected readonly pool: Pool) {}

  /**
   * Sends a transactional email
   */
  protected async sendTransactionalEmail(options: EmailOptions): Promise<void> {
    try {
      // Log the email attempt
      await this.pool.query(`
        INSERT INTO email_logs (recipient, subject, template, sent_at)
        VALUES ($1, $2, $3, NOW())
      `, [options.to, options.subject, options.template]);

      // Here you would integrate with your email service provider
      // For example: SendGrid, Brevo, etc.
      console.log('Sending email:', options);

    } catch (error) {
      console.error('Error sending transactional email:', error);
      throw error;
            }
  }

  /**
   * Generates a link to search for flights
   */
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
