/**
 * Stripe Constants
 * Centralized constants for Stripe integration
 */

// Stripe API version - update this when upgrading Stripe SDK
export const STRIPE_API_VERSION = '2025-09-30.clover' as const;

// Stripe webhook event types we handle
export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  PAYMENT_FAILED: 'invoice.payment_failed',
} as const;

// Subscription statuses from Stripe
export const STRIPE_SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  UNPAID: 'unpaid',
} as const;

// Payment statuses
export const STRIPE_PAYMENT_STATUS = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  NO_PAYMENT_REQUIRED: 'no_payment_required',
} as const;

// Provider token for dependency injection
export const STRIPE_CLIENT = 'STRIPE_CLIENT';
