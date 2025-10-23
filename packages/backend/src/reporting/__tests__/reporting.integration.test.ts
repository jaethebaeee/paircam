import { ReportingService, ReportData } from '../reporting.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../services/logger.service';

describe('Reporting integration', () => {
  it('submit → next → moderate → stats', async () => {
    const logger = new LoggerService();
    const store = new Map<string, string>();
    const queue: string[] = [];
    const fakeClient = {
      lPush: async (_k: string, id: string) => queue.unshift(id),
      setEx: async (k: string, _ttl: number, val: string) => store.set(k, val),
      rPop: async (_k: string) => queue.pop() || null,
      get: async (k: string) => store.get(k) || null,
      lRange: async (_k: string, _s: number, _e: number) => queue.slice(),
      del: async (_k: string) => 1,
    } as any;

    const redis = new RedisService(logger) as any;
    (redis as any).getClient = () => fakeClient;
    (redis as any).addReport = async (id: string, data: any) => {
      await fakeClient.lPush('reports:queue', id);
      await fakeClient.setEx(`report:${id}`, 86400, JSON.stringify(data));
    };
    (redis as any).getNextReport = async () => fakeClient.rPop('reports:queue');
    (redis as any).getReport = async (id: string) => {
      const s = await fakeClient.get(`report:${id}`);
      return s ? JSON.parse(s) : null;
    };
    (redis as any).incrementCounter = jest.fn(async () => 1);
    (redis as any).getCounter = jest.fn(async () => 1);
    (redis as any).addToBlockList = jest.fn(async () => {});

    const svc = new ReportingService(redis, logger);
    const data: ReportData = {
      reporterId: 'dev1',
      reportedPeerId: 'dev2',
      sessionId: 'sid',
      reason: 'spam',
      timestamp: Date.now(),
    };
    const id = await svc.submitReport(data);
    const next = await svc.getNextReport();
    expect(next?.id).toBe(id);
    await svc.moderateReport(id, 'mod1', 'accepted');
    const stats = await svc.getReportStats();
    expect(stats.totalReports).toBeGreaterThan(0);
  });
});


