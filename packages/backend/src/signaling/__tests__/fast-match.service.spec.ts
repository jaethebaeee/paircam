import { Test, TestingModule } from '@nestjs/testing';
import { FastMatchService } from '../fast-match.service';
import { RedisService } from '../../redis/redis.service';
import { SignalingGateway } from '../signaling.gateway';
import { LoggerService } from '../../services/logger.service';

describe('FastMatchService', () => {
  let service: FastMatchService;
  let redisService: jest.Mocked<RedisService>;
  let gateway: jest.Mocked<SignalingGateway>;
  let logger: jest.Mocked<LoggerService>;

  const mockUser1 = {
    userId: 'user-1',
    deviceId: 'device-1',
    socketId: 'socket-1',
    timestamp: Date.now(),
  };

  const mockUser2 = {
    userId: 'user-2',
    deviceId: 'device-2',
    socketId: 'socket-2',
    timestamp: Date.now(),
  };

  beforeEach(async () => {
    redisService = {
      lpop: jest.fn(),
      rpush: jest.fn(),
      lrange: jest.fn(),
      llen: jest.fn(),
      del: jest.fn(),
      set: jest.fn(),
      lrem: jest.fn(),
    } as any;

    gateway = {
      server: {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      },
    } as any;

    logger = {
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FastMatchService,
        { provide: RedisService, useValue: redisService },
        { provide: SignalingGateway, useValue: gateway },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<FastMatchService>(FastMatchService);
  });

  describe('joinFastQueue', () => {
    it('should add user to queue when no one is waiting', async () => {
      redisService.lpop.mockResolvedValue(null);
      redisService.llen.mockResolvedValue(0);

      const result = await service.joinFastQueue('user-1', {
        deviceId: 'device-1',
        socketId: 'socket-1',
      });

      expect(result.matched).toBe(false);
      expect(redisService.rpush).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('User joined fast queue', {
        userId: 'user-1',
      });
    });

    it('should match immediately when user is waiting', async () => {
      redisService.lpop.mockResolvedValue(mockUser1);
      redisService.set.mockResolvedValue(undefined);

      const result = await service.joinFastQueue('user-2', {
        deviceId: 'device-2',
        socketId: 'socket-2',
      });

      expect(result.matched).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(redisService.set).toHaveBeenCalled();
      expect(gateway.server.to).toHaveBeenCalledWith('socket-1');
      expect(gateway.server.to).toHaveBeenCalledWith('socket-2');
    });

    it('should emit matched event with correct data', async () => {
      redisService.lpop.mockResolvedValue(mockUser1);
      redisService.set.mockResolvedValue(undefined);

      const emitMock = jest.fn();
      (gateway.server.to as jest.Mock).mockReturnValue({ emit: emitMock });

      await service.joinFastQueue('user-2', {
        deviceId: 'device-2',
        socketId: 'socket-2',
      });

      expect(emitMock).toHaveBeenCalledWith(
        'matched',
        expect.objectContaining({
          peerId: expect.any(String),
          sessionId: expect.any(String),
          timestamp: expect.any(Number),
        })
      );
    });

    it('should reject join when queue is full', async () => {
      redisService.lpop.mockResolvedValue(null);
      redisService.llen.mockResolvedValue(1000); // MAX_QUEUE_SIZE

      const result = await service.joinFastQueue('user-1', {
        deviceId: 'device-1',
        socketId: 'socket-1',
      });

      expect(result.matched).toBe(false);
      expect(redisService.rpush).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Fast match queue full', {
        userId: 'user-1',
        queueLength: 1000,
      });
    });

    it('should handle Redis set failure gracefully', async () => {
      redisService.lpop.mockResolvedValue(mockUser1);
      redisService.set.mockRejectedValue(new Error('Redis error'));

      const result = await service.joinFastQueue('user-2', {
        deviceId: 'device-2',
        socketId: 'socket-2',
      });

      expect(result.matched).toBe(false);
      expect(redisService.rpush).toHaveBeenCalledWith(
        expect.any(String),
        mockUser1
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create session',
        expect.any(String)
      );
    });

    it('should return false when gateway.server is null', async () => {
      redisService.lpop.mockResolvedValue(mockUser1);
      redisService.set.mockResolvedValue(undefined);
      (gateway as any).server = null;

      const result = await service.joinFastQueue('user-2', {
        deviceId: 'device-2',
        socketId: 'socket-2',
      });

      expect(result.matched).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Gateway server not initialized',
        '',
        expect.any(Object)
      );
    });
  });

  describe('leaveFastQueue', () => {
    it('should remove user from queue using atomic LREM', async () => {
      redisService.lrange.mockResolvedValue([mockUser1, mockUser2]);
      redisService.lrem.mockResolvedValue(1);

      await service.leaveFastQueue('user-1');

      expect(redisService.lrange).toHaveBeenCalled();
      expect(redisService.lrem).toHaveBeenCalledWith(
        expect.any(String),
        1,
        mockUser1
      );
    });

    it('should handle user not in queue gracefully', async () => {
      redisService.lrange.mockResolvedValue([mockUser2]);

      await service.leaveFastQueue('user-1');

      expect(redisService.lrem).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      redisService.lrange.mockRejectedValue(new Error('Redis error'));

      await service.leaveFastQueue('user-1');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to leave fast queue',
        expect.any(String)
      );
    });
  });

  describe('getQueueLength', () => {
    it('should return queue length', async () => {
      redisService.llen.mockResolvedValue(5);

      const length = await service.getQueueLength();

      expect(length).toBe(5);
      expect(redisService.llen).toHaveBeenCalled();
    });

    it('should return 0 when queue is empty', async () => {
      redisService.llen.mockResolvedValue(0);

      const length = await service.getQueueLength();

      expect(length).toBe(0);
    });
  });

  describe('getEstimatedWaitTime', () => {
    it('should return 0 when less than 2 users in queue', async () => {
      redisService.llen.mockResolvedValue(1);

      const waitTime = await service.getEstimatedWaitTime();

      expect(waitTime).toBe(0);
    });

    it('should calculate wait time based on queue length', async () => {
      redisService.llen.mockResolvedValue(5);

      const waitTime = await service.getEstimatedWaitTime();

      expect(waitTime).toBe((5 - 1) * 4); // 16 seconds
    });

    it('should estimate 4 seconds per match', async () => {
      redisService.llen.mockResolvedValue(10);

      const waitTime = await service.getEstimatedWaitTime();

      expect(waitTime).toBe(36); // (10-1) * 4
    });
  });

  describe('concurrency scenarios', () => {
    it('should handle multiple simultaneous joins', async () => {
      redisService.lpop.mockResolvedValue(null);
      redisService.llen.mockResolvedValue(0);
      redisService.rpush.mockResolvedValue(undefined);

      const promises = Array.from({ length: 5 }, (_, i) =>
        service.joinFastQueue(`user-${i}`, {
          deviceId: `device-${i}`,
          socketId: `socket-${i}`,
        })
      );

      const results = await Promise.all(promises);

      expect(results.every((r) => !r.matched)).toBe(true);
      expect(redisService.rpush).toHaveBeenCalledTimes(5);
    });

    it('should not duplicate match same user', async () => {
      // Simulate atomic LPOP - each call gets different user
      redisService.lpop
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      redisService.set.mockResolvedValue(undefined);

      const result1 = await service.joinFastQueue('user-2', {
        deviceId: 'device-2',
        socketId: 'socket-2',
      });

      const result2 = await service.joinFastQueue('user-3', {
        deviceId: 'device-3',
        socketId: 'socket-3',
      });

      // Both should match different users
      expect(result1.matched).toBe(true);
      expect(result2.matched).toBe(true);
      expect(result1.sessionId).not.toBe(result2.sessionId);
    });
  });

  describe('session creation', () => {
    it('should create session with correct peer data', async () => {
      redisService.lpop.mockResolvedValue(mockUser1);
      redisService.set.mockResolvedValue(undefined);

      await service.joinFastQueue('user-2', {
        deviceId: 'device-2',
        socketId: 'socket-2',
      });

      const callArgs = (redisService.set as jest.Mock).mock.calls[0];
      const [key, sessionData] = callArgs;

      expect(key).toMatch(/^fast-session:/);
      expect(sessionData.peers).toContain('user-1');
      expect(sessionData.peers).toContain('user-2');
      expect(sessionData.id).toBeDefined();
      expect(sessionData.createdAt).toBeDefined();
    });

    it('should set correct TTL on session', async () => {
      redisService.lpop.mockResolvedValue(mockUser1);
      redisService.set.mockResolvedValue(undefined);

      await service.joinFastQueue('user-2', {
        deviceId: 'device-2',
        socketId: 'socket-2',
      });

      const callArgs = (redisService.set as jest.Mock).mock.calls[0];
      const [, , ttl] = callArgs;

      expect(ttl).toBe(300); // 5 minutes
    });
  });
});
