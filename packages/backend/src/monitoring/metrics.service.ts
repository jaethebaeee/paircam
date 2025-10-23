import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class MetricsService implements OnModuleInit {
  constructor(private readonly logger: LoggerService) {}

  // Connection metrics
  public readonly activeConnections = new Gauge({
    name: 'video_chat_active_connections',
    help: 'Number of active WebSocket connections',
  });

  public readonly totalConnections = new Counter({
    name: 'video_chat_total_connections',
    help: 'Total number of WebSocket connections',
  });

  // Session metrics
  public readonly sessionsCreated = new Counter({
    name: 'video_chat_sessions_created_total',
    help: 'Total number of sessions created',
    labelNames: ['region', 'language'],
  });

  public readonly sessionsEnded = new Counter({
    name: 'video_chat_sessions_ended_total',
    help: 'Total number of sessions ended',
    labelNames: ['reason'],
  });

  public readonly activeSessions = new Gauge({
    name: 'video_chat_active_sessions',
    help: 'Number of active sessions',
  });

  // Matchmaking metrics
  public readonly queueLength = new Gauge({
    name: 'video_chat_queue_length',
    help: 'Number of users in matchmaking queue',
  });

  public readonly matchLatency = new Histogram({
    name: 'video_chat_match_latency_seconds',
    help: 'Time taken to match users',
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  });

  public readonly matchesCreated = new Counter({
    name: 'video_chat_matches_created_total',
    help: 'Total number of matches created',
  });

  // WebRTC metrics
  public readonly webrtcOffers = new Counter({
    name: 'video_chat_webrtc_offers_total',
    help: 'Total number of WebRTC offers sent',
  });

  public readonly webrtcAnswers = new Counter({
    name: 'video_chat_webrtc_answers_total',
    help: 'Total number of WebRTC answers sent',
  });

  public readonly iceCandidates = new Counter({
    name: 'video_chat_ice_candidates_total',
    help: 'Total number of ICE candidates sent',
  });

  public readonly connectionSuccess = new Counter({
    name: 'video_chat_connection_success_total',
    help: 'Total number of successful WebRTC connections',
    labelNames: ['connection_type'], // 'p2p' or 'turn'
  });

  public readonly connectionFailures = new Counter({
    name: 'video_chat_connection_failures_total',
    help: 'Total number of failed WebRTC connections',
    labelNames: ['failure_reason'],
  });

  // Reporting metrics
  public readonly reportsSubmitted = new Counter({
    name: 'video_chat_reports_submitted_total',
    help: 'Total number of abuse reports submitted',
    labelNames: ['reason'],
  });

  public readonly reportsModerated = new Counter({
    name: 'video_chat_reports_moderated_total',
    help: 'Total number of reports moderated',
    labelNames: ['decision'],
  });

  public readonly usersBlocked = new Counter({
    name: 'video_chat_users_blocked_total',
    help: 'Total number of users blocked',
    labelNames: ['block_type'],
  });

  // Rate limiting metrics
  public readonly rateLimitHits = new Counter({
    name: 'video_chat_rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['limit_type'],
  });

  // Error metrics
  public readonly errors = new Counter({
    name: 'video_chat_errors_total',
    help: 'Total number of errors',
    labelNames: ['error_type', 'component'],
  });

  // Performance metrics
  public readonly requestDuration = new Histogram({
    name: 'video_chat_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  });

  public readonly websocketEvents = new Counter({
    name: 'video_chat_websocket_events_total',
    help: 'Total number of WebSocket events',
    labelNames: ['event_type'],
  });

  onModuleInit() {
    // Clear any existing metrics
    register.clear();
    
    // Register all metrics
    register.registerMetric(this.activeConnections);
    register.registerMetric(this.totalConnections);
    register.registerMetric(this.sessionsCreated);
    register.registerMetric(this.sessionsEnded);
    register.registerMetric(this.activeSessions);
    register.registerMetric(this.queueLength);
    register.registerMetric(this.matchLatency);
    register.registerMetric(this.matchesCreated);
    register.registerMetric(this.webrtcOffers);
    register.registerMetric(this.webrtcAnswers);
    register.registerMetric(this.iceCandidates);
    register.registerMetric(this.connectionSuccess);
    register.registerMetric(this.connectionFailures);
    register.registerMetric(this.reportsSubmitted);
    register.registerMetric(this.reportsModerated);
    register.registerMetric(this.usersBlocked);
    register.registerMetric(this.rateLimitHits);
    register.registerMetric(this.errors);
    register.registerMetric(this.requestDuration);
    register.registerMetric(this.websocketEvents);

    this.logger.log('Prometheus metrics initialized');
  }

  // Helper methods for common metric operations
  incrementActiveConnections() {
    this.activeConnections.inc();
    this.totalConnections.inc();
  }

  decrementActiveConnections() {
    this.activeConnections.dec();
  }

  recordSessionCreated(region: string, language: string) {
    this.sessionsCreated.inc({ region, language });
    this.activeSessions.inc();
    this.matchesCreated.inc();
  }

  recordSessionEnded(reason: string) {
    this.sessionsEnded.inc({ reason });
    this.activeSessions.dec();
  }

  recordMatchLatency(seconds: number) {
    this.matchLatency.observe(seconds);
  }

  recordWebRTCEvent(eventType: 'offer' | 'answer' | 'candidate') {
    switch (eventType) {
      case 'offer':
        this.webrtcOffers.inc();
        break;
      case 'answer':
        this.webrtcAnswers.inc();
        break;
      case 'candidate':
        this.iceCandidates.inc();
        break;
    }
    this.websocketEvents.inc({ event_type: eventType });
  }

  recordConnectionSuccess(connectionType: 'p2p' | 'turn') {
    this.connectionSuccess.inc({ connection_type: connectionType });
  }

  recordConnectionFailure(reason: string) {
    this.connectionFailures.inc({ failure_reason: reason });
  }

  recordReportSubmitted(reason: string) {
    this.reportsSubmitted.inc({ reason });
  }

  recordReportModerated(decision: 'accepted' | 'rejected') {
    this.reportsModerated.inc({ decision });
  }

  recordUserBlocked(blockType: 'device' | 'ip') {
    this.usersBlocked.inc({ block_type: blockType });
  }

  recordRateLimitHit(limitType: string) {
    this.rateLimitHits.inc({ limit_type: limitType });
  }

  recordError(errorType: string, component: string) {
    this.errors.inc({ error_type: errorType, component });
  }

  recordRequestDuration(method: string, route: string, statusCode: number, duration: number) {
    this.requestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration
    );
  }

  updateQueueLength(length: number) {
    this.queueLength.set(length);
  }

  // Get metrics in Prometheus format
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
