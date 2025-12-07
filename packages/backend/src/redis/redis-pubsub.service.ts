import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from './redis.service';
import { LoggerService } from '../services/logger.service';
import { createClient, RedisClientType } from 'redis';
import { env } from '../env';

/**
 * Redis Pub/Sub Service for Distributed Communication
 * 
 * Enables multiple backend instances to communicate via Redis channels.
 * Critical for horizontal scaling and multi-instance deployments.
 * 
 * Channels:
 * - match:notify - New matches created
 * - session:end - Session ended by peer
 * - queue:update - Queue position updates
 */

export interface MatchNotifyEvent {
  type: 'match:notify';
  deviceId1: string;
  deviceId2: string;
  sessionId: string;
  timestamp: number;
  instanceId: string; // Which instance created the match
}

export interface SessionEndEvent {
  type: 'session:end';
  sessionId: string;
  deviceId: string; // Who ended it
  timestamp: number;
  instanceId: string;
}

export interface QueueUpdateEvent {
  type: 'queue:update';
  deviceId: string;
  position: number;
  estimatedWaitTime: number;
  timestamp: number;
}

// WebRTC signal forwarding for horizontal scaling
export interface SignalForwardEvent {
  type: 'signal:forward';
  targetDeviceId: string;
  signalType: 'offer' | 'answer' | 'candidate' | 'message' | 'reaction';
  sessionId: string;
  data: unknown;
  from: string;
  timestamp: number;
  instanceId: string;
}

