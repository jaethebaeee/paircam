import { Test, TestingModule } from '@nestjs/testing';
import { RedisPubSubService, MatchNotifyEvent } from '../redis-pubsub.service';
import { RedisService } from '../redis.service';
import { LoggerService } from '../../services/logger.service';

// Mock env
jest.mock('../../env', () => ({
  env: {
    REDIS_URL: 'redis://localhost:6379',
  },
}));

// Create mock client factory
const createMockClient = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(1),
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  isReady: true,
});

jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => createMockClient()),
}));

describe('RedisPubSubService', () => {
  let service: RedisPubSubService;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisPubSubService,
        {
          provide: RedisService,
          useValue: {},
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

    service = module.get<RedisPubSubService>(RedisPubSubService);
    logger = module.get(LoggerService);
  });

  describe('onModuleInit', () => {
    it('should initialize and log success', async () => {
      await service.onModuleInit();

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Redis Pub/Sub initialized'));
    });

    it('should create two Redis clients', async () => {
      const { createClient } = require('redis');

      await service.onModuleInit();

      expect(createClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close clients without error', async () => {
      await service.onModuleInit();
      await expect(service.onModuleDestroy()).resolves.not.toThrow();

      expect(logger.log).toHaveBeenCalledWith('Redis Pub/Sub clients closed');
    });
  });

  describe('getInstanceId', () => {
    it('should return a unique instance ID', () => {
      const instanceId = service.getInstanceId();

      expect(instanceId).toMatch(/^instance-[a-z0-9]+-\d+$/);
    });

    it('should return consistent ID for same instance', () => {
      const id1 = service.getInstanceId();
      const id2 = service.getInstanceId();

      expect(id1).toBe(id2);
    });
  });

  describe('isHealthy', () => {
    it('should return false before initialization', () => {
      expect(service.isHealthy()).toBe(false);
    });

    it('should return true when ready', async () => {
      await service.onModuleInit();
      (service as any).isReady = true;

      expect(service.isHealthy()).toBe(true);
    });
  });

  describe('publish', () => {
    it('should skip publish when not healthy', async () => {
      await service.publish('test-channel', { type: 'match:notify' } as any);

      expect(logger.warn).toHaveBeenCalledWith(
        'Redis Pub/Sub not ready, skipping publish',
        expect.any(Object)
      );
    });

    it('should publish when healthy', async () => {
      await service.onModuleInit();
      (service as any).isReady = true;

      const event: MatchNotifyEvent = {
        type: 'match:notify',
        deviceId1: 'device-1',
        deviceId2: 'device-2',
        sessionId: 'session-123',
        timestamp: Date.now(),
        instanceId: 'test-instance',
      };

      await service.publish('match:notify', event);

      expect(logger.debug).toHaveBeenCalledWith('📤 Published event', expect.any(Object));
    });
  });

  describe('subscribe', () => {
    it('should register handler for channel', async () => {
      await service.onModuleInit();

      const handler = jest.fn();
      await service.subscribe('test-channel', handler);

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Subscribed to channel'));
    });

    it('should add multiple handlers to same channel', async () => {
      await service.onModuleInit();

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      await service.subscribe('test-channel', handler1);
      await service.subscribe('test-channel', handler2);

      const stats = await service.getStats();
      expect(stats.totalHandlers).toBe(2);
    });
  });

  describe('unsubscribe', () => {
    it('should remove handler from channel', async () => {
      await service.onModuleInit();

      const handler = jest.fn();
      await service.subscribe('test-channel', handler);
      await service.unsubscribe('test-channel', handler);

      const stats = await service.getStats();
      expect(stats.subscribedChannels).not.toContain('test-channel');
    });

    it('should handle non-existent channel gracefully', async () => {
      await service.onModuleInit();

      await expect(service.unsubscribe('non-existent')).resolves.not.toThrow();
    });
  });

  describe('publishMatchNotify', () => {
    it('should publish match notification event', async () => {
      await service.onModuleInit();
      (service as any).isReady = true;

      await service.publishMatchNotify('device-1', 'device-2', 'session-123');

      expect(logger.debug).toHaveBeenCalledWith('📤 Published event', expect.objectContaining({
        type: 'match:notify',
      }));
    });
  });

  describe('publishSessionEnd', () => {
    it('should publish session end event', async () => {
      await service.onModuleInit();
      (service as any).isReady = true;

      await service.publishSessionEnd('session-123', 'device-1');

      expect(logger.debug).toHaveBeenCalledWith('📤 Published event', expect.objectContaining({
        type: 'session:end',
      }));
    });
  });

  describe('publishQueueUpdate', () => {
    it('should publish queue update event', async () => {
      await service.onModuleInit();
      (service as any).isReady = true;

      await service.publishQueueUpdate('device-1', 5, 15);

      expect(logger.debug).toHaveBeenCalledWith('📤 Published event', expect.objectContaining({
        type: 'queue:update',
      }));
    });
  });

  describe('publishSignalForward', () => {
    it('should publish signal forward event', async () => {
      await service.onModuleInit();
      (service as any).isReady = true;

      await service.publishSignalForward('device-1', 'offer', 'session-123', { sdp: 'test' }, 'device-2');

      expect(logger.debug).toHaveBeenCalledWith('📤 Published event', expect.objectContaining({
        type: 'signal:forward',
      }));
    });
  });

  describe('getStats', () => {
    it('should return pub/sub statistics', async () => {
      await service.onModuleInit();

      const handler = jest.fn();
      await service.subscribe('channel-1', handler);
      await service.subscribe('channel-2', handler);

      const stats = await service.getStats();

      expect(stats.instanceId).toMatch(/^instance-/);
      expect(stats.subscribedChannels).toContain('channel-1');
      expect(stats.subscribedChannels).toContain('channel-2');
      expect(stats.totalHandlers).toBe(2);
    });

    it('should return empty stats when no subscriptions', async () => {
      const stats = await service.getStats();

      expect(stats.subscribedChannels).toHaveLength(0);
      expect(stats.totalHandlers).toBe(0);
    });
  });
});
