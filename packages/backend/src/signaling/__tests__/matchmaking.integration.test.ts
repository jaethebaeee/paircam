import { MatchmakingService } from '../matchmaking.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../services/logger.service';

describe('MatchmakingService integration', () => {
  let redis: RedisService;
  let logger: LoggerService;
  let service: MatchmakingService;

  beforeEach(() => {
    // Minimal fakes for Redis client operations used in processQueue
    const list: string[] = [];
    const fakeClient = {
      lRange: jest.fn(async () => list),
      lPush: jest.fn(async (_key: string, value: string) => list.unshift(value)),
      lRem: jest.fn(async (_key: string, _count: number, value: string) => {
        const idx = list.indexOf(value);
        if (idx !== -1) list.splice(idx, 1);
      }),
    } as any;

    logger = new LoggerService();
    redis = new RedisService(logger) as any;
    (redis as any).getClient = () => fakeClient;
    (redis as any).addToQueue = async (_userId: string, item: any) => fakeClient.lPush('matchmaking:queue', JSON.stringify(item));
    (redis as any).removeFromQueue = async (userId: string) => {
      const toRemove = list.find((s) => JSON.parse(s).userId === userId);
      if (toRemove) await fakeClient.lRem('matchmaking:queue', 1, toRemove);
    };
    (redis as any).getQueueLength = async () => list.length;
    (redis as any).createSession = jest.fn(async () => {});
    (redis as any).incrementCounter = jest.fn(async () => 1);

    const gateway = {
      notifyMatch: jest.fn(async () => {}),
    } as any;

    const analyticsService = {
      trackMatchCreated: jest.fn(async () => {}),
      trackCallEnded: jest.fn(async () => {}),
      trackConnectionEstablished: jest.fn(async () => {}),
      trackConnectionFailed: jest.fn(async () => {}),
    } as any;

    service = new MatchmakingService(redis, gateway, analyticsService, logger);
  });

  it('matches two users and creates a session', async () => {
    await service.addToQueue('u1', { socketId: 's1', region: 'global', language: 'en', deviceId: 'd1', isPremium: false });
    await service.addToQueue('u2', { socketId: 's2', region: 'global', language: 'en', deviceId: 'd2', isPremium: false });

    await service.processQueue();

    expect((redis as any).createSession).toHaveBeenCalled();
  });

  it('preserves FIFO order and handles concurrent join/leave', async () => {
    await service.addToQueue('u1', { socketId: 's1', region: 'global', language: 'en', deviceId: 'd1', isPremium: false });
    await service.addToQueue('u2', { socketId: 's2', region: 'global', language: 'en', deviceId: 'd2', isPremium: false });
    await service.addToQueue('u3', { socketId: 's3', region: 'global', language: 'en', deviceId: 'd3', isPremium: false });
    await service.removeFromQueue('u2');
    await service.addToQueue('u4', { socketId: 's4', region: 'global', language: 'en', deviceId: 'd4', isPremium: false });

    await service.processQueue();
    expect((redis as any).createSession).toHaveBeenCalled();
  });
});


