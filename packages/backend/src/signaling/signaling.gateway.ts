import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '../services/logger.service';
import { RedisService } from '../redis/redis.service';
import { RedisPubSubService, MatchNotifyEvent, SessionEndEvent, SignalForwardEvent } from '../redis/redis-pubsub.service';
import { MatchmakingService } from './matchmaking.service';
import { MatchAnalyticsService } from '../analytics/match-analytics.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

export interface JoinQueueDto {
  region?: string;
  language?: string;
  gender?: string;
  genderPreference?: string;
  minAge?: number; // Age range preferences (premium feature)
  maxAge?: number;
  interests?: string[]; // Interest tags
  queueType?: 'casual' | 'serious' | 'language' | 'gaming'; // Queue type
  nativeLanguage?: string; // For language learning
  learningLanguage?: string; // For language learning
  preferredMatchTypes?: string[]; // e.g., ['long-conversation', 'quick-chat']
  preferences?: Record<string, unknown>;
}

export interface MatchFeedbackDto {
  matchId: string;
  sessionId: string;
  rating: number; // 1-5
  tags?: string[]; // e.g., ['good-conversation', 'interesting-person', 'rude']
}

export interface WebRTCSignalDto {
  sessionId: string;
  type: 'offer' | 'answer' | 'candidate';
  data: unknown;
}

export interface ChatMessageDto {
  sessionId: string;
  message: string;
  sender?: string;
  timestamp: number;
}

export interface ReactionDto {
  sessionId: string;
  emoji: string;
  timestamp: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
  namespace: '/signaling',
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  private readonly connectedClients = new Map<string, Socket>();

  constructor(
    private readonly redisService: RedisService,
    private readonly redisPubSub: RedisPubSubService,
    @Inject(forwardRef(() => MatchmakingService))
    private readonly matchmakingService: MatchmakingService,
    @Inject(forwardRef(() => MatchAnalyticsService))
    private readonly analyticsService: MatchAnalyticsService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    // Subscribe to distributed match notifications
    await this.redisPubSub.subscribe('match:notify', (event) => {
      this.handleRemoteMatchNotify(event as MatchNotifyEvent);
    });

    // Subscribe to distributed session end events
    await this.redisPubSub.subscribe('session:end', (event) => {
      this.handleRemoteSessionEnd(event as SessionEndEvent);
    });

    // Subscribe to signal forwarding for horizontal scaling
    await this.redisPubSub.subscribe('signal:forward', (event) => {
      this.handleRemoteSignalForward(event as SignalForwardEvent);
    });

    this.logger.log(`🌐 SignalingGateway subscribed to Pub/Sub (instance: ${this.redisPubSub.getInstanceId()})`);
  }

  async handleConnection(client: Socket) {
    try {
      // Extract and validate JWT token
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn('Connection rejected: No token provided');
        client.disconnect();
        return;
      }

      const payload = await this.authService.validateToken(token);
      const deviceId = payload.deviceId;

      // Check if device is blocked
      const isBlocked = await this.redisService.isBlocked('device', deviceId);
      if (isBlocked) {
        this.logger.warn('Connection rejected: Device blocked', { deviceId });
        client.disconnect();
        return;
      }

      // Store client connection
      client.data.deviceId = deviceId;
      client.data.sessionId = null;
      client.data.peerId = null;
      this.connectedClients.set(deviceId, client);

      // Register client in Redis for horizontal scaling
      const instanceId = this.redisPubSub.getInstanceId();
      await this.redisService.registerClient(deviceId, instanceId, client.id);

      this.logger.log('Client connected', {
        deviceId,
        socketId: client.id,
        instanceId,
        totalConnections: this.connectedClients.size
      });

      // Send connection confirmation
      client.emit('connected', { deviceId, timestamp: Date.now() });

    } catch (error) {
      this.logger.error('Connection error', error.stack);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const deviceId = client.data.deviceId;
    if (deviceId) {
      // Remove from matchmaking queue if in queue
      await this.matchmakingService.removeFromQueue(deviceId);

      // Clean up session if active
      if (client.data.sessionId) {
        // 🆕 Track reputation for unexpected disconnects (treat as skip)
        await this.trackCallReputation(client.data.sessionId, deviceId, true);
        await this.cleanupSession(client.data.sessionId, deviceId);
      }

      // Clear queue update interval if active
      if (client.data.queueUpdateInterval) {
        clearInterval(client.data.queueUpdateInterval);
      }

      this.connectedClients.delete(deviceId);

      // Unregister client from Redis
      await this.redisService.unregisterClient(deviceId);

      this.logger.log('Client disconnected', {
        deviceId,
        totalConnections: this.connectedClients.size
      });
    }
  }

