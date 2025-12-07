import { Injectable } from '@nestjs/common';
import { env } from '../env';
import { LoggerService } from '../services/logger.service';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SubscriptionEmailData {
  email: string;
  plan: 'weekly' | 'monthly';
  amount?: string;
  nextBillingDate?: string;
  cancelDate?: string;
}

@Injectable()
export class EmailService {
  private readonly isConfigured: boolean;

  constructor(private readonly logger: LoggerService) {
    this.isConfigured =
      (env.EMAIL_PROVIDER === 'resend' && !!env.RESEND_API_KEY) ||
      (env.EMAIL_PROVIDER === 'smtp' && !!env.SMTP_HOST && !!env.SMTP_USER);

    if (!this.isConfigured) {
      this.logger.warn('Email service not configured - emails will be logged only');
    }
  }

  /**
   * Send an email using configured provider
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.debug('Email would be sent (not configured):', {
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    try {
      if (env.EMAIL_PROVIDER === 'resend') {
        return await this.sendViaResend(options);
      } else {
        return await this.sendViaSMTP(options);
      }
    } catch (error) {
      this.logger.error('Failed to send email', error.stack);
      return false;
    }
  }

  /**
   * Send via Resend API
   */
  private async sendViaResend(options: EmailOptions): Promise<boolean> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${error}`);
    }

    this.logger.log('Email sent via Resend', { to: options.to, subject: options.subject });
    return true;
  }

  /**
   * Send via SMTP (using nodemailer)
   */
  private async sendViaSMTP(options: EmailOptions): Promise<boolean> {
    // Dynamic import to avoid loading nodemailer if using Resend
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    this.logger.log('Email sent via SMTP', { to: options.to, subject: options.subject });
    return true;
  }

  // ==================== SUBSCRIPTION EMAIL TEMPLATES ====================

  /**
   * Welcome email after first subscription
   */
  async sendSubscriptionWelcome(data: SubscriptionEmailData): Promise<boolean> {
    const planName = data.plan === 'weekly' ? 'Weekly' : 'Monthly';
    const price = data.plan === 'weekly' ? '$2.99/week' : '$9.99/month';

    return this.sendEmail({
      to: data.email,
      subject: 'Welcome to PairCam Premium! 🎉',
      html: this.wrapTemplate(`
        <h1 style="color: #ec4899; margin-bottom: 24px;">Welcome to Premium!</h1>

        <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
          Thank you for upgrading to PairCam Premium (${planName} - ${price}).
          Your premium features are now active!
        </p>

        <div style="background: linear-gradient(135deg, #fdf2f8 0%, #f3e8ff 100%); border-radius: 16px; padding: 24px; margin: 24px 0;">
          <h2 style="color: #7c3aed; margin-bottom: 16px; font-size: 18px;">Your Premium Features:</h2>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 8px 0; color: #374151;">🎯 Gender Filter - Match with your preferred gender</li>
            <li style="padding: 8px 0; color: #374151;">⚡ Priority Matching - Skip the queue</li>
            <li style="padding: 8px 0; color: #374151;">🚫 Ad-Free Experience - No interruptions</li>
            <li style="padding: 8px 0; color: #374151;">♾️ Unlimited Matches - No daily limits</li>
            <li style="padding: 8px 0; color: #374151;">↩️ Rewind Skip - Undo your last skip</li>
          </ul>
        </div>

        ${data.nextBillingDate ? `
        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
          Your next billing date: <strong>${data.nextBillingDate}</strong>
        </p>
        ` : ''}

        <a href="${env.FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 24px;">
          Start Chatting
        </a>
      `),
      text: `Welcome to PairCam Premium! Your ${planName} subscription (${price}) is now active. Enjoy gender filters, priority matching, ad-free experience, unlimited matches, and more!`,
    });
  }

  /**
   * Payment successful (renewal)
   */
  async sendPaymentSuccessful(data: SubscriptionEmailData): Promise<boolean> {
    const planName = data.plan === 'weekly' ? 'Weekly' : 'Monthly';

    return this.sendEmail({
      to: data.email,
      subject: 'Payment Successful - PairCam Premium',
      html: this.wrapTemplate(`
        <h1 style="color: #10b981; margin-bottom: 24px;">Payment Successful ✓</h1>

