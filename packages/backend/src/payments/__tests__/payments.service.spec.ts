import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { UsersService } from '../../users/users.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { LoggerService } from '../../services/logger.service';

// Mock env module
jest.mock('../../env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_PRICE_ID_WEEKLY: 'price_weekly_mock',
    STRIPE_PRICE_ID_MONTHLY: 'price_monthly_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_mock',
    FRONTEND_URL: 'http://localhost:5173',
  },
}));

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  },
  subscriptions: {
    retrieve: jest.fn(),
    update: jest.fn(),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => mockStripe);
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let usersService: jest.Mocked<UsersService>;
  let subscriptionsService: jest.Mocked<SubscriptionsService>;
  let logger: jest.Mocked<LoggerService>;

  const mockUser = {
    id: 'user-123',
    deviceId: 'device-456',
    email: 'test@example.com',
  };

  const mockSubscription = {
    id: 'sub-123',
    stripeSubscriptionId: 'stripe-sub-123',
    stripeCustomerId: 'cus-123',
    userId: 'user-123',
    plan: 'monthly' as const,
    status: 'active',
    currentPeriodEnd: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: UsersService,
          useValue: {
            findByDeviceId: jest.fn(),
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            create: jest.fn(),
            findActiveByUserId: jest.fn(),
            updateByStripeId: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    usersService = module.get(UsersService);
    subscriptionsService = module.get(SubscriptionsService);
    logger = module.get(LoggerService);
  });

  describe('createCheckoutSession', () => {
    it('should throw BadRequestException if user not found', async () => {
      usersService.findByDeviceId.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('non-existent', 'monthly')
      ).rejects.toThrow(BadRequestException);
    });

    it('should create checkout session for monthly plan', async () => {
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/session/123',
      });

      const result = await service.createCheckoutSession('device-456', 'monthly');

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/session/123',
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer_email: 'test@example.com',
        line_items: [{ price: 'price_monthly_mock', quantity: 1 }],
        mode: 'subscription',
        success_url: expect.stringContaining('/success'),
        cancel_url: expect.stringContaining('canceled=true'),
        metadata: {
          userId: 'user-123',
          deviceId: 'device-456',
          plan: 'monthly',
        },
      });
    });

    it('should create checkout session for weekly plan', async () => {
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/session/456',
      });

      const result = await service.createCheckoutSession('device-456', 'weekly');

      expect(result.sessionId).toBe('cs_test_456');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: 'price_weekly_mock', quantity: 1 }],
          metadata: expect.objectContaining({ plan: 'weekly' }),
        })
      );
    });

    it('should handle checkout session creation error', async () => {
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      mockStripe.checkout.sessions.create.mockRejectedValue(new Error('Stripe error'));

      await expect(
        service.createCheckoutSession('device-456', 'monthly')
      ).rejects.toThrow(BadRequestException);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create checkout session',
        expect.any(String)
      );
    });

    it('should use undefined for email if user has no email', async () => {
      const userNoEmail = { ...mockUser, email: undefined };
      usersService.findByDeviceId.mockResolvedValue(userNoEmail as any);
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_789',
        url: 'https://checkout.stripe.com/session/789',
      });

      await service.createCheckoutSession('device-456', 'monthly');

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: undefined,
        })
      );
    });
  });

  describe('handleWebhook', () => {
    const mockPayload = Buffer.from('{}');
    const mockSignature = 'sig_test';

    it('should throw BadRequestException for invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook(mockSignature, mockPayload)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle checkout.session.completed event', async () => {
      const checkoutSession = {
        id: 'cs_test',
        metadata: { userId: 'user-123', plan: 'monthly' },
        subscription: 'sub_test',
      };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: checkoutSession },
      });

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test',
        customer: 'cus_123',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        items: { data: [{ price: { id: 'price_monthly' } }] },
      });

      const result = await service.handleWebhook(mockSignature, mockPayload);

      expect(result).toEqual({ received: true });
      expect(subscriptionsService.create).toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated event', async () => {
      const subscription = {
        id: 'sub_test',
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        cancel_at_period_end: false,
      };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.updated',
        data: { object: subscription },
      });

      const result = await service.handleWebhook(mockSignature, mockPayload);

      expect(result).toEqual({ received: true });
      expect(subscriptionsService.updateByStripeId).toHaveBeenCalledWith(
        'sub_test',
        expect.objectContaining({
          status: 'active',
          cancelAtPeriodEnd: false,
        })
      );
    });

    it('should handle customer.subscription.deleted event', async () => {
      const subscription = { id: 'sub_test' };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'customer.subscription.deleted',
        data: { object: subscription },
      });

      const result = await service.handleWebhook(mockSignature, mockPayload);

      expect(result).toEqual({ received: true });
      expect(subscriptionsService.updateByStripeId).toHaveBeenCalledWith(
        'sub_test',
        expect.objectContaining({
          status: 'canceled',
          canceledAt: expect.any(Date),
        })
      );
    });

    it('should handle invoice.payment_succeeded event', async () => {
      const invoice = { id: 'in_test', amount_paid: 1999 };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_succeeded',
        data: { object: invoice },
      });

      const result = await service.handleWebhook(mockSignature, mockPayload);

      expect(result).toEqual({ received: true });
      expect(logger.log).toHaveBeenCalledWith('Payment succeeded', {
        invoiceId: 'in_test',
        amount: 1999,
      });
    });

    it('should handle invoice.payment_failed event', async () => {
      const invoice = { id: 'in_test' };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'invoice.payment_failed',
        data: { object: invoice },
      });

      const result = await service.handleWebhook(mockSignature, mockPayload);

      expect(result).toEqual({ received: true });
      expect(logger.error).toHaveBeenCalledWith('Payment failed', 'in_test');
    });

    it('should log unhandled webhook events', async () => {
      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'unknown.event',
        data: { object: {} },
      });

      const result = await service.handleWebhook(mockSignature, mockPayload);

      expect(result).toEqual({ received: true });
      expect(logger.debug).toHaveBeenCalledWith('Unhandled webhook event', {
        type: 'unknown.event',
      });
    });

    it('should skip checkout completed without userId', async () => {
      const checkoutSession = {
        id: 'cs_test',
        metadata: {},
        subscription: 'sub_test',
      };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: checkoutSession },
      });

      const result = await service.handleWebhook(mockSignature, mockPayload);

      expect(result).toEqual({ received: true });
      expect(logger.warn).toHaveBeenCalledWith(
        'Missing metadata in checkout session',
        expect.any(Object)
      );
      expect(subscriptionsService.create).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it('should throw BadRequestException if user not found', async () => {
      usersService.findByDeviceId.mockResolvedValue(null);

      await expect(service.cancelSubscription('non-existent')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if no active subscription', async () => {
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      subscriptionsService.findActiveByUserId.mockResolvedValue(null);

      await expect(service.cancelSubscription('device-456')).rejects.toThrow(
        'No active subscription found'
      );
    });

    it('should cancel subscription successfully', async () => {
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      subscriptionsService.findActiveByUserId.mockResolvedValue(mockSubscription as any);
      mockStripe.subscriptions.update.mockResolvedValue({});

      const result = await service.cancelSubscription('device-456');

      expect(result).toEqual({
        success: true,
        message: 'Subscription will cancel at period end',
        endsAt: mockSubscription.currentPeriodEnd,
      });
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'stripe-sub-123',
        { cancel_at_period_end: true }
      );
      expect(subscriptionsService.updateByStripeId).toHaveBeenCalledWith(
        'stripe-sub-123',
        { cancelAtPeriodEnd: true }
      );
    });

    it('should handle Stripe cancellation error', async () => {
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      subscriptionsService.findActiveByUserId.mockResolvedValue(mockSubscription as any);
      mockStripe.subscriptions.update.mockRejectedValue(new Error('Stripe error'));

      await expect(service.cancelSubscription('device-456')).rejects.toThrow(
        'Failed to cancel subscription'
      );
    });
  });

  describe('verifyCheckoutSession', () => {
    it('should throw BadRequestException if user not found', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test',
        payment_status: 'paid',
      });
      usersService.findByDeviceId.mockResolvedValue(null);

      await expect(
        service.verifyCheckoutSession('cs_test', 'non-existent')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment not completed', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test',
        payment_status: 'unpaid',
      });
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);

      await expect(
        service.verifyCheckoutSession('cs_test', 'device-456')
      ).rejects.toThrow('Failed to verify payment');
    });

    it('should verify successful payment with subscription', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test',
        payment_status: 'paid',
      });
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      subscriptionsService.findActiveByUserId.mockResolvedValue(mockSubscription as any);

      const result = await service.verifyCheckoutSession('cs_test', 'device-456');

      expect(result).toEqual({
        success: true,
        isPremium: true,
        subscription: {
          plan: 'monthly',
          status: 'active',
          currentPeriodEnd: mockSubscription.currentPeriodEnd,
        },
      });
    });

    it('should verify successful payment without subscription yet', async () => {
      mockStripe.checkout.sessions.retrieve.mockResolvedValue({
        id: 'cs_test',
        payment_status: 'paid',
      });
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      subscriptionsService.findActiveByUserId.mockResolvedValue(null);

      const result = await service.verifyCheckoutSession('cs_test', 'device-456');

      expect(result).toEqual({
        success: true,
        isPremium: false,
        subscription: null,
      });
    });
  });
});