  @SubscribeMessage('join-queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinQueueDto,
  ) {
    const deviceId = client.data.deviceId;
    if (!deviceId) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      // Check rate limiting
      const rateLimitKey = `ratelimit:device:${deviceId}`;
      const callCount = await this.redisService.incrementRateLimit(rateLimitKey, 60);
      
      if (callCount > 10) { // Max 10 calls per minute
        client.emit('error', { message: 'Rate limit exceeded. Please wait.' });
        return;
      }

      // Get user data and premium status
      const user = await this.usersService.findOrCreate(deviceId);
      const isPremium = await this.usersService.isPremium(user.id);
      
      // 🆕 Get user reputation
      const reputation = await this.redisService.getUserReputation(user.id);

      // Add to matchmaking queue with user data
      await this.matchmakingService.addToQueue(deviceId, {
        region: data.region || 'global',
        language: data.language || 'en',
        socketId: client.id,
        deviceId,
        gender: data.gender || user.gender,
        age: user.age,
        isPremium,
        genderPreference: data.genderPreference || 'any',
        minAge: isPremium ? data.minAge : undefined, // Age range only for premium
        maxAge: isPremium ? data.maxAge : undefined,
        reputation: reputation.rating,
        interests: data.interests || [],
        queueType: data.queueType || 'casual',
        nativeLanguage: data.nativeLanguage,
        learningLanguage: data.learningLanguage,
        preferredMatchTypes: data.preferredMatchTypes,
        preferences: data.preferences || {},
      });

      const queueLength = await this.redisService.getQueueLength();
      client.emit('queue-joined', { 
        position: queueLength,
        queueLength: queueLength,
        timestamp: Date.now(),
        isPremium, // Let frontend know premium status
      });
      
      // Send periodic queue position updates every 2 seconds
      const queueUpdateInterval = setInterval(async () => {
        const currentPosition = await this.redisService.getQueueLength();
        client.emit('queue-update', {
          position: currentPosition,
          estimatedWaitTime: Math.max(5, currentPosition * 3), // Estimate 3 seconds per person in queue
        });
      }, 2000);
      
      // Store interval ID to clear it later
      client.data.queueUpdateInterval = queueUpdateInterval;

      this.logger.debug('User joined queue', { 
        deviceId, 
        isPremium,
        genderPreference: data.genderPreference,
        ...data 
      });

      // Try to find a match immediately
      await this.matchmakingService.processQueue();

    } catch (error) {
      this.logger.error('Join queue error', error.stack);
      client.emit('error', { message: 'Failed to join queue' });
    }
  }

  @SubscribeMessage('leave-queue')
  async handleLeaveQueue(@ConnectedSocket() client: Socket) {
    // Clear queue update interval
    if (client.data.queueUpdateInterval) {
      clearInterval(client.data.queueUpdateInterval);
      client.data.queueUpdateInterval = null;
    }
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    await this.matchmakingService.removeFromQueue(deviceId);
    client.emit('queue-left', { timestamp: Date.now() });
  }

  @SubscribeMessage('send-offer')
  async handleSendOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebRTCSignalDto,
  ) {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    try {
      // Store offer in Redis
      await this.redisService.storeOffer(data.sessionId, data.data);
      
      // Get peer from session
      const session = await this.redisService.getSession<{ peers: string[] }>(data.sessionId);
      if (!session) {
        client.emit('error', { message: 'Session not found' });
        return;
      }

      const peerId = session.peers.find((p: string) => p !== deviceId);
      if (!peerId) {
        client.emit('error', { message: 'Peer not found' });
        return;
      }

      // Send offer to peer (local or via Pub/Sub)
      await this.sendToPeer(peerId, 'offer', data.sessionId, data.data, deviceId);

    } catch (error) {
      this.logger.error('Send offer error', error.stack);
      client.emit('error', { message: 'Failed to send offer' });
    }
  }

  @SubscribeMessage('send-answer')
  async handleSendAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebRTCSignalDto,
  ) {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    try {
      // Store answer in Redis
      await this.redisService.storeAnswer(data.sessionId, data.data);
      
      // Get peer from session
      const session = await this.redisService.getSession<{ peers: string[] }>(data.sessionId);
      if (!session) return;

      const peerId = session.peers.find((p: string) => p !== deviceId);
      if (!peerId) return;

      // Send answer to peer (local or via Pub/Sub)
      await this.sendToPeer(peerId, 'answer', data.sessionId, data.data, deviceId);

    } catch (error) {
      this.logger.error('Send answer error', error.stack);
      client.emit('error', { message: 'Failed to send answer' });
    }
  }

  @SubscribeMessage('send-candidate')
  async handleSendCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WebRTCSignalDto,
  ) {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    try {
      // Get peer from session first to avoid storing for invalid sessions
      const session = await this.redisService.getSession<{ peers: string[] }>(data.sessionId);
      if (!session) return;
      // Store candidate in Redis
      await this.redisService.addIceCandidate(data.sessionId, deviceId, data.data);

      const peerId = session.peers.find((p: string) => p !== deviceId);
      if (!peerId) return;

      // Send candidate to peer (local or via Pub/Sub)
      await this.sendToPeer(peerId, 'candidate', data.sessionId, data.data, deviceId);

    } catch (error) {
      this.logger.error('Send candidate error', error.stack);
      client.emit('error', { message: 'Failed to send candidate' });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatMessageDto,
  ) {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    try {
      // Get peer from session
      const session = await this.redisService.getSession<{ peers: string[] }>(data.sessionId);
      if (!session) return;

      const peerId = session.peers.find((p: string) => p !== deviceId);
      if (!peerId) return;

      // Send message to peer (local or via Pub/Sub)
      await this.sendToPeer(peerId, 'message', data.sessionId, {
        message: data.message,
        sender: data.sender,
        timestamp: data.timestamp,
      }, deviceId);

    } catch (error) {
      this.logger.error('Send message error', error.stack);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('send-reaction')
  async handleSendReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReactionDto,
  ) {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    try {
      // Get peer from session
      const session = await this.redisService.getSession<{ peers: string[] }>(data.sessionId);
      if (!session) return;

      const peerId = session.peers.find((p: string) => p !== deviceId);
      if (!peerId) return;

      // Send reaction to peer (local or via Pub/Sub)
      await this.sendToPeer(peerId, 'reaction', data.sessionId, {
        emoji: data.emoji,
        timestamp: data.timestamp,
      }, deviceId);

    } catch (error) {
      this.logger.error('Send reaction error', error.stack);
      client.emit('error', { message: 'Failed to send reaction' });
    }
  }

  @SubscribeMessage('end-call')
  async handleEndCall(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; wasSkipped?: boolean }) {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    // Track reputation before cleanup
    await this.trackCallReputation(data.sessionId, deviceId, data.wasSkipped || false);

    await this.cleanupSession(data.sessionId, deviceId);
    client.emit('call-ended', { sessionId: data.sessionId });
  }

  // Match quality feedback
  @SubscribeMessage('match-feedback')
  async handleMatchFeedback(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MatchFeedbackDto,
  ) {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    try {
      // Validate rating
      if (data.rating < 1 || data.rating > 5) {
        client.emit('error', { message: 'Rating must be between 1 and 5' });
        return;
      }

      // Get session info for duration calculation
      const startTimeStr = await this.redisService.getClient().get(`session:${data.sessionId}:startTime`);
      const duration = startTimeStr
        ? Math.round((Date.now() - parseInt(startTimeStr, 10)) / 1000)
        : 0;

      // Store feedback
      await this.redisService.storeMatchFeedback(deviceId, data.matchId, {
        rating: data.rating,
        tags: data.tags,
        duration,
      });

      // Track analytics
      await this.analyticsService.trackMatchFeedback({
        matchId: data.matchId,
        userId: deviceId,
        rating: data.rating,
        tags: data.tags,
        duration,
      });

      // Update user's preferred match types based on feedback
      if (data.rating >= 4 && data.tags && data.tags.length > 0) {
        // Good rating with tags - learn preferences
        await this.updateUserMatchPreferences(deviceId, data.tags);
      }

      client.emit('feedback-received', { matchId: data.matchId, success: true });

      this.logger.log('Match feedback received', {
        userId: deviceId,
        matchId: data.matchId,
        rating: data.rating,
        tags: data.tags,
      });
    } catch (error) {
      this.logger.error('Match feedback error', error.stack);
      client.emit('error', { message: 'Failed to submit feedback' });
    }
  }

  // Update user match preferences based on positive feedback
  private async updateUserMatchPreferences(userId: string, tags: string[]): Promise<void> {
    try {
      const user = await this.usersService.findOrCreate(userId);
      // In a real implementation, you'd update user preferences in the database
      // For now, we store in Redis for quick access during matching
      const key = `user-preferences:${userId}`;
      const existingData = await this.redisService.getClient().get(key);
      const existing = existingData ? JSON.parse(existingData) : { preferredMatchTypes: [] };

      // Add new tags and keep unique
      const updatedTypes = [...new Set([...existing.preferredMatchTypes, ...tags])].slice(0, 10);
      await this.redisService.getClient().setEx(key, 86400 * 30, JSON.stringify({
        ...existing,
        preferredMatchTypes: updatedTypes,
      }));

      this.logger.debug('Updated user match preferences', { userId, preferredMatchTypes: updatedTypes });
    } catch (error) {
      this.logger.error('Failed to update user match preferences', error.stack);
    }
  }

  // Notify users that their match expired (wasn't accepted in time)
  async notifyMatchExpired(deviceId1: string, deviceId2: string, sessionId: string) {
    const client1 = this.connectedClients.get(deviceId1);
    const client2 = this.connectedClients.get(deviceId2);

    const expiredData = {
      sessionId,
      reason: 'Match expired - no response received',
      timestamp: Date.now(),
    };

    if (client1) {
      client1.emit('match-expired', expiredData);
      this.logger.log('Match expired notification sent', { deviceId: deviceId1, sessionId });
    }

    if (client2) {
      client2.emit('match-expired', expiredData);
      this.logger.log('Match expired notification sent', { deviceId: deviceId2, sessionId });
    }

    // Publish to Pub/Sub for distributed notifications
    // Note: match:expired events are local-only for now since they're less critical
    // In a full implementation, you could add a MatchExpiredEvent type to redis-pubsub.service.ts
  }

  // Helper methods
  private extractToken(client: Socket): string | null {
    const fromAuth = (client.handshake.auth as any)?.token;
    if (typeof fromAuth === 'string' && fromAuth.startsWith('Bearer ')) {
      return fromAuth.substring(7);
    }
    const authHeader = client.handshake.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  private async cleanupSession(sessionId: string, deviceId: string) {
    try {
      const session = await this.redisService.getSession<{ peers: string[] }>(sessionId);
      if (!session) return;

      // Notify peer about call end
      const peerId = session.peers.find((p: string) => p !== deviceId);
      if (peerId) {
        const peerClient = this.connectedClients.get(peerId);
        if (peerClient) {
          peerClient.emit('peer-disconnected', { sessionId });
        }
      }

      // Clean up Redis data
      await this.redisService.deleteSession(sessionId);
      await this.redisService.getClient().del(`offer:${sessionId}`);
      await this.redisService.getClient().del(`answer:${sessionId}`);
      await this.redisService.getClient().del(`session:${sessionId}:startTime`); // 🆕 Clean up start time
      
      // Clean up ICE candidates
      const keys = await this.redisService.getClient().keys(`candidates:${sessionId}:*`);
      if (keys.length > 0) {
        await this.redisService.getClient().del(keys);
      }

      this.logger.debug('Session cleaned up', { sessionId, deviceId });

    } catch (error) {
      this.logger.error('Session cleanup error', error.stack);
    }
  }

  // 🆕 Track call reputation and analytics
  private async trackCallReputation(sessionId: string, deviceId: string, wasSkipped: boolean) {
    try {
      // Get session data
      const session = await this.redisService.getSession<{ peers: string[]; matchId?: string }>(sessionId);
      if (!session) return;

      // Get start time
      const startTimeStr = await this.redisService.getClient().get(`session:${sessionId}:startTime`);
      if (!startTimeStr) return;

      const startTime = parseInt(startTimeStr, 10);
      const callDuration = Math.round((Date.now() - startTime) / 1000); // seconds

      // Get user ID from deviceId
      const user = await this.usersService.findOrCreate(deviceId);
      const peerId = session.peers.find((p: string) => p !== deviceId);

      // Update reputation for both users
      await this.redisService.updateReputation(user.id, {
        wasSkipped,
        callDuration,
      });

      if (peerId) {
        const peerUser = await this.usersService.findOrCreate(peerId);
        await this.redisService.updateReputation(peerUser.id, {
          wasSkipped,
          callDuration,
        });
      }

      // 🆕 Track analytics if matchId exists
      if (session.matchId) {
        await this.analyticsService.trackCallEnded({
          matchId: session.matchId,
          sessionId,
          wasSkipped,
          callDuration,
        });
      }

      this.logger.debug('Reputation and analytics tracked', {
        sessionId,
        matchId: session.matchId,
        userId: user.id,
        callDuration,
        wasSkipped,
      });
    } catch (error) {
      this.logger.error('Reputation tracking error', error.stack);
    }
  }

  // 🆕 Track connection success/failure
  @SubscribeMessage('connection-status')
  async handleConnectionStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; status: 'connected' | 'failed'; connectionTime?: number }
  ) {
    try {
      const session = await this.redisService.getSession<{ matchId?: string }>(data.sessionId);
      if (!session || !session.matchId) return;

      if (data.status === 'connected' && data.connectionTime) {
        await this.analyticsService.trackConnectionEstablished({
          matchId: session.matchId,
          sessionId: data.sessionId,
          connectionTime: data.connectionTime,
        });
      } else if (data.status === 'failed') {
        await this.analyticsService.trackConnectionFailed({
          matchId: session.matchId,
          sessionId: data.sessionId,
          reason: 'WebRTC connection failed',
        });
      }

      this.logger.debug('Connection status tracked', {
        sessionId: data.sessionId,
        matchId: session.matchId,
        status: data.status,
      });
    } catch (error) {
      this.logger.error('Connection status tracking error', error.stack);
    }
  }

  // 🌐 Public method for matchmaking service to notify clients (now uses Pub/Sub)
  async notifyMatch(deviceId1: string, deviceId2: string, sessionId: string) {
    // 🆕 Track session start time for reputation
    const startTime = Date.now();
    await this.redisService.getClient().setEx(
      `session:${sessionId}:startTime`,
      600, // 10 minute TTL
      startTime.toString()
    );

    // Try local notification first (this instance might have the clients)
    const client1 = this.connectedClients.get(deviceId1);
    const client2 = this.connectedClients.get(deviceId2);

    if (client1) {
      client1.data.sessionId = sessionId;
      client1.data.peerId = deviceId2;
      client1.data.sessionStartTime = startTime;
      client1.emit('matched', {
        sessionId,
        peerId: deviceId2,
        timestamp: startTime,
      });
      this.logger.log('✅ Local match notification sent', { deviceId: deviceId1 });
    }

    if (client2) {
      client2.data.sessionId = sessionId;
      client2.data.peerId = deviceId1;
      client2.data.sessionStartTime = startTime;
      client2.emit('matched', {
        sessionId,
        peerId: deviceId1,
        timestamp: startTime,
      });
      this.logger.log('✅ Local match notification sent', { deviceId: deviceId2 });
    }

    // 🌐 Publish to Pub/Sub for other instances (distributed notification)
    await this.redisPubSub.publishMatchNotify(deviceId1, deviceId2, sessionId);

    this.logger.log('🌐 Match published to Pub/Sub', { 
      deviceId1, 
      deviceId2, 
      sessionId,
      localClient1: !!client1,
      localClient2: !!client2,
    });
  }

  // 🌐 Handle match notifications from other instances
  private handleRemoteMatchNotify(event: MatchNotifyEvent) {
    try {
      const { deviceId1, deviceId2, sessionId, timestamp } = event;

      // Check if we have either client connected to THIS instance
      const client1 = this.connectedClients.get(deviceId1);
      const client2 = this.connectedClients.get(deviceId2);

      if (client1) {
        client1.data.sessionId = sessionId;
        client1.data.peerId = deviceId2;
        client1.data.sessionStartTime = timestamp;
        client1.emit('matched', {
          sessionId,
          peerId: deviceId2,
          timestamp,
        });
        this.logger.log('📥 Remote match notification delivered', { 
          deviceId: deviceId1, 
          fromInstance: event.instanceId 
        });
      }

      if (client2) {
        client2.data.sessionId = sessionId;
        client2.data.peerId = deviceId1;
        client2.data.sessionStartTime = timestamp;
        client2.emit('matched', {
          sessionId,
          peerId: deviceId1,
          timestamp,
        });
        this.logger.log('📥 Remote match notification delivered', { 
          deviceId: deviceId2, 
          fromInstance: event.instanceId 
        });
      }

      // If we don't have either client, that's fine - another instance has them
      if (!client1 && !client2) {
        this.logger.debug('Remote match event received but no local clients', {
          deviceId1,
          deviceId2,
          fromInstance: event.instanceId,
        });
      }
    } catch (error) {
      this.logger.error('Error handling remote match notification', error.stack);
    }
  }

  // 🌐 Handle session end notifications from other instances
  private handleRemoteSessionEnd(event: SessionEndEvent) {
    try {
      const { sessionId, deviceId } = event;

      // Find if we have any clients in this session
      for (const [clientDeviceId, client] of this.connectedClients.entries()) {
        if (client.data.sessionId === sessionId && clientDeviceId !== deviceId) {
          // This client's peer ended the session from another instance
          client.emit('peer-disconnected', { sessionId });
          this.logger.log('📥 Remote session end notification delivered', {
            deviceId: clientDeviceId,
            sessionId,
            fromInstance: event.instanceId
          });
        }
      }
    } catch (error) {
      this.logger.error('Error handling remote session end', error.stack);
    }
  }

  // 🌐 Handle signal forwarding from other instances
  private handleRemoteSignalForward(event: SignalForwardEvent) {
    try {
      const { targetDeviceId, signalType, sessionId, data, from } = event;

      // Check if target client is on this instance
      const targetClient = this.connectedClients.get(targetDeviceId);
      if (!targetClient) {
        // Not our client, ignore
        return;
      }

      // Forward the signal to the local client
      switch (signalType) {
        case 'offer':
          targetClient.emit('offer', { sessionId, offer: data, from });
          break;
        case 'answer':
          targetClient.emit('answer', { sessionId, answer: data, from });
          break;
        case 'candidate':
          targetClient.emit('candidate', { sessionId, candidate: data, from });
          break;
        case 'message':
          targetClient.emit('message', { sessionId, ...(data as object), from });
          break;
        case 'reaction':
          targetClient.emit('reaction', { sessionId, ...(data as object), from });
          break;
      }

      this.logger.debug('📥 Remote signal forwarded', {
        targetDeviceId,
        signalType,
        sessionId,
        fromInstance: event.instanceId,
      });
    } catch (error) {
      this.logger.error('Error handling remote signal forward', error.stack);
    }
  }

  // 🌐 Helper: Send signal to peer (local or via Pub/Sub)
  private async sendToPeer(
    peerId: string,
    signalType: 'offer' | 'answer' | 'candidate' | 'message' | 'reaction',
    sessionId: string,
    data: unknown,
    from: string,
  ): Promise<boolean> {
    // Try local first
    const localPeer = this.connectedClients.get(peerId);
    if (localPeer) {
      // Client is on this instance
      switch (signalType) {
        case 'offer':
          localPeer.emit('offer', { sessionId, offer: data, from });
          break;
        case 'answer':
          localPeer.emit('answer', { sessionId, answer: data, from });
          break;
        case 'candidate':
          localPeer.emit('candidate', { sessionId, candidate: data, from });
          break;
        case 'message':
          localPeer.emit('message', { sessionId, ...(data as object), from });
          break;
        case 'reaction':
          localPeer.emit('reaction', { sessionId, ...(data as object), from });
          break;
      }
      return true;
    }

    // Client not on this instance - publish via Pub/Sub
    await this.redisPubSub.publishSignalForward(peerId, signalType, sessionId, data, from);
    this.logger.debug('📤 Signal forwarded via Pub/Sub', { peerId, signalType, sessionId });
    return true;
  }
}
