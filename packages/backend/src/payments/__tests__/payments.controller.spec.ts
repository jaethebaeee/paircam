import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createCheckoutSession: jest.fn(),
            handleWebhook: jest.fn(),
            cancelSubscription: jest.fn(),
            verifyCheckoutSession: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
  });

  describe('createCheckout', () => {
    it('should create checkout session for monthly plan', async () => {
      const mockResult = { sessionId: 'cs_123', url: 'https://checkout.stripe.com' };
      paymentsService.createCheckoutSession.mockResolvedValue(mockResult);

      const result = await controller.createCheckout(
        { user: { deviceId: 'device-123' } },
        { plan: 'monthly' }
      );

      expect(result).toEqual(mockResult);
      expect(paymentsService.createCheckoutSession).toHaveBeenCalledWith('device-123', 'monthly');
    });

    it('should create checkout session for weekly plan', async () => {
      const mockResult = { sessionId: 'cs_456', url: 'https://checkout.stripe.com' };
      paymentsService.createCheckoutSession.mockResolvedValue(mockResult);

      const result = await controller.createCheckout(
        { user: { deviceId: 'device-123' } },
        { plan: 'weekly' }
      );

      expect(paymentsService.createCheckoutSession).toHaveBeenCalledWith('device-123', 'weekly');
    });
  });

  describe('webhook', () => {
    it('should handle webhook with signature and payload', async () => {
      const mockResult = { received: true };
      paymentsService.handleWebhook.mockResolvedValue(mockResult);

      const mockReq = {
        rawBody: Buffer.from('{}'),
      } as any;

      const result = await controller.webhook('sig_test', mockReq);

      expect(result).toEqual(mockResult);
      expect(paymentsService.handleWebhook).toHaveBeenCalledWith('sig_test', expect.any(Buffer));
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription for user', async () => {
      const mockResult = { success: true, message: 'Cancelled' };
      paymentsService.cancelSubscription.mockResolvedValue(mockResult as any);

      const result = await controller.cancelSubscription({ user: { deviceId: 'device-123' } });

      expect(result).toEqual(mockResult);
      expect(paymentsService.cancelSubscription).toHaveBeenCalledWith('device-123');
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment with session id', async () => {
      const mockResult = { success: true, isPremium: true };
      paymentsService.verifyCheckoutSession.mockResolvedValue(mockResult as any);

      const result = await controller.verifyPayment(
        { user: { deviceId: 'device-123' } },
        'cs_test_123'
      );

      expect(result).toEqual(mockResult);
      expect(paymentsService.verifyCheckoutSession).toHaveBeenCalledWith('cs_test_123', 'device-123');
    });

    it('should throw BadRequestException if session_id missing', async () => {
      await expect(
        controller.verifyPayment({ user: { deviceId: 'device-123' } }, '')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
