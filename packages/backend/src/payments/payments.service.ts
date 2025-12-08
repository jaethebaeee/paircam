import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { env } from '../env';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly logger: LoggerService,
  ) {
    if (!env.STRIPE_SECRET_KEY) {
      this.logger.warn('Stripe secret key not configured');
    } else {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-06-20',
      });
    }
  }

  async createCheckoutSession(deviceId: string, plan: 'weekly' | 'monthly') {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    const user = await this.usersService.findByDeviceId(deviceId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const priceId = plan === 'weekly' 
      ? env.STRIPE_PRICE_ID_WEEKLY 
      : env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
      throw new BadRequestException(`Price ID not configured for ${plan} plan`);
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        customer_email: user.email || undefined,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/?canceled=true`,
        metadata: {
          userId: user.id,
          deviceId: user.deviceId,
          plan,
        },
      });

      this.logger.log('Checkout session created', {
        userId: user.id,
        plan,
        sessionId: session.id,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      this.logger.error('Failed to create checkout session', error.stack);
      throw new BadRequestException('Failed to create checkout session');
    }
  }

  async handleWebhook(signature: string, payload: Buffer) {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error.message);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log('Webhook received', { type: event.type });

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        default:
          this.logger.debug('Unhandled webhook event', { type: event.type });
      }
    } catch (error) {
      this.logger.error('Webhook handler error', error.stack);
      throw error;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as 'weekly' | 'monthly';

    if (!userId || !session.subscription) {
      this.logger.warn('Missing metadata in checkout session', { sessionId: session.id });
      return;
    }

    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      await this.subscriptionsService.create({
        userId,
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        status: subscription.status,
        plan,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : undefined,
      });

      this.logger.log('Subscription created from checkout', {
        userId,
        subscriptionId: subscription.id,
        plan,
      });
    } catch (error) {
      this.logger.error('Failed to handle checkout completed', error.stack);
      throw error;
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    try {
      await this.subscriptionsService.updateByStripeId(subscription.id, {
        status: subscription.status,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
      });

      this.logger.log('Subscription updated', {
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    } catch (error) {
      this.logger.error('Failed to handle subscription updated', error.stack);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    try {
      await this.subscriptionsService.updateByStripeId(subscription.id, {
        status: 'canceled',
        canceledAt: new Date(),
      });

      this.logger.log('Subscription deleted', {
        subscriptionId: subscription.id,
      });
    } catch (error) {
      this.logger.error('Failed to handle subscription deleted', error.stack);
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log('Payment succeeded', {
      invoiceId: invoice.id,
      amount: invoice.amount_paid,
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.error('Payment failed', invoice.id);
  }

  async cancelSubscription(deviceId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    const user = await this.usersService.findByDeviceId(deviceId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const subscription = await this.subscriptionsService.findActiveByUserId(user.id);
    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    try {
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await this.subscriptionsService.updateByStripeId(subscription.stripeSubscriptionId, {
        cancelAtPeriodEnd: true,
      });

      this.logger.log('Subscription cancellation scheduled', {
        userId: user.id,
        subscriptionId: subscription.id,
      });

      return { 
        success: true, 
        message: 'Subscription will cancel at period end',
        endsAt: subscription.currentPeriodEnd,
      };
    } catch (error) {
      this.logger.error('Failed to cancel subscription', error.stack);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  async verifyCheckoutSession(sessionId: string, deviceId: string) {
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    try {
      // Retrieve the checkout session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      // Verify the session belongs to this user
      const user = await this.usersService.findByDeviceId(deviceId);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Check if payment was successful
      if (session.payment_status !== 'paid') {
        throw new BadRequestException('Payment not completed');
      }

      // Check if subscription exists (webhook should have created it)
      const subscription = await this.subscriptionsService.findActiveByUserId(user.id);
      
      this.logger.log('Payment verified', {
        userId: user.id,
        sessionId,
        subscriptionId: subscription?.id,
      });

      return {
        success: true,
        isPremium: !!subscription,
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
        } : null,
      };
    } catch (error) {
      this.logger.error('Failed to verify payment', error.stack);
      throw new BadRequestException('Failed to verify payment');
    }
  }
}

