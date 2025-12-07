import { Test, TestingModule } from '@nestjs/testing';
import { MatchAnalyticsService } from '../match-analytics.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../services/logger.service';

describe('MatchAnalyticsService', () => {
  let service: MatchAnalyticsService;
  let redisService: jest.Mocked<RedisService>;
  let logger: jest.Mocked<LoggerService>;

  const mockRedisClient = {
    setEx: jest.fn(),
    get: jest.fn(),
    lPush: jest.fn(),
    lTrim: jest.fn(),
    lRange: jest.fn(),
    keys: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchAnalyticsService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn(() => mockRedisClient),
            incrementCounter: jest.fn(),
            getCounter: jest.fn(),
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

    service = module.get<MatchAnalyticsService>(MatchAnalyticsService);
    redisService = module.get(RedisService);
    logger = module.get(LoggerService);
  });

  describe('trackMatchCreated', () => {
    const matchData = {
      matchId: 'match-123',
      sessionId: 'session-456',
      user1Id: 'user-1',
      user2Id: 'user-2',
      compatibilityScore: 85,
      region: 'us-east',
      queueType: 'casual',
      commonInterests: ['gaming', 'music'],
    };

    it('should store match data in Redis', async () => {
      await service.trackMatchCreated(matchData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'match:match-123',
        86400,
        expect.any(String)
      );
    });

    it('should increment match counters', async () => {
      await service.trackMatchCreated(matchData);

      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:matches:total');
      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:matches:region:us-east');
      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:matches:queue:casual');
    });

    it('should track interest counters', async () => {
      await service.trackMatchCreated(matchData);

      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:interest:gaming:matches');
      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:interest:music:matches');
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValueOnce(new Error('Redis error'));

      await expect(service.trackMatchCreated(matchData)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to track match creation',
        expect.any(String)
      );
    });
  });

  describe('trackConnectionEstablished', () => {
    const connectionData = {
      matchId: 'match-123',
      sessionId: 'session-456',
      connectionTime: 2500,
    };

    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        matchId: 'match-123',
        region: 'us-east',
        connectionTime: 0,
      }));
    });

    it('should update match data with connection info', async () => {
      await service.trackConnectionEstablished(connectionData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'match:match-123',
        86400,
        expect.stringContaining('"connectionTime":2500')
      );
    });

    it('should increment successful connection counter', async () => {
      await service.trackConnectionEstablished(connectionData);

      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:connections:successful');
    });

    it('should track connection time for region', async () => {
      await service.trackConnectionEstablished(connectionData);

      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'analytics:connectionTime:us-east',
        '2500'
      );
    });

    it('should not update if match data not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await service.trackConnectionEstablished(connectionData);

      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
    });
  });

  describe('trackConnectionFailed', () => {
    const failureData = {
      matchId: 'match-123',
      sessionId: 'session-456',
      reason: 'ICE failure',
    };

    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        matchId: 'match-123',
        region: 'europe',
      }));
    });

    it('should update match data with failed state', async () => {
      await service.trackConnectionFailed(failureData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'match:match-123',
        86400,
        expect.stringContaining('"iceConnectionState":"failed"')
      );
    });

    it('should increment failure counters', async () => {
      await service.trackConnectionFailed(failureData);

      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:connections:failed');
      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:connections:failed:europe');
    });

    it('should log warning with reason', async () => {
      await service.trackConnectionFailed(failureData);

      expect(logger.warn).toHaveBeenCalledWith('Connection failed tracked', {
        matchId: 'match-123',
        reason: 'ICE failure',
      });
    });
  });

  describe('trackCallEnded', () => {
    const callEndedData = {
      matchId: 'match-123',
      sessionId: 'session-456',
      wasSkipped: false,
      callDuration: 180,
    };

    beforeEach(() => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        matchId: 'match-123',
        region: 'us-east',
        queueType: 'casual',
        commonInterests: ['gaming'],
        iceConnectionState: 'connected',
        connectionTime: 2000,
      }));
    });

    it('should update match data with call end info', async () => {
      await service.trackCallEnded(callEndedData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'match:match-123',
        86400,
        expect.stringContaining('"callDuration":180')
      );
    });

    it('should increment completed calls counter when not skipped', async () => {
      await service.trackCallEnded(callEndedData);

      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:calls:completed');
      expect(redisService.incrementCounter).not.toHaveBeenCalledWith('analytics:calls:skipped');
    });

    it('should increment skipped calls counters when skipped', async () => {
      await service.trackCallEnded({ ...callEndedData, wasSkipped: true });

      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:calls:skipped');
      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:calls:skipped:casual');
    });

    it('should track call duration by region', async () => {
      await service.trackCallEnded(callEndedData);

      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'analytics:callDuration:us-east',
        '180'
      );
      expect(mockRedisClient.lTrim).toHaveBeenCalledWith(
        'analytics:callDuration:us-east',
        0,
        999
      );
    });

    it('should track interest effectiveness', async () => {
      await service.trackCallEnded(callEndedData);

      expect(mockRedisClient.lPush).toHaveBeenCalledWith(
        'analytics:interest:gaming:durations',
        '180'
      );
    });

    it('should increment interest skip counter when skipped', async () => {
      await service.trackCallEnded({ ...callEndedData, wasSkipped: true });

      expect(redisService.incrementCounter).toHaveBeenCalledWith('analytics:interest:gaming:skips');
    });

    it('should calculate and store match quality score', async () => {
      await service.trackCallEnded(callEndedData);

      // With connected state, 2000ms connection time, 180s duration, not skipped
      // Expected: 30 (connected) + 10 (fast connection) + 30 (2+ min) + 20 (not skipped) = 90
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'match:match-123',
        86400,
        expect.stringContaining('"matchQualityScore":90')
      );
    });
  });

  describe('calculateMatchQualityScore', () => {
    // Test through trackCallEnded since calculateMatchQualityScore is private

    it('should give full score for excellent match', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        matchId: 'match-123',
        region: 'global',
        queueType: 'casual',
        iceConnectionState: 'connected',
        connectionTime: 2000, // Fast connection
        commonInterests: [],
      }));

      await service.trackCallEnded({
        matchId: 'match-123',
        sessionId: 'session-456',
        wasSkipped: false,
        callDuration: 400, // 6+ minutes
      });

      // 30 (connected) + 10 (fast) + 40 (5+ min) + 20 (not skipped) = 100
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'match:match-123',
        86400,
        expect.stringContaining('"matchQualityScore":100')
      );
    });

    it('should give low score for failed connection', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify({
        matchId: 'match-123',
        region: 'global',
        queueType: 'casual',
        iceConnectionState: 'failed',
        commonInterests: [],
      }));

      await service.trackCallEnded({
        matchId: 'match-123',
        sessionId: 'session-456',
        wasSkipped: true,
        callDuration: 5,
      });

      // No connection points, minimal duration, skipped = 0
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'match:match-123',
        86400,
        expect.stringContaining('"matchQualityScore":0')
      );
    });
  });

  describe('getAnalytics', () => {
    beforeEach(() => {
      // Mock basic counters
      redisService.getCounter.mockImplementation(async (key: string) => {
        const counters: Record<string, number> = {
          'analytics:matches:total': 100,
          'analytics:connections:successful': 85,
          'analytics:connections:failed': 15,
          'analytics:calls:skipped': 20,
          'analytics:calls:completed': 65,
          'analytics:matches:region:us-east': 40,
          'analytics:matches:queue:casual': 60,
          'analytics:interest:gaming:matches': 30,
        };
        return counters[key] || 0;
      });

      // Mock connection times and durations
      mockRedisClient.lRange.mockImplementation(async (key: string) => {
        if (key.includes('connectionTime')) {
          return ['2000', '3000', '2500'];
        }
        if (key.includes('callDuration')) {
          return ['120', '180', '240'];
        }
        if (key.includes('durations')) {
          return ['150', '200'];
        }
        return [];
      });

      // Mock match keys for quality calculation
      mockRedisClient.keys.mockResolvedValue(['match:1', 'match:2']);
      mockRedisClient.get.mockImplementation(async (key: string) => {
        if (key.startsWith('match:')) {
          return JSON.stringify({ matchQualityScore: 75 });
        }
        return null;
      });
    });

    it('should return analytics data', async () => {
      const result = await service.getAnalytics();

      expect(result.totalMatches).toBe(100);
      expect(result.successfulConnections).toBe(85);
      expect(result.failedConnections).toBe(15);
      expect(result.skipRate).toBe(20); // 20/100 * 100
    });

    it('should calculate average connection time', async () => {
      const result = await service.getAnalytics();

      // (2000 + 3000 + 2500) / 3 = 2500
      expect(result.averageConnectionTime).toBe(2500);
    });

    it('should calculate average call duration', async () => {
      const result = await service.getAnalytics();

      // (120 + 180 + 240) / 3 = 180
      expect(result.averageCallDuration).toBe(180);
    });

    it('should include regional stats', async () => {
      const result = await service.getAnalytics();

      expect(result.regionalStats['us-east']).toBeDefined();
      expect(result.regionalStats['us-east'].totalMatches).toBe(40);
    });

    it('should include queue type stats', async () => {
      const result = await service.getAnalytics();

      expect(result.queueTypeStats['casual']).toBeDefined();
      expect(result.queueTypeStats['casual'].totalMatches).toBe(60);
    });

    it('should include interest stats', async () => {
      const result = await service.getAnalytics();

      expect(result.interestStats['gaming']).toBeDefined();
      expect(result.interestStats['gaming'].matchCount).toBe(30);
    });

    it('should calculate average match quality', async () => {
      const result = await service.getAnalytics();

      // Both mock matches have quality 75
      expect(result.averageMatchQuality).toBe(75);
    });

    it('should handle empty data gracefully', async () => {
      redisService.getCounter.mockResolvedValue(0);
      mockRedisClient.lRange.mockResolvedValue([]);
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.getAnalytics();

      expect(result.totalMatches).toBe(0);
      expect(result.averageCallDuration).toBe(0);
      expect(result.averageMatchQuality).toBe(0);
      expect(result.skipRate).toBe(0);
    });

    it('should handle errors and throw', async () => {
      redisService.getCounter.mockRejectedValue(new Error('Redis error'));

      await expect(service.getAnalytics()).rejects.toThrow();
    });
  });
});
