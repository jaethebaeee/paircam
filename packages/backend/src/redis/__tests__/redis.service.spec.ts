import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../redis.service';
import { LoggerService } from '../../services/logger.service';

// Mock redis client
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  lPush: jest.fn(),
  lRange: jest.fn(),
  lRem: jest.fn(),
  lLen: jest.fn(),
  rPop: jest.fn(),
  sAdd: jest.fn(),
  sMembers: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  incr: jest.fn(),
  incrBy: jest.fn(),
  multi: jest.fn(() => ({
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([1, true]),
  })),
};

// Mock createClient
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

// Mock env
jest.mock('../../env', () => ({
  env: {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
  },
}));

describe('RedisService', () => {
  let service: RedisService;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
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

    service = module.get<RedisService>(RedisService);
    logger = module.get(LoggerService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('onModuleInit', () => {
    it('should connect to Redis', async () => {
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });
  });

  describe('Queue operations', () => {
    describe('addToQueue', () => {
      it('should add item to queue', async () => {
        const queueItem = { userId: 'user-123', timestamp: Date.now() };

        await service.addToQueue('user-123', queueItem);

        expect(mockRedisClient.lPush).toHaveBeenCalledWith(
          'matchmaking:queue',
          JSON.stringify(queueItem)
        );
      });

      it('should throw error on failure', async () => {
        mockRedisClient.lPush.mockRejectedValueOnce(new Error('Redis error'));

        await expect(
          service.addToQueue('user-123', { userId: 'user-123', timestamp: Date.now() })
        ).rejects.toThrow('Queue operation failed');
      });
    });

    describe('removeFromQueue', () => {
      it('should remove user from queue', async () => {
        const queueItems = [
          JSON.stringify({ userId: 'user-123', timestamp: 1234 }),
          JSON.stringify({ userId: 'user-456', timestamp: 5678 }),
        ];
        mockRedisClient.lRange.mockResolvedValue(queueItems);

        await service.removeFromQueue('user-123');

        expect(mockRedisClient.lRem).toHaveBeenCalledWith(
          'matchmaking:queue',
          1,
          queueItems[0]
        );
      });

      it('should handle missing user gracefully', async () => {
        mockRedisClient.lRange.mockResolvedValue([]);

        await expect(service.removeFromQueue('non-existent')).resolves.not.toThrow();
        expect(mockRedisClient.lRem).not.toHaveBeenCalled();
      });

      it('should handle parse errors gracefully', async () => {
        mockRedisClient.lRange.mockResolvedValue(['invalid-json']);

        await service.removeFromQueue('user-123');

        expect(logger.warn).toHaveBeenCalledWith(
          'Failed to parse queue item',
          expect.any(Object)
        );
      });
    });

    describe('getQueueLength', () => {
      it('should return queue length', async () => {
        mockRedisClient.lLen.mockResolvedValue(5);

        const result = await service.getQueueLength();

        expect(result).toBe(5);
        expect(mockRedisClient.lLen).toHaveBeenCalledWith('matchmaking:queue');
      });

      it('should return 0 on error', async () => {
        mockRedisClient.lLen.mockRejectedValue(new Error('Redis error'));

        const result = await service.getQueueLength();

        expect(result).toBe(0);
      });
    });

    describe('getNextInQueue', () => {
      it('should return next item from queue', async () => {
        const queueItem = { userId: 'user-123', timestamp: 1234 };
        mockRedisClient.rPop.mockResolvedValue(JSON.stringify(queueItem));

        const result = await service.getNextInQueue();

        expect(result).toEqual(queueItem);
      });

      it('should return null if queue is empty', async () => {
        mockRedisClient.rPop.mockResolvedValue(null);

        const result = await service.getNextInQueue();

        expect(result).toBeNull();
      });

      it('should return null on parse error', async () => {
        mockRedisClient.rPop.mockResolvedValue('invalid-json');

        const result = await service.getNextInQueue();

        expect(result).toBeNull();
      });
    });
  });

  describe('Recent matches', () => {
    describe('addToRecentMatches', () => {
      it('should add matched user to recent matches', async () => {
        await service.addToRecentMatches('user-123', 'user-456');

        expect(mockRedisClient.sAdd).toHaveBeenCalledWith('recent-matches:user-123', 'user-456');
        expect(mockRedisClient.expire).toHaveBeenCalledWith('recent-matches:user-123', 3600);
      });
    });

    describe('getRecentMatches', () => {
      it('should return recent matches', async () => {
        mockRedisClient.sMembers.mockResolvedValue(['user-456', 'user-789']);

        const result = await service.getRecentMatches('user-123');

        expect(result).toEqual(['user-456', 'user-789']);
      });

      it('should return empty array on error', async () => {
        mockRedisClient.sMembers.mockRejectedValue(new Error('Redis error'));

        const result = await service.getRecentMatches('user-123');

        expect(result).toEqual([]);
      });
    });

    describe('clearRecentMatches', () => {
      it('should delete recent matches key', async () => {
        await service.clearRecentMatches('user-123');

        expect(mockRedisClient.del).toHaveBeenCalledWith('recent-matches:user-123');
      });
    });
  });

  describe('Session operations', () => {
    describe('createSession', () => {
      it('should create session with TTL', async () => {
        const sessionData = { peerId: 'peer-123', timestamp: Date.now() };

        await service.createSession('session-123', sessionData, 300);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'session:session-123',
          300,
          JSON.stringify(sessionData)
        );
      });

      it('should throw error on failure', async () => {
        mockRedisClient.setEx.mockRejectedValueOnce(new Error('Redis error'));

        await expect(
          service.createSession('session-123', {}, 300)
        ).rejects.toThrow('Session creation failed');
      });
    });

    describe('getSession', () => {
      it('should return session data', async () => {
        const sessionData = { peerId: 'peer-123' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

        const result = await service.getSession('session-123');

        expect(result).toEqual(sessionData);
      });

      it('should return null if session not found', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.getSession('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('deleteSession', () => {
      it('should delete session', async () => {
        await service.deleteSession('session-123');

        expect(mockRedisClient.del).toHaveBeenCalledWith('session:session-123');
      });
    });
  });

  describe('Rate limiting', () => {
    describe('incrementRateLimit', () => {
      it('should increment and return count', async () => {
        const result = await service.incrementRateLimit('rate:user-123', 60);

        expect(mockRedisClient.multi).toHaveBeenCalled();
        expect(result).toBe(1);
      });

      it('should return 0 on error', async () => {
        mockRedisClient.multi.mockImplementationOnce(() => {
          throw new Error('Redis error');
        });

        const result = await service.incrementRateLimit('rate:user-123');

        expect(result).toBe(0);
      });
    });

    describe('getRateLimit', () => {
      it('should return rate limit count', async () => {
        mockRedisClient.get.mockResolvedValue('10');

        const result = await service.getRateLimit('rate:user-123');

        expect(result).toBe(10);
      });

      it('should return 0 if not found', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.getRateLimit('rate:user-123');

        expect(result).toBe(0);
      });
    });
  });

  describe('Reputation tracking', () => {
    describe('getUserReputation', () => {
      it('should return default reputation for new user', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.getUserReputation('user-123');

        expect(result).toEqual({
          rating: 70,
          totalRatings: 0,
          skipRate: 0,
          reportCount: 0,
          averageCallDuration: 0,
          lastUpdated: expect.any(Number),
        });
      });

      it('should return stored reputation', async () => {
        const storedRep = {
          rating: 85,
          totalRatings: 10,
          skipRate: 15,
          reportCount: 0,
          averageCallDuration: 120,
          lastUpdated: Date.now(),
        };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(storedRep));

        const result = await service.getUserReputation('user-123');

        expect(result).toEqual(storedRep);
      });
    });

    describe('updateReputation', () => {
      it('should update skip rate', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        await service.updateReputation('user-123', { wasSkipped: true });

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'reputation:user-123',
          86400 * 90,
          expect.any(String)
        );
      });

      it('should update call duration', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        await service.updateReputation('user-123', { callDuration: 180 });

        expect(mockRedisClient.setEx).toHaveBeenCalled();
      });

      it('should update report count', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        await service.updateReputation('user-123', { wasReported: true });

        expect(mockRedisClient.setEx).toHaveBeenCalled();
        const savedData = JSON.parse(mockRedisClient.setEx.mock.calls[0][2]);
        expect(savedData.reportCount).toBe(1);
      });
    });
  });

  describe('Block list', () => {
    describe('addToBlockList', () => {
      it('should add to block list', async () => {
        await service.addToBlockList('ip', '192.168.1.1', 'Spam');

        expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
          'blocklist:ip',
          expect.stringContaining('192.168.1.1')
        );
      });
    });

    describe('isBlocked', () => {
      it('should return true if blocked', async () => {
        const blockData = JSON.stringify({
          identifier: '192.168.1.1',
          reason: 'Spam',
          timestamp: Date.now(),
        });
        mockRedisClient.sMembers.mockResolvedValue([blockData]);

        const result = await service.isBlocked('ip', '192.168.1.1');

        expect(result).toBe(true);
      });

      it('should return false if not blocked', async () => {
        mockRedisClient.sMembers.mockResolvedValue([]);

        const result = await service.isBlocked('ip', '192.168.1.1');

        expect(result).toBe(false);
      });

      it('should return false on error (fail open)', async () => {
        mockRedisClient.sMembers.mockRejectedValue(new Error('Redis error'));

        const result = await service.isBlocked('ip', '192.168.1.1');

        expect(result).toBe(false);
      });
    });
  });

  describe('Client registration', () => {
    describe('registerClient', () => {
      it('should register client with TTL', async () => {
        await service.registerClient('device-123', 'instance-1', 'socket-123');

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'client:device-123',
          600,
          expect.stringContaining('instance-1')
        );
      });
    });

    describe('unregisterClient', () => {
      it('should unregister client', async () => {
        await service.unregisterClient('device-123');

        expect(mockRedisClient.del).toHaveBeenCalledWith('client:device-123');
      });
    });

    describe('getClientInstance', () => {
      it('should return client instance info', async () => {
        const clientData = { instanceId: 'instance-1', socketId: 'socket-123' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(clientData));

        const result = await service.getClientInstance('device-123');

        expect(result).toEqual(clientData);
      });

      it('should return null if not found', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.getClientInstance('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('refreshClientTTL', () => {
      it('should refresh TTL', async () => {
        await service.refreshClientTTL('device-123');

        expect(mockRedisClient.expire).toHaveBeenCalledWith('client:device-123', 600);
      });
    });
  });

  describe('Counter operations', () => {
    describe('incrementCounter', () => {
      it('should increment counter', async () => {
        mockRedisClient.incrBy.mockResolvedValue(5);

        const result = await service.incrementCounter('stats:calls', 1);

        expect(result).toBe(5);
        expect(mockRedisClient.incrBy).toHaveBeenCalledWith('stats:calls', 1);
      });
    });

    describe('setCounter', () => {
      it('should set counter without TTL', async () => {
        await service.setCounter('stats:calls', 100);

        expect(mockRedisClient.set).toHaveBeenCalledWith('stats:calls', '100');
      });

      it('should set counter with TTL', async () => {
        await service.setCounter('stats:calls', 100, 3600);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith('stats:calls', 3600, '100');
      });
    });

    describe('getCounter', () => {
      it('should get counter value', async () => {
        mockRedisClient.get.mockResolvedValue('100');

        const result = await service.getCounter('stats:calls');

        expect(result).toBe(100);
      });

      it('should return 0 if not found', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.getCounter('stats:calls');

        expect(result).toBe(0);
      });
    });
  });

  describe('ICE Candidates', () => {
    describe('addIceCandidate', () => {
      it('should add ICE candidate', async () => {
        mockRedisClient.lRange.mockResolvedValue([]);
        const candidate = { candidate: 'test-candidate', sdpMid: '0' };

        await service.addIceCandidate('session-123', 'peer-456', candidate);

        expect(mockRedisClient.lPush).toHaveBeenCalledWith(
          'candidates:session-123:peer-456',
          JSON.stringify(candidate)
        );
        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          'candidates:session-123:peer-456',
          60
        );
      });

      it('should not add duplicate candidate', async () => {
        const candidate = { candidate: 'test-candidate', sdpMid: '0' };
        mockRedisClient.lRange.mockResolvedValue([JSON.stringify(candidate)]);

        await service.addIceCandidate('session-123', 'peer-456', candidate);

        expect(mockRedisClient.lPush).not.toHaveBeenCalled();
      });
    });

    describe('getIceCandidates', () => {
      it('should return parsed candidates', async () => {
        const candidates = [
          JSON.stringify({ candidate: 'test1', sdpMid: '0' }),
          JSON.stringify({ candidate: 'test2', sdpMid: '1' }),
        ];
        mockRedisClient.lRange.mockResolvedValue(candidates);

        const result = await service.getIceCandidates('session-123', 'peer-456');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ candidate: 'test1', sdpMid: '0' });
      });

      it('should filter out parse errors', async () => {
        mockRedisClient.lRange.mockResolvedValue([
          JSON.stringify({ candidate: 'valid' }),
          'invalid-json',
        ]);

        const result = await service.getIceCandidates('session-123', 'peer-456');

        expect(result).toHaveLength(1);
      });
    });
  });

  describe('Reports', () => {
    describe('addReport', () => {
      it('should add report to queue and store data', async () => {
        const reportData = { reason: 'spam', reportedUser: 'user-123' };

        await service.addReport('report-123', reportData);

        expect(mockRedisClient.lPush).toHaveBeenCalledWith('reports:queue', 'report-123');
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'report:report-123',
          86400,
          JSON.stringify(reportData)
        );
      });
    });

    describe('getNextReport', () => {
      it('should return next report ID', async () => {
        mockRedisClient.rPop.mockResolvedValue('report-123');

        const result = await service.getNextReport();

        expect(result).toBe('report-123');
      });
    });

    describe('getReport', () => {
      it('should return report data', async () => {
        const reportData = { reason: 'spam' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(reportData));

        const result = await service.getReport('report-123');

        expect(result).toEqual(reportData);
      });
    });
  });
});