export type PubSubEvent = MatchNotifyEvent | SessionEndEvent | QueueUpdateEvent | SignalForwardEvent;

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private instanceId: string;
  private eventHandlers: Map<string, Set<(event: PubSubEvent) => void>> = new Map();
  private isReady = false;

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {
    // Generate unique instance ID for debugging
    this.instanceId = `instance-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
  }

  async onModuleInit() {
    try {
      // Create separate Redis clients for pub and sub
      // (Redis requirement: subscriber client can't execute other commands)
      this.pubClient = createClient({
        url: env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Redis Pub client max retries reached');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.subClient = createClient({
        url: env.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Redis Sub client max retries reached');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      // Error handlers
      this.pubClient.on('error', (err) => {
        this.logger.error('Redis Pub client error', err.stack);
      });

      this.subClient.on('error', (err) => {
        this.logger.error('Redis Sub client error', err.stack);
      });

      // Connection handlers
      this.pubClient.on('connect', () => {
        this.logger.log('✅ Redis Pub client connected');
      });

      this.subClient.on('connect', () => {
        this.logger.log('✅ Redis Sub client connected');
      });

      this.pubClient.on('ready', () => {
        this.logger.log('✅ Redis Pub client ready');
      });

      this.subClient.on('ready', () => {
        this.logger.log('✅ Redis Sub client ready');
        this.isReady = true;
      });

      // Connect both clients
      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      this.logger.log(`🚀 Redis Pub/Sub initialized - Instance ID: ${this.instanceId}`);
    } catch (error) {
      this.logger.error('Failed to initialize Redis Pub/Sub', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.subClient) {
        await this.subClient.quit();
      }
      if (this.pubClient) {
        await this.pubClient.quit();
      }
      this.logger.log('Redis Pub/Sub clients closed');
    } catch (error) {
      this.logger.error('Error closing Redis Pub/Sub clients', error.stack);
    }
  }

  /**
   * Get this instance's unique ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Check if Pub/Sub is ready
   */
  isHealthy(): boolean {
    return this.isReady && this.pubClient?.isReady && this.subClient?.isReady;
  }

  /**
   * Publish an event to a channel
   */
  async publish(channel: string, event: PubSubEvent): Promise<void> {
    try {
      if (!this.isHealthy()) {
        this.logger.warn('Redis Pub/Sub not ready, skipping publish', { channel });
        return;
      }

      const message = JSON.stringify(event);
      await this.pubClient.publish(channel, message);
      
      this.logger.debug('📤 Published event', {
        channel,
        type: event.type,
        instanceId: this.instanceId,
      });
    } catch (error) {
      this.logger.error(`Failed to publish to ${channel}`, error.stack);
    }
  }

  /**
   * Subscribe to a channel and register handler
   */
  async subscribe(channel: string, handler: (event: PubSubEvent) => void): Promise<void> {
    try {
      // Add handler to registry
      if (!this.eventHandlers.has(channel)) {
        this.eventHandlers.set(channel, new Set());
        
        // First subscriber for this channel - subscribe in Redis
        await this.subClient.subscribe(channel, (message) => {
          this.handleMessage(channel, message);
        });
        
        this.logger.log(`📥 Subscribed to channel: ${channel} (instance: ${this.instanceId})`);
      }

      this.eventHandlers.get(channel)!.add(handler);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${channel}`, error.stack);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, handler?: (event: PubSubEvent) => void): Promise<void> {
    try {
      if (!this.eventHandlers.has(channel)) return;

      if (handler) {
        // Remove specific handler
        this.eventHandlers.get(channel)!.delete(handler);
        
        // If no handlers left, unsubscribe from Redis
        if (this.eventHandlers.get(channel)!.size === 0) {
          await this.subClient.unsubscribe(channel);
          this.eventHandlers.delete(channel);
          this.logger.log(`Unsubscribed from channel: ${channel}`);
        }
      } else {
        // Remove all handlers and unsubscribe
        await this.subClient.unsubscribe(channel);
        this.eventHandlers.delete(channel);
        this.logger.log(`Unsubscribed from channel: ${channel}`);
      }
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from ${channel}`, error.stack);
    }
  }

  /**
   * Handle incoming message from Redis
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const event = JSON.parse(message) as PubSubEvent;
      
      // Don't process events from our own instance (already handled locally)
      if ('instanceId' in event && event.instanceId === this.instanceId) {
        this.logger.debug('Ignoring own event', { channel, type: event.type });
        return;
      }

      this.logger.debug('📥 Received event', {
        channel,
        type: event.type,
        fromInstance: 'instanceId' in event ? event.instanceId : 'unknown',
      });

      // Call all registered handlers
      const handlers = this.eventHandlers.get(channel);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (error) {
            this.logger.error('Error in event handler', error.stack);
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to handle message', error.stack);
    }
  }

  /**
   * Publish match notification
   */
  async publishMatchNotify(deviceId1: string, deviceId2: string, sessionId: string): Promise<void> {
    await this.publish('match:notify', {
      type: 'match:notify',
      deviceId1,
      deviceId2,
      sessionId,
      timestamp: Date.now(),
      instanceId: this.instanceId,
    });
  }

  /**
   * Publish session end notification
   */
  async publishSessionEnd(sessionId: string, deviceId: string): Promise<void> {
    await this.publish('session:end', {
      type: 'session:end',
      sessionId,
      deviceId,
      timestamp: Date.now(),
      instanceId: this.instanceId,
    });
  }

  /**
   * Publish queue update
   */
  async publishQueueUpdate(deviceId: string, position: number, estimatedWaitTime: number): Promise<void> {
    await this.publish('queue:update', {
      type: 'queue:update',
      deviceId,
      position,
      estimatedWaitTime,
      timestamp: Date.now(),
    });
  }

  /**
   * Forward WebRTC signal to peer on another instance
   */
  async publishSignalForward(
    targetDeviceId: string,
    signalType: 'offer' | 'answer' | 'candidate' | 'message' | 'reaction',
    sessionId: string,
    data: unknown,
    from: string,
  ): Promise<void> {
    await this.publish('signal:forward', {
      type: 'signal:forward',
      targetDeviceId,
      signalType,
      sessionId,
      data,
      from,
      timestamp: Date.now(),
      instanceId: this.instanceId,
    });
  }

  /**
   * Get Pub/Sub statistics
   */
  async getStats(): Promise<{
    instanceId: string;
    isHealthy: boolean;
    subscribedChannels: string[];
    totalHandlers: number;
  }> {
    const subscribedChannels = Array.from(this.eventHandlers.keys());
    const totalHandlers = Array.from(this.eventHandlers.values())
      .reduce((sum, handlers) => sum + handlers.size, 0);

    return {
      instanceId: this.instanceId,
      isHealthy: this.isHealthy(),
      subscribedChannels,
      totalHandlers,
    };
  }
}

