import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { User } from '../entities/user.entity';
import { LoggerService } from '../../services/logger.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;
  let logger: jest.Mocked<LoggerService>;

  const mockUser: User = {
    id: 'user-123',
    deviceId: 'device-456',
    email: 'test@example.com',
    username: 'testuser',
    gender: 'male',
    age: 25,
    languagePreference: 'en',
    isProfileComplete: true,
    showAge: true,
    showLocation: false,
    isBanned: false,
    warningCount: 0,
    role: 'user',
    totalMatches: 10,
    totalReportsReceived: 0,
    lastActive: new Date(),
    subscriptions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
    logger = module.get(LoggerService);
  });

  describe('findOrCreate', () => {
    it('should return existing user if found', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOrCreate('device-456');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { deviceId: 'device-456' } });
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      const newUser = { ...mockUser, id: 'new-user-id' };
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(newUser);
      repository.save.mockResolvedValue(newUser);

      const result = await service.findOrCreate('new-device');

      expect(result).toEqual(newUser);
      expect(repository.create).toHaveBeenCalledWith({ deviceId: 'new-device' });
      expect(repository.save).toHaveBeenCalledWith(newUser);
      expect(logger.log).toHaveBeenCalledWith('New user created', expect.any(Object));
    });
  });

  describe('findByDeviceId', () => {
    it('should return user with subscriptions', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByDeviceId('device-456');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { deviceId: 'device-456' },
        relations: ['subscriptions'],
      });
    });

    it('should return null if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByDeviceId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user with subscriptions by id', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        relations: ['subscriptions'],
      });
    });

    it('should return null if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('should return user by google id', async () => {
      const userWithGoogle = { ...mockUser, googleId: 'google-123' };
      repository.findOne.mockResolvedValue(userWithGoogle);

      const result = await service.findByGoogleId('google-123');

      expect(result).toEqual(userWithGoogle);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { googleId: 'google-123' },
        relations: ['subscriptions'],
      });
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        relations: ['subscriptions'],
      });
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const userData = { deviceId: 'new-device', email: 'new@example.com' };
      const createdUser = { ...mockUser, ...userData };
      repository.create.mockReturnValue(createdUser);
      repository.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(result).toEqual(createdUser);
      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalledWith(createdUser);
      expect(logger.log).toHaveBeenCalledWith('User created', { userId: createdUser.id });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateDto: UpdateProfileDto = {
        username: 'newusername',
        gender: 'female',
        age: 30,
      };
      const existingUser = { ...mockUser };
      const updatedUser = { ...mockUser, ...updateDto, isProfileComplete: true };

      repository.findOne.mockResolvedValue(existingUser);
      repository.save.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('device-456', updateDto);

      expect(repository.save).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('User profile updated', expect.any(Object));
    });

    it('should throw NotFoundException if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent', { username: 'test' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should set isProfileComplete to true when all required fields are present', async () => {
      const updateDto: UpdateProfileDto = {
        email: 'complete@example.com',
        gender: 'male',
        age: 25,
        username: 'completeuser',
      };
      const existingUser = { ...mockUser, isProfileComplete: false };

      repository.findOne.mockResolvedValue(existingUser);
      repository.save.mockImplementation(async (user) => user as User);

      const result = await service.updateProfile('device-456', updateDto);

      expect(result.isProfileComplete).toBe(true);
    });

    it('should set isProfileComplete to false when required fields are missing', async () => {
      const updateDto: UpdateProfileDto = { username: 'incomplete' };
      const existingUser = {
        ...mockUser,
        email: undefined,
        gender: undefined,
        age: undefined,
        isProfileComplete: false
      };

      repository.findOne.mockResolvedValue(existingUser);
      repository.save.mockImplementation(async (user) => user as User);

      const result = await service.updateProfile('device-456', updateDto);

      expect(result.isProfileComplete).toBe(false);
    });
  });

  describe('updateLastActive', () => {
    it('should update user last active timestamp', async () => {
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateLastActive('user-123');

      expect(repository.update).toHaveBeenCalledWith('user-123', { lastActive: expect.any(Date) });
    });
  });

  describe('incrementMatches', () => {
    it('should increment total matches count', async () => {
      repository.increment.mockResolvedValue({ affected: 1 } as any);

      await service.incrementMatches('user-123');

      expect(repository.increment).toHaveBeenCalledWith({ id: 'user-123' }, 'totalMatches', 1);
    });
  });

  describe('isPremium', () => {
    it('should return false if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.isPremium('non-existent');

      expect(result).toBe(false);
    });

    it('should return false if user has no subscriptions', async () => {
      const userNoSubs = { ...mockUser, subscriptions: [] };
      repository.findOne.mockResolvedValue(userNoSubs);

      const result = await service.isPremium('user-123');

      expect(result).toBe(false);
    });

    it('should return false if subscriptions array is undefined', async () => {
      const userNoSubs = { ...mockUser, subscriptions: undefined as any };
      repository.findOne.mockResolvedValue(userNoSubs);

      const result = await service.isPremium('user-123');

      expect(result).toBe(false);
    });

    it('should return true if user has active subscription', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const userWithActiveSub = {
        ...mockUser,
        subscriptions: [{
          id: 'sub-123',
          status: 'active',
          currentPeriodEnd: futureDate,
        }] as any,
      };
      repository.findOne.mockResolvedValue(userWithActiveSub);

      const result = await service.isPremium('user-123');

      expect(result).toBe(true);
    });

    it('should return false if subscription is expired', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const userWithExpiredSub = {
        ...mockUser,
        subscriptions: [{
          id: 'sub-123',
          status: 'active',
          currentPeriodEnd: pastDate,
        }] as any,
      };
      repository.findOne.mockResolvedValue(userWithExpiredSub);

      const result = await service.isPremium('user-123');

      expect(result).toBe(false);
    });

    it('should return false if subscription status is not active', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const userWithCanceledSub = {
        ...mockUser,
        subscriptions: [{
          id: 'sub-123',
          status: 'canceled',
          currentPeriodEnd: futureDate,
        }] as any,
      };
      repository.findOne.mockResolvedValue(userWithCanceledSub);

      const result = await service.isPremium('user-123');

      expect(result).toBe(false);
    });

    it('should return true if at least one subscription is active', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      const userWithMultipleSubs = {
        ...mockUser,
        subscriptions: [
          { id: 'sub-1', status: 'canceled', currentPeriodEnd: futureDate },
          { id: 'sub-2', status: 'active', currentPeriodEnd: futureDate },
          { id: 'sub-3', status: 'active', currentPeriodEnd: pastDate },
        ] as any,
      };
      repository.findOne.mockResolvedValue(userWithMultipleSubs);

      const result = await service.isPremium('user-123');

      expect(result).toBe(true);
    });
  });

  describe('getUserWithPremiumStatus', () => {
    it('should return null if user not found', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.getUserWithPremiumStatus('non-existent');

      expect(result).toBeNull();
    });

    it('should return user with premium status', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const userWithSub = {
        ...mockUser,
        subscriptions: [{
          id: 'sub-123',
          status: 'active',
          currentPeriodEnd: futureDate,
        }] as any,
      };

      // First call for findByDeviceId
      repository.findOne.mockResolvedValueOnce(userWithSub);
      // Second call for isPremium
      repository.findOne.mockResolvedValueOnce(userWithSub);

      const result = await service.getUserWithPremiumStatus('device-456');

      expect(result).not.toBeNull();
      expect(result?.user).toEqual(userWithSub);
      expect(result?.isPremium).toBe(true);
    });

    it('should return user with non-premium status', async () => {
      const userNoSubs = { ...mockUser, subscriptions: [] };

      // First call for findByDeviceId
      repository.findOne.mockResolvedValueOnce(userNoSubs);
      // Second call for isPremium
      repository.findOne.mockResolvedValueOnce(userNoSubs);

      const result = await service.getUserWithPremiumStatus('device-456');

      expect(result).not.toBeNull();
      expect(result?.user).toEqual(userNoSubs);
      expect(result?.isPremium).toBe(false);
    });
  });
});
