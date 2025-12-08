import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../services/logger.service';

/**
 * WebSocket Rate Limit Guard
 *
 * Limits the number of WebSocket events a client can send per time window.
 * Applied per-event-type to prevent spam and abuse.
 */
@Injectable()
export class WsRateLimitGuard implements CanActivate {
  // Rate limits per event type (events per window)
  private readonly RATE_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
    // High-frequency events (WebRTC signaling)
    'send-offer': { maxRequests: 5, windowSeconds: 10 },
    'send-answer': { maxRequests: 5, windowSeconds: 10 },
    'send-candidate': { maxRequests: 50, windowSeconds: 10 }, // ICE candidates can be many

    // Medium-frequency events
    'send-message': { maxRequests: 30, windowSeconds: 60 }, // 30 messages per minute
    'send-reaction': { maxRequests: 20, windowSeconds: 60 }, // 20 reactions per minute

    // Low-frequency events
    'join-queue': { maxRequests: 10, windowSeconds: 60 },
    'leave-queue': { maxRequests: 10, windowSeconds: 60 },
    'end-call': { maxRequests: 10, windowSeconds: 60 },
    'connection-status': { maxRequests: 10, windowSeconds: 60 },

    // Default for unknown events
    default: { maxRequests: 20, windowSeconds: 60 },
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const deviceId = client.data?.deviceId;

    if (!deviceId) {
      // No device ID - let it through (will fail auth elsewhere)
      return true;
    }

    // Get the event name from the handler
    const handler = context.getHandler();
    const eventName = this.getEventName(handler.name);

    // Get rate limit config for this event
    const config = this.RATE_LIMITS[eventName] || this.RATE_LIMITS.default;

    // Check rate limit
    const key = `ws:ratelimit:${deviceId}:${eventName}`;
    const count = await this.redisService.incrementRateLimit(key, config.windowSeconds);

    if (count > config.maxRequests) {
      this.logger.warn('WebSocket rate limit exceeded', {
        deviceId,
        event: eventName,
        count,
        limit: config.maxRequests,
        window: `${config.windowSeconds}s`,
      });

      // Emit rate limit error to client
      client.emit('error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many ${eventName} requests. Please slow down.`,
        retryAfter: config.windowSeconds,
      });

      return false;
    }

    return true;
  }

  /**
   * Convert handler name to event name
   * e.g., 'handleSendMessage' -> 'send-message'
   */
  private getEventName(handlerName: string): string {
    // Remove 'handle' prefix if present
    let name = handlerName.replace(/^handle/, '');

    // Convert camelCase to kebab-case
    name = name.replace(/([A-Z])/g, '-$1').toLowerCase();

    // Remove leading dash
    if (name.startsWith('-')) {
      name = name.substring(1);
    }

    return name;
  }
}

/**
 * Helper service for rate limit operations
 */
@Injectable()
export class WsRateLimitService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if a device is currently rate limited for an event
   */
  async isRateLimited(deviceId: string, eventName: string, maxRequests: number): Promise<boolean> {
    const key = `ws:ratelimit:${deviceId}:${eventName}`;
    const count = await this.redisService.getRateLimit(key);
    return count >= maxRequests;
  }

  /**
   * Get current rate limit count for a device/event
   */
  async getRateLimitCount(deviceId: string, eventName: string): Promise<number> {
    const key = `ws:ratelimit:${deviceId}:${eventName}`;
    return this.redisService.getRateLimit(key);
  }

  /**
   * Reset rate limit for a device/event (admin use)
   */
  async resetRateLimit(deviceId: string, eventName: string): Promise<void> {
    const key = `ws:ratelimit:${deviceId}:${eventName}`;
    await this.redisService.getClient().del(key);
  }
}
