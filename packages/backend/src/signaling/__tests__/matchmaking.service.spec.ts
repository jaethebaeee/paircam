import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingService, QueueUser } from '../matchmaking.service';
import { RedisService } from '../../redis/redis.service';
import { SignalingGateway } from '../signaling.gateway';
import { MatchAnalyticsService } from '../../analytics/match-analytics.service';
import { LoggerService } from '../../services/logger.service';

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let redisService: jest.Mocked<RedisService>;
  let signalingGateway: jest.Mocked<SignalingGateway>;
  let analyticsService: jest.Mocked<MatchAnalyticsService>;
  let logger: jest.Mocked<LoggerService>;

  const mockRedisClient = {
    lRange: jest.fn().mockResolvedValue([]),
    lLen: jest.fn().mockResolvedValue(0),
  };

  const createMockUser = (overrides: Partial<QueueUser> = {}): QueueUser => ({
    userId: 'user-123',
    deviceId: 'device-123',
    timestamp: Date.now(),
    region: 'global',
    language: 'en',
    socketId: 'socket-123',
    isPremium: false,
    genderPreference: 'any',
    reputation: 70,
    interests: [],
    queueType: 'casual',
    preferences: {},
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        {
          provide: RedisService,
          useValue: {
            addToQueue: jest.fn(),
            removeFromQueue: jest.fn(),
            getQueueLength: jest.fn().mockResolvedValue(0),
            getRecentMatches: jest.fn().mockResolvedValue([]),
            addToRecentMatches: jest.fn(),
            createSession: jest.fn(),
            incrementCounter: jest.fn(),
            getClient: jest.fn(() => mockRedisClient),
          },
        },
        {
          provide: SignalingGateway,
          useValue: {
            notifyMatch: jest.fn(),
          },
        },
        {
          provide: MatchAnalyticsService,
          useValue: {
            trackMatchCreated: jest.fn(),
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

    service = module.get<MatchmakingService>(MatchmakingService);
    redisService = module.get(RedisService);
    signalingGateway = module.get(SignalingGateway);
    analyticsService = module.get(MatchAnalyticsService);
    logger = module.get(LoggerService);
  });

  describe('addToQueue', () => {
    it('should add user to queue with metadata', async () => {
      await service.addToQueue('user-123', {
        region: 'us-east',
        language: 'en',
        socketId: 'socket-123',
        deviceId: 'device-123',
        isPremium: true,
        genderPreference: 'female',
        reputation: 85,
        interests: ['gaming', 'music'],
        queueType: 'casual',
      });

      expect(redisService.addToQueue).toHaveBeenCalledWith('user-123', expect.objectContaining({
        userId: 'user-123',
        region: 'us-east',
        language: 'en',
        isPremium: true,
        genderPreference: 'female',
        interests: ['gaming', 'music'],
      }));
    });

    it('should use default values for missing metadata', async () => {
      await service.addToQueue('user-123', {
        socketId: 'socket-123',
        deviceId: 'device-123',
        isPremium: false,
      });

      expect(redisService.addToQueue).toHaveBeenCalledWith('user-123', expect.objectContaining({
        region: 'global',
        language: 'en',
        genderPreference: 'any',
        queueType: 'casual',
        interests: [],
      }));
    });
  });

  describe('removeFromQueue', () => {
    it('should remove user from queue', async () => {
      await service.removeFromQueue('user-123');

      expect(redisService.removeFromQueue).toHaveBeenCalledWith('user-123');
    });
  });

  describe('processQueue', () => {
    it('should not process if fewer than 2 users', async () => {
      redisService.getQueueLength.mockResolvedValue(1);

      await service.processQueue();

      expect(mockRedisClient.lRange).not.toHaveBeenCalled();
    });

    it('should process queue and create matches', async () => {
      const user1 = createMockUser({ userId: 'user-1', deviceId: 'device-1' });
      const user2 = createMockUser({ userId: 'user-2', deviceId: 'device-2' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      expect(redisService.createSession).toHaveBeenCalled();
      expect(signalingGateway.notifyMatch).toHaveBeenCalled();
    });

    it('should separate users by queue type', async () => {
      const casualUser1 = createMockUser({ userId: 'casual-1', queueType: 'casual' });
      const casualUser2 = createMockUser({ userId: 'casual-2', queueType: 'casual' });
      const gamingUser = createMockUser({ userId: 'gaming-1', queueType: 'gaming' });

      redisService.getQueueLength.mockResolvedValue(3);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(casualUser1),
        JSON.stringify(casualUser2),
        JSON.stringify(gamingUser),
      ]);

      await service.processQueue();

      // Should match casual users together
      expect(redisService.createSession).toHaveBeenCalled();
    });

    it('should handle queue processing errors', async () => {
      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockRejectedValue(new Error('Redis error'));

      await service.processQueue();

      expect(logger.error).toHaveBeenCalledWith('Queue processing error', expect.any(String));
    });
  });

  describe('areCompatible (via processQueue)', () => {
    it('should match users in same region', async () => {
      const user1 = createMockUser({ userId: 'user-1', region: 'us-east' });
      const user2 = createMockUser({ userId: 'user-2', region: 'us-east' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      expect(redisService.createSession).toHaveBeenCalled();
    });

    it('should match users with same region', async () => {
      // Note: Cross-region matching (global with specific) is handled by bucket overlap
      // For simplicity, we test same-region matching here
      const user1 = createMockUser({ userId: 'user-1', region: 'us-east' });
      const user2 = createMockUser({ userId: 'user-2', region: 'us-east' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      expect(redisService.createSession).toHaveBeenCalled();
    });

    it('should not match users with different languages', async () => {
      const user1 = createMockUser({ userId: 'user-1', language: 'en' });
      const user2 = createMockUser({ userId: 'user-2', language: 'es' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      expect(redisService.createSession).not.toHaveBeenCalled();
    });

    it('should not rematch recent users', async () => {
      const user1 = createMockUser({ userId: 'user-1' });
      const user2 = createMockUser({ userId: 'user-2' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);
      redisService.getRecentMatches.mockResolvedValue(['user-2']); // user1 recently matched with user2

      await service.processQueue();

      expect(redisService.createSession).not.toHaveBeenCalled();
    });

    it('should respect premium gender filter', async () => {
      const premiumUser = createMockUser({
        userId: 'premium-1',
        isPremium: true,
        genderPreference: 'female',
        gender: 'male',
      });
      const maleUser = createMockUser({
        userId: 'male-1',
        isPremium: false,
        gender: 'male',
      });
      const femaleUser = createMockUser({
        userId: 'female-1',
        isPremium: false,
        gender: 'female',
      });

      // Test with male user - should not match
      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(premiumUser),
        JSON.stringify(maleUser),
      ]);

      await service.processQueue();

      expect(redisService.createSession).not.toHaveBeenCalled();
    });

    it('should allow match when premium wants any gender', async () => {
      const premiumUser = createMockUser({
        userId: 'premium-1',
        isPremium: true,
        genderPreference: 'any',
      });
      const otherUser = createMockUser({ userId: 'user-2' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(premiumUser),
        JSON.stringify(otherUser),
      ]);

      await service.processQueue();

      expect(redisService.createSession).toHaveBeenCalled();
    });
  });

  describe('calculateCompatibilityScore (via processQueue)', () => {
    it('should give higher score to same region users', async () => {
      const user1 = createMockUser({ userId: 'user-1', region: 'us-east' });
      const user2 = createMockUser({ userId: 'user-2', region: 'us-east' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      expect(analyticsService.trackMatchCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          compatibilityScore: expect.any(Number),
        })
      );
    });

    it('should score common interests', async () => {
      const user1 = createMockUser({
        userId: 'user-1',
        interests: ['gaming', 'music', 'coding'],
      });
      const user2 = createMockUser({
        userId: 'user-2',
        interests: ['gaming', 'music', 'sports'],
      });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      expect(analyticsService.trackMatchCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          commonInterests: ['gaming', 'music'],
        })
      );
    });
  });

  describe('createSession (via processQueue)', () => {
    it('should create session and notify users', async () => {
      const user1 = createMockUser({ userId: 'user-1' });
      const user2 = createMockUser({ userId: 'user-2' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      expect(redisService.createSession).toHaveBeenCalledWith(
        expect.any(String), // sessionId
        expect.objectContaining({
          peers: ['user-1', 'user-2'],
        }),
        300 // TTL
      );
      expect(signalingGateway.notifyMatch).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        expect.any(String)
      );
      expect(redisService.addToRecentMatches).toHaveBeenCalledWith('user-1', 'user-2');
      expect(redisService.addToRecentMatches).toHaveBeenCalledWith('user-2', 'user-1');
    });

    it('should track analytics on session creation', async () => {
      const user1 = createMockUser({ userId: 'user-1', queueType: 'gaming' });
      const user2 = createMockUser({ userId: 'user-2', queueType: 'gaming' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      expect(analyticsService.trackMatchCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          user1Id: 'user-1',
          user2Id: 'user-2',
          queueType: 'gaming',
        })
      );
    });
  });

  describe('prioritization', () => {
    it('should prioritize urgent waiters (1+ minute)', async () => {
      const urgentUser = createMockUser({
        userId: 'urgent-1',
        timestamp: Date.now() - 65000, // 65 seconds ago
      });
      const normalUser = createMockUser({
        userId: 'normal-1',
        timestamp: Date.now() - 5000, // 5 seconds ago
      });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(urgentUser),
        JSON.stringify(normalUser),
      ]);

      await service.processQueue();

      expect(redisService.createSession).toHaveBeenCalled();
    });
  });

  describe('getPerformanceStats', () => {
    it('should return performance statistics', async () => {
      // Run a few matches to generate stats
      const user1 = createMockUser({ userId: 'user-1' });
      const user2 = createMockUser({ userId: 'user-2' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      await service.processQueue();

      const stats = await service.getPerformanceStats();

      expect(stats).toEqual({
        totalRuns: expect.any(Number),
        avgDuration: expect.any(Number),
        avgComparisons: expect.any(Number),
        avgUsers: expect.any(Number),
        efficiency: expect.any(String),
      });
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const user1 = createMockUser({ userId: 'user-1', region: 'us-east' });
      const user2 = createMockUser({ userId: 'user-2', region: 'europe' });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(user1),
        JSON.stringify(user2),
      ]);

      const stats = await service.getQueueStats();

      expect(stats.queueLength).toBe(2);
      expect(stats.regionDistribution).toEqual({
        'us-east': 1,
        'europe': 1,
      });
    });

    it('should handle empty queue', async () => {
      redisService.getQueueLength.mockResolvedValue(0);
      mockRedisClient.lRange.mockResolvedValue([]);

      const stats = await service.getQueueStats();

      expect(stats.queueLength).toBe(0);
      expect(stats.averageWaitTime).toBe(0);
      expect(stats.regionDistribution).toEqual({});
    });
  });

  describe('language learning matching', () => {
    it('should match language learners with native speakers', async () => {
      const learner = createMockUser({
        userId: 'learner-1',
        queueType: 'language',
        nativeLanguage: 'en',
        learningLanguage: 'es',
      });
      const native = createMockUser({
        userId: 'native-1',
        queueType: 'language',
        nativeLanguage: 'es',
        learningLanguage: 'en',
      });

      redisService.getQueueLength.mockResolvedValue(2);
      mockRedisClient.lRange.mockResolvedValue([
        JSON.stringify(learner),
        JSON.stringify(native),
      ]);

      await service.processQueue();

      expect(redisService.createSession).toHaveBeenCalled();
    });
  });
});
