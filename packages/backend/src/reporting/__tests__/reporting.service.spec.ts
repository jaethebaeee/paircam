import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService, ReportData, Report } from '../reporting.service';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../services/logger.service';

describe('ReportingService', () => {
  let service: ReportingService;
  let redisService: jest.Mocked<RedisService>;
  let logger: jest.Mocked<LoggerService>;

  const mockRedisClient = {
    lRange: jest.fn(),
    setEx: jest.fn(),
  };

  const mockReportData: ReportData = {
    reporterId: 'reporter-123',
    reportedPeerId: 'peer-456',
    sessionId: 'session-789',
    reason: 'harassment',
    comment: 'Inappropriate behavior',
    timestamp: Date.now(),
  };

  const mockReport: Report = {
    id: 'report-123',
    ...mockReportData,
    status: 'pending',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: RedisService,
          useValue: {
            addReport: jest.fn(),
            getNextReport: jest.fn(),
            getReport: jest.fn(),
            incrementCounter: jest.fn(),
            getCounter: jest.fn(),
            addToBlockList: jest.fn(),
            isBlocked: jest.fn(),
            getRateLimit: jest.fn(),
            getClient: jest.fn(() => mockRedisClient),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
    redisService = module.get(RedisService);
    logger = module.get(LoggerService);
  });

  describe('submitReport', () => {
    it('should create and store a report', async () => {
      const reportId = await service.submitReport(mockReportData);

      expect(reportId).toBeDefined();
      expect(redisService.addReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reporterId: 'reporter-123',
          reportedPeerId: 'peer-456',
          status: 'pending',
        })
      );
    });

    it('should increment analytics counters', async () => {
      await service.submitReport(mockReportData);

      expect(redisService.incrementCounter).toHaveBeenCalledWith('reports:submitted');
      expect(redisService.incrementCounter).toHaveBeenCalledWith('reports:reason:harassment');
    });

    it('should log the report submission', async () => {
      await service.submitReport(mockReportData);

      expect(logger.log).toHaveBeenCalledWith('Report submitted', expect.any(Object));
    });
  });

  describe('getNextReport', () => {
    it('should return next report from queue', async () => {
      redisService.getNextReport.mockResolvedValue('report-123');
      redisService.getReport.mockResolvedValue(mockReport);

      const result = await service.getNextReport();

      expect(result).toEqual(mockReport);
    });

    it('should return null if queue is empty', async () => {
      redisService.getNextReport.mockResolvedValue(null);

      const result = await service.getNextReport();

      expect(result).toBeNull();
    });
  });

  describe('getReport', () => {
    it('should return report by id', async () => {
      redisService.getReport.mockResolvedValue(mockReport);

      const result = await service.getReport('report-123');

      expect(result).toEqual(mockReport);
    });

    it('should return null if report not found', async () => {
      redisService.getReport.mockResolvedValue(null);

      const result = await service.getReport('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAllReports', () => {
    it('should return all reports', async () => {
      mockRedisClient.lRange.mockResolvedValue(['report-1', 'report-2']);
      redisService.getReport.mockResolvedValueOnce({ ...mockReport, id: 'report-1' });
      redisService.getReport.mockResolvedValueOnce({ ...mockReport, id: 'report-2' });

      const result = await service.getAllReports();

      expect(result).toHaveLength(2);
    });

    it('should filter out null reports', async () => {
      mockRedisClient.lRange.mockResolvedValue(['report-1', 'report-2']);
      redisService.getReport.mockResolvedValueOnce(mockReport);
      redisService.getReport.mockResolvedValueOnce(null);

      const result = await service.getAllReports();

      expect(result).toHaveLength(1);
    });

    it('should respect limit parameter', async () => {
      mockRedisClient.lRange.mockResolvedValue([]);

      await service.getAllReports(10);

      expect(mockRedisClient.lRange).toHaveBeenCalledWith('reports:queue', 0, 9);
    });
  });

  describe('moderateReport', () => {
    it('should accept report and block device', async () => {
      redisService.getReport.mockResolvedValue(mockReport);

      await service.moderateReport('report-123', 'mod-1', 'accepted');

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'report:report-123',
        86400,
        expect.stringContaining('"status":"accepted"')
      );
      expect(redisService.addToBlockList).toHaveBeenCalledWith(
        'device',
        'peer-456',
        expect.stringContaining('harassment')
      );
      expect(redisService.incrementCounter).toHaveBeenCalledWith('reports:accepted');
      expect(redisService.incrementCounter).toHaveBeenCalledWith('blocks:created');
    });

    it('should reject report without blocking', async () => {
      redisService.getReport.mockResolvedValue(mockReport);

      await service.moderateReport('report-123', 'mod-1', 'rejected');

      expect(redisService.addToBlockList).not.toHaveBeenCalled();
      expect(redisService.incrementCounter).toHaveBeenCalledWith('reports:rejected');
    });

    it('should throw error if report not found', async () => {
      redisService.getReport.mockResolvedValue(null);

      await expect(
        service.moderateReport('non-existent', 'mod-1', 'accepted')
      ).rejects.toThrow('Report not found');
    });

    it('should log moderation action', async () => {
      redisService.getReport.mockResolvedValue(mockReport);

      await service.moderateReport('report-123', 'mod-1', 'accepted');

      expect(logger.log).toHaveBeenCalledWith('Report moderated', expect.objectContaining({
        reportId: 'report-123',
        moderatorId: 'mod-1',
        decision: 'accepted',
      }));
    });
  });

  describe('getReportStats', () => {
    it('should return report statistics', async () => {
      redisService.getCounter.mockImplementation(async (key: string) => {
        const counters: Record<string, number> = {
          'reports:submitted': 100,
          'reports:accepted': 60,
          'reports:rejected': 20,
          'reports:reason:harassment': 40,
          'reports:reason:inappropriate_content': 30,
          'reports:reason:spam': 20,
          'reports:reason:other': 10,
        };
        return counters[key] || 0;
      });

      const stats = await service.getReportStats();

      expect(stats).toEqual({
        totalReports: 100,
        pendingReports: 20, // 100 - 60 - 20
        acceptedReports: 60,
        rejectedReports: 20,
        reportsByReason: {
          harassment: 40,
          inappropriate_content: 30,
          spam: 20,
          other: 10,
        },
      });
    });
  });

  describe('detectAbusePatterns', () => {
    it('should detect blocked device', async () => {
      redisService.isBlocked.mockResolvedValue(true);
      redisService.getRateLimit.mockResolvedValue(0);
      redisService.getCounter.mockResolvedValue(0);

      const result = await service.detectAbusePatterns('device-123');

      expect(result.isAbusive).toBe(true);
      expect(result.reasons).toContain('device_blocked');
    });

    it('should detect excessive calls', async () => {
      redisService.isBlocked.mockResolvedValue(false);
      redisService.getRateLimit.mockResolvedValue(25);
      redisService.getCounter.mockResolvedValue(0);

      const result = await service.detectAbusePatterns('device-123');

      expect(result.isAbusive).toBe(true);
      expect(result.reasons).toContain('excessive_calls');
    });

    it('should detect multiple reports', async () => {
      redisService.isBlocked.mockResolvedValue(false);
      redisService.getRateLimit.mockResolvedValue(0);
      redisService.getCounter.mockResolvedValue(5);

      const result = await service.detectAbusePatterns('device-123');

      expect(result.isAbusive).toBe(true);
      expect(result.reasons).toContain('multiple_reports');
    });

    it('should return non-abusive for clean device', async () => {
      redisService.isBlocked.mockResolvedValue(false);
      redisService.getRateLimit.mockResolvedValue(5);
      redisService.getCounter.mockResolvedValue(1);

      const result = await service.detectAbusePatterns('device-123');

      expect(result.isAbusive).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });
  });
});
