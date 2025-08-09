#!/usr/bin/env node

// Minimal SendGrid delivery smoke test
// Usage (env): SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, TEST_EMAIL (optional)

const sgMail = require('@sendgrid/mail');

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;
const toEmail = process.env.TEST_EMAIL || fromEmail;

async function run() {
  try {
    if (!apiKey || !fromEmail) {
      console.error('Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL');
      process.exit(1);
    }
    sgMail.setApiKey(apiKey);
    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: 'GlobeGenius test email (SendGrid)',
      html: '<strong>This is a SendGrid delivery smoke test from GlobeGenius backend.</strong>',
      headers: { 'X-Entity-Ref-ID': 'delivery-smoke-test' }
    };
    const [res] = await sgMail.send(msg);
    console.log('SENDGRID_STATUS', res.statusCode);
    console.log('SENDGRID_HEADERS', JSON.stringify(res.headers || {}).substring(0, 200));
    console.log('OK: test email enqueued');
  } catch (e) {
    console.error('SendGrid test failed:', e.response?.body || e.message);
    process.exit(2);
  }
}

run();

