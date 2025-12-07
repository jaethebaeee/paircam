import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../metrics.service';
import { LoggerService } from '../../services/logger.service';
import { register } from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Clear the prometheus registry before each test
    register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
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

    service = module.get<MetricsService>(MetricsService);
    logger = module.get(LoggerService);

    // Initialize metrics
    service.onModuleInit();
  });

  afterEach(() => {
    register.clear();
  });

  describe('onModuleInit', () => {
    it('should register all metrics', () => {
      const registeredMetrics = register.getMetricsAsArray();

      expect(registeredMetrics.length).toBeGreaterThan(0);
      expect(logger.log).toHaveBeenCalledWith('Prometheus metrics initialized');
    });
  });

  describe('connection metrics', () => {
    it('should increment active connections', async () => {
      service.incrementActiveConnections();
      service.incrementActiveConnections();

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_active_connections 2');
      expect(metrics).toContain('video_chat_total_connections 2');
    });

    it('should decrement active connections', async () => {
      service.incrementActiveConnections();
      service.incrementActiveConnections();
      service.decrementActiveConnections();

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_active_connections 1');
    });
  });

  describe('session metrics', () => {
    it('should record session created', async () => {
      service.recordSessionCreated('us-east', 'en');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_sessions_created_total{');
      expect(metrics).toContain('video_chat_active_sessions 1');
      expect(metrics).toContain('video_chat_matches_created_total 1');
    });

    it('should record session ended', async () => {
      service.recordSessionCreated('us-east', 'en');
      service.recordSessionEnded('user_left');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_sessions_ended_total{');
      expect(metrics).toContain('video_chat_active_sessions 0');
    });
  });

  describe('matchmaking metrics', () => {
    it('should record match latency', async () => {
      service.recordMatchLatency(0.5);
      service.recordMatchLatency(1.5);

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_match_latency_seconds');
    });

    it('should update queue length', async () => {
      service.updateQueueLength(10);

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_queue_length 10');
    });
  });

  describe('WebRTC metrics', () => {
    it('should record WebRTC offer', async () => {
      service.recordWebRTCEvent('offer');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_webrtc_offers_total 1');
    });

    it('should record WebRTC answer', async () => {
      service.recordWebRTCEvent('answer');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_webrtc_answers_total 1');
    });

    it('should record ICE candidate', async () => {
      service.recordWebRTCEvent('candidate');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_ice_candidates_total 1');
    });

    it('should record websocket events', async () => {
      service.recordWebRTCEvent('offer');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_websocket_events_total{event_type="offer"} 1');
    });

    it('should record connection success', async () => {
      service.recordConnectionSuccess('p2p');
      service.recordConnectionSuccess('turn');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_connection_success_total{connection_type="p2p"} 1');
      expect(metrics).toContain('video_chat_connection_success_total{connection_type="turn"} 1');
    });

    it('should record connection failure', async () => {
      service.recordConnectionFailure('timeout');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_connection_failures_total{failure_reason="timeout"} 1');
    });
  });

  describe('reporting metrics', () => {
    it('should record report submitted', async () => {
      service.recordReportSubmitted('harassment');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_reports_submitted_total{reason="harassment"} 1');
    });

    it('should record report moderated', async () => {
      service.recordReportModerated('accepted');
      service.recordReportModerated('rejected');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_reports_moderated_total{decision="accepted"} 1');
      expect(metrics).toContain('video_chat_reports_moderated_total{decision="rejected"} 1');
    });

    it('should record user blocked', async () => {
      service.recordUserBlocked('device');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_users_blocked_total{block_type="device"} 1');
    });
  });

  describe('rate limiting metrics', () => {
    it('should record rate limit hit', async () => {
      service.recordRateLimitHit('api_calls');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_rate_limit_hits_total{limit_type="api_calls"} 1');
    });
  });

  describe('error metrics', () => {
    it('should record error', async () => {
      service.recordError('validation', 'auth');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_errors_total{error_type="validation",component="auth"} 1');
    });
  });

  describe('performance metrics', () => {
    it('should record request duration', async () => {
      service.recordRequestDuration('GET', '/api/users', 200, 0.05);

      const metrics = await service.getMetrics();

      expect(metrics).toContain('video_chat_request_duration_seconds');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      service.incrementActiveConnections();

      const metrics = await service.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });
  });
});