        <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
          Your PairCam Premium subscription has been renewed.
        </p>

        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Plan</td>
              <td style="padding: 8px 0; color: #111827; text-align: right; font-weight: 600;">${planName}</td>
            </tr>
            ${data.amount ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Amount</td>
              <td style="padding: 8px 0; color: #111827; text-align: right; font-weight: 600;">${data.amount}</td>
            </tr>
            ` : ''}
            ${data.nextBillingDate ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Next Billing</td>
              <td style="padding: 8px 0; color: #111827; text-align: right; font-weight: 600;">${data.nextBillingDate}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <p style="font-size: 14px; color: #6b7280;">
          Thank you for being a Premium member!
        </p>
      `),
      text: `Your PairCam Premium (${planName}) payment was successful. ${data.nextBillingDate ? `Next billing: ${data.nextBillingDate}` : ''}`,
    });
  }

  /**
   * Payment failed
   */
  async sendPaymentFailed(data: SubscriptionEmailData): Promise<boolean> {
    return this.sendEmail({
      to: data.email,
      subject: 'Payment Failed - Action Required',
      html: this.wrapTemplate(`
        <h1 style="color: #ef4444; margin-bottom: 24px;">Payment Failed</h1>

        <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
          We were unable to process your payment for PairCam Premium.
          Please update your payment method to continue enjoying premium features.
        </p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="color: #991b1b; margin: 0;">
            ⚠️ Your premium features may be suspended if payment is not received.
          </p>
        </div>

        <a href="${env.FRONTEND_URL}" style="display: inline-block; background: #ef4444; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 24px;">
          Update Payment Method
        </a>

        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
          Need help? Contact us at support@paircam.live
        </p>
      `),
      text: `Your PairCam Premium payment failed. Please update your payment method to continue enjoying premium features. Visit ${env.FRONTEND_URL} to update.`,
    });
  }

  /**
   * Subscription canceled
   */
  async sendSubscriptionCanceled(data: SubscriptionEmailData): Promise<boolean> {
    return this.sendEmail({
      to: data.email,
      subject: 'Subscription Canceled - PairCam',
      html: this.wrapTemplate(`
        <h1 style="color: #f59e0b; margin-bottom: 24px;">Subscription Canceled</h1>

        <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
          Your PairCam Premium subscription has been canceled.
        </p>

        ${data.cancelDate ? `
        <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <p style="color: #92400e; margin: 0;">
            You'll continue to have access to premium features until <strong>${data.cancelDate}</strong>.
          </p>
        </div>
        ` : ''}

        <p style="font-size: 16px; color: #374151; margin-bottom: 16px;">
          We're sorry to see you go! If you change your mind, you can resubscribe anytime.
        </p>

        <a href="${env.FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 24px;">
          Resubscribe
        </a>

        <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
          Have feedback? We'd love to hear from you at support@paircam.live
        </p>
      `),
      text: `Your PairCam Premium subscription has been canceled. ${data.cancelDate ? `You'll have access until ${data.cancelDate}.` : ''} You can resubscribe anytime at ${env.FRONTEND_URL}`,
    });
  }

  /**
   * Wrap content in email template
   */
  private wrapTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PairCam</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Preheader text (hidden) -->
        <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #f3f4f6;">
          PairCam - Connect with people worldwide through video chat
        </div>

        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%); padding: 32px; text-align: center;">
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="background: rgba(255,255,255,0.2); border-radius: 16px; padding: 12px 24px;">
                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800; letter-spacing: -1px;">
                      Pair<span style="font-weight: 400;">Cam</span>
                    </h1>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Random Video Chat
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Social Links -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="https://twitter.com/paircam" style="display: inline-block; width: 36px; height: 36px; background: #f3f4f6; border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none;">
                      <img src="https://paircam.live/email/twitter.png" alt="Twitter" width="18" height="18" style="vertical-align: middle;" />
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="https://instagram.com/paircam" style="display: inline-block; width: 36px; height: 36px; background: #f3f4f6; border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none;">
                      <img src="https://paircam.live/email/instagram.png" alt="Instagram" width="18" height="18" style="vertical-align: middle;" />
                    </a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="https://discord.gg/paircam" style="display: inline-block; width: 36px; height: 36px; background: #f3f4f6; border-radius: 50%; text-align: center; line-height: 36px; text-decoration: none;">
                      <img src="https://paircam.live/email/discord.png" alt="Discord" width="18" height="18" style="vertical-align: middle;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%); padding: 32px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; font-weight: 500;">
                PairCam - Meet New People
              </p>
              <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 12px; line-height: 1.6;">
                <a href="${env.FRONTEND_URL}/privacy-policy" style="color: #9ca3af; text-decoration: underline;">Privacy Policy</a>
                <span style="padding: 0 8px;">•</span>
                <a href="${env.FRONTEND_URL}/terms-of-service" style="color: #9ca3af; text-decoration: underline;">Terms of Service</a>
                <span style="padding: 0 8px;">•</span>
                <a href="${env.FRONTEND_URL}/blog" style="color: #9ca3af; text-decoration: underline;">Blog</a>
              </p>
              <p style="margin: 0; color: #d1d5db; font-size: 11px;">
                © ${new Date().getFullYear()} PairCam. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

        <!-- Unsubscribe -->
        <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center;">
          You're receiving this email because you have a PairCam account.<br/>
          <a href="${env.FRONTEND_URL}/unsubscribe" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from emails</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
