import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-123',
    deviceId: 'device-456',
    email: 'test@example.com',
    username: 'testuser',
    subscriptions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            getUserWithPremiumStatus: jest.fn(),
            updateProfile: jest.fn(),
            isPremium: jest.fn(),
            findByDeviceId: jest.fn(),
            findOrCreate: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('getProfile', () => {
    it('should return user profile with premium status', async () => {
      usersService.getUserWithPremiumStatus.mockResolvedValue({
        user: mockUser as any,
        isPremium: true,
      });

      const result = await controller.getProfile({ user: { deviceId: 'device-456' } });

      expect(result).toEqual({
        id: 'user-123',
        deviceId: 'device-456',
        email: 'test@example.com',
        username: 'testuser',
        isPremium: true,
      });
      expect(result).not.toHaveProperty('subscriptions');
    });

    it('should return error if user not found', async () => {
      usersService.getUserWithPremiumStatus.mockResolvedValue(null);

      const result = await controller.getProfile({ user: { deviceId: 'non-existent' } });

      expect(result).toEqual({ error: 'User not found' });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updatedUser = { ...mockUser, username: 'newusername' };
      usersService.updateProfile.mockResolvedValue(updatedUser as any);
      usersService.isPremium.mockResolvedValue(false);

      const result = await controller.updateProfile(
        { user: { deviceId: 'device-456' } },
        { username: 'newusername' }
      );

      expect(result).toEqual({
        id: 'user-123',
        deviceId: 'device-456',
        email: 'test@example.com',
        username: 'newusername',
        isPremium: false,
      });
      expect(usersService.updateProfile).toHaveBeenCalledWith('device-456', { username: 'newusername' });
    });
  });

  describe('getPremiumStatus', () => {
    it('should return premium status for existing user', async () => {
      usersService.findByDeviceId.mockResolvedValue(mockUser as any);
      usersService.isPremium.mockResolvedValue(true);

      const result = await controller.getPremiumStatus({ user: { deviceId: 'device-456' } });

      expect(result).toEqual({ isPremium: true });
    });

    it('should return isPremium false if user not found', async () => {
      usersService.findByDeviceId.mockResolvedValue(null);

      const result = await controller.getPremiumStatus({ user: { deviceId: 'non-existent' } });

      expect(result).toEqual({ isPremium: false });
    });
  });

  describe('syncUser', () => {
    it('should sync user and return profile', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      usersService.isPremium.mockResolvedValue(false);

      const result = await controller.syncUser(
        { user: { deviceId: 'device-456' } },
        {}
      );

      expect(result).toEqual({
        success: true,
        user: expect.objectContaining({
          id: 'user-123',
          isPremium: false,
        }),
      });
    });

    it('should update profile if supabase info provided', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);
      usersService.updateProfile.mockResolvedValue(mockUser as any);
      usersService.isPremium.mockResolvedValue(false);

      await controller.syncUser(
        { user: { deviceId: 'device-456' } },
        { email: 'new@example.com' }
      );

      expect(usersService.updateProfile).toHaveBeenCalledWith('device-456', {
        email: 'new@example.com',
      });
    });
  });
});
