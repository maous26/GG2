// ===== backend/src/services/emailService.ts =====
import { Pool } from 'pg';
import sgMail from '@sendgrid/mail';
import mongoose from 'mongoose';

// Simple suppression model
interface IEmailSuppression extends mongoose.Document {
  email: string;
  reason?: string;
  createdAt: Date;
}

const EmailSuppressionSchema = new mongoose.Schema<IEmailSuppression>({
  email: { type: String, required: true, index: true, unique: true },
  reason: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const EmailSuppression = mongoose.models.EmailSuppression || mongoose.model<IEmailSuppression>('EmailSuppression', EmailSuppressionSchema);

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
      // Suppression check
      const suppressed = await EmailSuppression.findOne({ email: options.to });
      if (suppressed) {
        console.warn(`Suppressed email, not sending to ${options.to}`);
        return;
      }

      // Log the email attempt
      await this.pool.query(`
        INSERT INTO email_logs (recipient, subject, template, sent_at)
        VALUES ($1, $2, $3, NOW())
      `, [options.to, options.subject, options.template]);

      // Send with SendGrid
      const apiKey = process.env.SENDGRID_API_KEY;
      const from = process.env.SENDGRID_FROM_EMAIL;
      if (!apiKey || !from) {
        throw new Error('SENDGRID_API_KEY or SENDGRID_FROM_EMAIL missing');
      }
      sgMail.setApiKey(apiKey);

      await sgMail.send({
        to: options.to,
        from,
        subject: options.subject,
        html: options.template,
        categories: ['price-alert'],
        attachments: options.attachments?.map(a => ({
          filename: a.filename,
          content: typeof a.content === 'string' ? Buffer.from(a.content).toString('base64') : a.content.toString('base64'),
          type: a.contentType || 'application/octet-stream',
          disposition: 'attachment'
        }))
      });

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
  }, utm?: { source?: string; medium?: string; campaign?: string; content?: string }): string {
    const baseUrl = 'https://www.skyscanner.fr/transport/vols';
    const from = opt.origin;
    const to = opt.destination;
    const depart = opt.departureDate.toISOString().split('T')[0];
    const ret = opt.returnDate.toISOString().split('T')[0];
    const url = `${baseUrl}/${from}/${to}/${depart}/${ret}`;
    const params = new URLSearchParams();
    if (utm?.source) params.set('utm_source', utm.source);
    if (utm?.medium) params.set('utm_medium', utm.medium);
    if (utm?.campaign) params.set('utm_campaign', utm.campaign);
    if (utm?.content) params.set('utm_content', utm.content);
    const query = params.toString();
    return query ? `${url}?${query}` : url;
  }
}
