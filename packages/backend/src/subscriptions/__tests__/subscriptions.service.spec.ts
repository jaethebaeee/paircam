import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';
import { Subscription } from '../entities/subscription.entity';
import { LoggerService } from '../../services/logger.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let repository: jest.Mocked<Repository<Subscription>>;
  let logger: jest.Mocked<LoggerService>;

  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);

  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 1);

  const mockSubscription: Subscription = {
    id: 'sub-123',
    userId: 'user-456',
    stripeCustomerId: 'cus-789',
    stripeSubscriptionId: 'stripe-sub-123',
    stripePriceId: 'price-monthly',
    plan: 'monthly',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: futureDate,
    cancelAtPeriodEnd: false,
    user: {} as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    repository = module.get(getRepositoryToken(Subscription));
    logger = module.get(LoggerService);
  });

  describe('create', () => {
    it('should create and return a subscription', async () => {
      const createDto = {
        userId: 'user-456',
        stripeCustomerId: 'cus-789',
        stripeSubscriptionId: 'stripe-sub-123',
        stripePriceId: 'price-monthly',
        plan: 'monthly' as const,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
      };

      repository.create.mockReturnValue(mockSubscription);
      repository.save.mockResolvedValue(mockSubscription);

      const result = await service.create(createDto);

      expect(result).toEqual(mockSubscription);
      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockSubscription);
      expect(logger.log).toHaveBeenCalledWith('Subscription created', {
        userId: 'user-456',
        plan: 'monthly',
        status: 'active',
      });
    });
  });

  describe('findByUserId', () => {
    it('should return all subscriptions for a user', async () => {
      const subscriptions = [mockSubscription, { ...mockSubscription, id: 'sub-456' }];
      repository.find.mockResolvedValue(subscriptions);

      const result = await service.findByUserId('user-456');

      expect(result).toEqual(subscriptions);
      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'user-456' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no subscriptions found', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findByUserId('user-no-subs');

      expect(result).toEqual([]);
    });
  });

  describe('findActiveByUserId', () => {
    it('should return active subscription for user', async () => {
      repository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.findActiveByUserId('user-456');

      expect(result).toEqual(mockSubscription);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-456', status: 'active' },
        order: { currentPeriodEnd: 'DESC' },
      });
    });

    it('should return null if no active subscription', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findActiveByUserId('user-no-active');

      expect(result).toBeNull();
    });
  });

  describe('findByStripeSubscriptionId', () => {
    it('should return subscription by Stripe ID', async () => {
      repository.findOne.mockResolvedValue(mockSubscription);

      const result = await service.findByStripeSubscriptionId('stripe-sub-123');

      expect(result).toEqual(mockSubscription);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'stripe-sub-123' },
      });
    });

    it('should return null if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByStripeSubscriptionId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByStripeCustomerId', () => {
    it('should return all subscriptions for a Stripe customer', async () => {
      const subscriptions = [mockSubscription];
      repository.find.mockResolvedValue(subscriptions);

      const result = await service.findByStripeCustomerId('cus-789');

      expect(result).toEqual(subscriptions);
      expect(repository.find).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus-789' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('updateByStripeId', () => {
    it('should update and return subscription', async () => {
      const updateDto = {
        status: 'canceled',
        cancelAtPeriodEnd: true,
      };
      const updatedSubscription = { ...mockSubscription, ...updateDto };

      repository.findOne.mockResolvedValue({ ...mockSubscription });
      repository.save.mockResolvedValue(updatedSubscription);

      const result = await service.updateByStripeId('stripe-sub-123', updateDto);

      expect(result.status).toBe('canceled');
      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(repository.save).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Subscription updated', expect.any(Object));
    });

    it('should throw NotFoundException if subscription not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateByStripeId('non-existent', { status: 'canceled' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should update currentPeriodEnd when provided', async () => {
      const newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + 2);

      const updateDto = { currentPeriodEnd: newEndDate };

      repository.findOne.mockResolvedValue({ ...mockSubscription });
      repository.save.mockImplementation(async (sub) => sub as Subscription);

      const result = await service.updateByStripeId('stripe-sub-123', updateDto);

      expect(result.currentPeriodEnd).toEqual(newEndDate);
    });
  });

  describe('cancel', () => {
    it('should cancel active subscription', async () => {
      repository.findOne.mockResolvedValue({ ...mockSubscription });
      repository.save.mockImplementation(async (sub) => sub as Subscription);

      const result = await service.cancel('user-456');

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(result.canceledAt).toBeInstanceOf(Date);
      expect(logger.log).toHaveBeenCalledWith('Subscription cancelled', {
        userId: 'user-456',
        subscriptionId: 'sub-123',
      });
    });

    it('should throw NotFoundException if no active subscription', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.cancel('user-no-sub')).rejects.toThrow(
        'No active subscription found'
      );
    });
  });

  describe('isUserPremium', () => {
    it('should return true for active non-expired subscription', async () => {
      const activeSub = { ...mockSubscription, currentPeriodEnd: futureDate };
      repository.findOne.mockResolvedValue(activeSub);

      const result = await service.isUserPremium('user-456');

      expect(result).toBe(true);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-456', status: 'active' },
      });
    });

    it('should return false if no active subscription', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.isUserPremium('user-no-sub');

      expect(result).toBe(false);
    });

    it('should return false if subscription is expired', async () => {
      const expiredSub = { ...mockSubscription, currentPeriodEnd: pastDate };
      repository.findOne.mockResolvedValue(expiredSub);

      const result = await service.isUserPremium('user-expired');

      expect(result).toBe(false);
    });

    it('should return true if subscription ends today but later', async () => {
      const laterToday = new Date();
      laterToday.setHours(laterToday.getHours() + 1);

      const validSub = { ...mockSubscription, currentPeriodEnd: laterToday };
      repository.findOne.mockResolvedValue(validSub);

      const result = await service.isUserPremium('user-456');

      expect(result).toBe(true);
    });
  });
});
