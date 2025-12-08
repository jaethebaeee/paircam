/**
 * Stripe Provider
 * Provides the Stripe client as an injectable service for better dependency injection and testing
 */

import { Provider } from '@nestjs/common';
import Stripe from 'stripe';
import { env } from '../../env';
import { STRIPE_API_VERSION, STRIPE_CLIENT } from './stripe.constants';

export const StripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  useFactory: (): Stripe | null => {
    if (!env.STRIPE_SECRET_KEY) {
      console.warn('[Stripe] Secret key not configured - payment features disabled');
      return null;
    }

    return new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION as any,
    });
  },
};
