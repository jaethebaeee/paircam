import { MetricsService } from '../metrics.service';
import { LoggerService } from '../../services/logger.service';

describe('MetricsService', () => {
  it('increments counters and exposes Prometheus text', async () => {
    const logger = new LoggerService();
    const m = new MetricsService(logger);
    m.onModuleInit();
    m.recordSessionCreated('global', 'en');
    m.recordWebRTCEvent('offer');
    m.recordWebRTCEvent('answer');
    m.recordWebRTCEvent('candidate');
    const text = await m.getMetrics();
    expect(text).toContain('video_chat_sessions_created_total');
    expect(text).toContain('video_chat_webrtc_offers_total');
    expect(text).toContain('video_chat_webrtc_answers_total');
    expect(text).toContain('video_chat_ice_candidates_total');
  });
});


