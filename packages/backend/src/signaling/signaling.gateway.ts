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
import { RedisPubSubService, MatchNotifyEvent, SessionEndEvent } from '../redis/redis-pubsub.service';
import { MatchmakingService } from './matchmaking.service';
import { MatchAnalyticsService } from '../analytics/match-analytics.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

export interface JoinQueueDto {
  region?: string;
  language?: string;
  gender?: string;
  genderPreference?: string;
  interests?: string[]; // 🆕 Interest tags
  queueType?: 'casual' | 'serious' | 'language' | 'gaming'; // 🆕 Queue type
  nativeLanguage?: string; // 🆕 For language learning
  learningLanguage?: string; // 🆕 For language learning
  preferences?: Record<string, unknown>;
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

      this.logger.log('Client connected', { 
        deviceId, 
        socketId: client.id,
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
        reputation: reputation.rating,
        interests: data.interests || [], // 🆕 Interest tags
        queueType: data.queueType || 'casual', // 🆕 Queue type
        nativeLanguage: data.nativeLanguage, // 🆕
        learningLanguage: data.learningLanguage, // 🆕
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

      // Send offer to peer
      const peerClient = this.connectedClients.get(peerId);
      if (peerClient) {
        peerClient.emit('offer', {
          sessionId: data.sessionId,
          offer: data.data,
          from: deviceId,
        });
      }

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

      // Send answer to peer
      const peerClient = this.connectedClients.get(peerId);
      if (peerClient) {
        peerClient.emit('answer', {
          sessionId: data.sessionId,
          answer: data.data,
          from: deviceId,
        });
      }

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

      // Send candidate to peer
      const peerClient = this.connectedClients.get(peerId);
      if (peerClient) {
        peerClient.emit('candidate', {
          sessionId: data.sessionId,
          candidate: data.data,
          from: deviceId,
        });
      }

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

      // Send message to peer
      const peerClient = this.connectedClients.get(peerId);
      if (peerClient) {
        peerClient.emit('message', {
          sessionId: data.sessionId,
          message: data.message,
          from: deviceId,
          sender: data.sender,  // ✅ Forward sender name
          timestamp: data.timestamp,
        });
      }

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

      // Send reaction to peer
      const peerClient = this.connectedClients.get(peerId);
      if (peerClient) {
        peerClient.emit('reaction', {
          sessionId: data.sessionId,
          emoji: data.emoji,
          from: deviceId,
          timestamp: data.timestamp,
        });
      }

    } catch (error) {
      this.logger.error('Send reaction error', error.stack);
      client.emit('error', { message: 'Failed to send reaction' });
    }
  }

  @SubscribeMessage('end-call')
  async handleEndCall(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string; wasSkipped?: boolean }) {
    const deviceId = client.data.deviceId;
    if (!deviceId) return;

    // 🆕 Track reputation before cleanup
    await this.trackCallReputation(data.sessionId, deviceId, data.wasSkipped || false);

    await this.cleanupSession(data.sessionId, deviceId);
    client.emit('call-ended', { sessionId: data.sessionId });
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
}
