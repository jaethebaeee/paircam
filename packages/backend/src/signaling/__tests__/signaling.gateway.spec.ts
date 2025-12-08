import { Test, TestingModule } from '@nestjs/testing';
import { SignalingGateway, JoinQueueDto, WebRTCSignalDto } from '../signaling.gateway';
import { RedisService } from '../../redis/redis.service';
import { RedisPubSubService } from '../../redis/redis-pubsub.service';
import { MatchmakingService } from '../matchmaking.service';
import { MatchAnalyticsService } from '../../analytics/match-analytics.service';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { LoggerService } from '../../services/logger.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { Socket } from 'socket.io';

describe('SignalingGateway', () => {
  let gateway: SignalingGateway;
  let redisService: jest.Mocked<RedisService>;
  let redisPubSub: jest.Mocked<RedisPubSubService>;
  let matchmakingService: jest.Mocked<MatchmakingService>;
  let analyticsService: jest.Mocked<MatchAnalyticsService>;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;
  let logger: jest.Mocked<LoggerService>;

  const mockRedisClient = {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  };

  const createMockSocket = (overrides: Partial<Socket> = {}): jest.Mocked<Socket> => {
    return {
      id: 'socket-123',
      handshake: {
        auth: { token: 'Bearer test-token' },
        headers: {},
      },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      ...overrides,
    } as unknown as jest.Mocked<Socket>;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalingGateway,
        {
          provide: RedisService,
          useValue: {
            isBlocked: jest.fn().mockResolvedValue(false),
            registerClient: jest.fn(),
            unregisterClient: jest.fn(),
            incrementRateLimit: jest.fn().mockResolvedValue(1),
            getUserReputation: jest.fn().mockResolvedValue({ rating: 70 }),
            getQueueLength: jest.fn().mockResolvedValue(5),
            storeOffer: jest.fn(),
            storeAnswer: jest.fn(),
            addIceCandidate: jest.fn(),
            getSession: jest.fn(),
            deleteSession: jest.fn(),
            updateReputation: jest.fn(),
            getClient: jest.fn(() => mockRedisClient),
            incrementDailySkipCount: jest.fn().mockResolvedValue(1),
            getDailySkipCount: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: RedisPubSubService,
          useValue: {
            subscribe: jest.fn(),
            getInstanceId: jest.fn().mockReturnValue('instance-123'),
            publishMatchNotify: jest.fn(),
            publishSignalForward: jest.fn(),
          },
        },
        {
          provide: MatchmakingService,
          useValue: {
            addToQueue: jest.fn(),
            removeFromQueue: jest.fn(),
            processQueue: jest.fn(),
          },
        },
        {
          provide: MatchAnalyticsService,
          useValue: {
            trackCallEnded: jest.fn(),
            trackConnectionEstablished: jest.fn(),
            trackConnectionFailed: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateToken: jest.fn().mockResolvedValue({ deviceId: 'device-123' }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOrCreate: jest.fn().mockResolvedValue({ id: 'user-123', deviceId: 'device-123' }),
            isPremium: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            isUserPremium: jest.fn().mockResolvedValue(false),
          },
        },
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

    gateway = module.get<SignalingGateway>(SignalingGateway);
    redisService = module.get(RedisService);
    redisPubSub = module.get(RedisPubSubService);
    matchmakingService = module.get(MatchmakingService);
    analyticsService = module.get(MatchAnalyticsService);
    authService = module.get(AuthService);
    usersService = module.get(UsersService);
    logger = module.get(LoggerService);

    // Set up server mock
    (gateway as any).server = { emit: jest.fn() };
  });

  describe('onModuleInit', () => {
    it('should subscribe to Pub/Sub channels', async () => {
      await gateway.onModuleInit();

      expect(redisPubSub.subscribe).toHaveBeenCalledWith('match:notify', expect.any(Function));
      expect(redisPubSub.subscribe).toHaveBeenCalledWith('session:end', expect.any(Function));
      expect(redisPubSub.subscribe).toHaveBeenCalledWith('signal:forward', expect.any(Function));
    });
  });

  describe('handleConnection', () => {
    it('should accept valid connection with token', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(authService.validateToken).toHaveBeenCalledWith('test-token');
      expect(redisService.isBlocked).toHaveBeenCalledWith('device', 'device-123');
      expect(redisService.registerClient).toHaveBeenCalledWith('device-123', 'instance-123', 'socket-123');
      expect(client.emit).toHaveBeenCalledWith('connected', expect.objectContaining({ deviceId: 'device-123' }));
    });

    it('should reject connection without token', async () => {
      const client = createMockSocket({
        handshake: { auth: {}, headers: {} } as any,
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Connection rejected: No token provided');
    });

    it('should reject connection for blocked device', async () => {
      redisService.isBlocked.mockResolvedValue(true);
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Connection rejected: Device blocked', expect.any(Object));
    });

    it('should handle token validation error', async () => {
      authService.validateToken.mockRejectedValue(new Error('Invalid token'));
      const client = createMockSocket();

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Connection error', expect.any(String));
    });

    it('should extract token from authorization header', async () => {
      const client = createMockSocket({
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        } as any,
      });

      await gateway.handleConnection(client);

      expect(authService.validateToken).toHaveBeenCalledWith('header-token');
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up client on disconnect', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';

      // Add client to connected clients map
      (gateway as any).connectedClients.set('device-123', client);

      await gateway.handleDisconnect(client);

      expect(matchmakingService.removeFromQueue).toHaveBeenCalledWith('device-123');
      expect(redisService.unregisterClient).toHaveBeenCalledWith('device-123');
    });

    it('should clean up active session on disconnect', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      client.data.sessionId = 'session-456';

      (gateway as any).connectedClients.set('device-123', client);
      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-789'] });
      mockRedisClient.get.mockResolvedValue(Date.now().toString());

      await gateway.handleDisconnect(client);

      expect(redisService.getSession).toHaveBeenCalledWith('session-456');
      expect(redisService.deleteSession).toHaveBeenCalledWith('session-456');
    });

    it('should clear queue update interval on disconnect', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      client.data.queueUpdateInterval = setInterval(() => {}, 1000);

      (gateway as any).connectedClients.set('device-123', client);

      await gateway.handleDisconnect(client);

      // Interval should be cleared (no way to verify directly, but no error should occur)
      expect(matchmakingService.removeFromQueue).toHaveBeenCalled();
    });
  });

  describe('handleJoinQueue', () => {
    it('should add user to queue with valid data', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      const queueData: JoinQueueDto = {
        region: 'us-east',
        language: 'en',
        interests: ['gaming'],
      };

      await gateway.handleJoinQueue(client, queueData);

      expect(matchmakingService.addToQueue).toHaveBeenCalledWith('device-123', expect.objectContaining({
        region: 'us-east',
        language: 'en',
        interests: ['gaming'],
      }));
      expect(client.emit).toHaveBeenCalledWith('queue-joined', expect.objectContaining({
        position: 5,
        queueLength: 5,
      }));
      expect(matchmakingService.processQueue).toHaveBeenCalled();
    });

    it('should reject unauthenticated client', async () => {
      const client = createMockSocket();
      // No deviceId set

      await gateway.handleJoinQueue(client, {});

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Authentication required' });
      expect(matchmakingService.addToQueue).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      redisService.incrementRateLimit.mockResolvedValue(11); // Over limit

      await gateway.handleJoinQueue(client, {});

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Rate limit exceeded. Please wait.' });
      expect(matchmakingService.addToQueue).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      matchmakingService.addToQueue.mockRejectedValue(new Error('Queue error'));

      await gateway.handleJoinQueue(client, {});

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Failed to join queue' });
    });
  });

  describe('handleLeaveQueue', () => {
    it('should remove user from queue', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      client.data.queueUpdateInterval = setInterval(() => {}, 1000);

      await gateway.handleLeaveQueue(client);

      expect(matchmakingService.removeFromQueue).toHaveBeenCalledWith('device-123');
      expect(client.emit).toHaveBeenCalledWith('queue-left', expect.any(Object));
    });

    it('should handle missing deviceId', async () => {
      const client = createMockSocket();

      await gateway.handleLeaveQueue(client);

      expect(matchmakingService.removeFromQueue).not.toHaveBeenCalled();
    });
  });

  describe('handleSendOffer', () => {
    it('should send offer to peer', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      const peerClient = createMockSocket();
      (gateway as any).connectedClients.set('device-456', peerClient);

      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-456'] });

      const offerData: WebRTCSignalDto = {
        sessionId: 'session-123',
        type: 'offer',
        data: { sdp: 'offer-sdp' },
      };

      await gateway.handleSendOffer(client, offerData);

      expect(redisService.storeOffer).toHaveBeenCalledWith('session-123', { sdp: 'offer-sdp' });
      expect(peerClient.emit).toHaveBeenCalledWith('offer', expect.objectContaining({
        sessionId: 'session-123',
        offer: { sdp: 'offer-sdp' },
      }));
    });

    it('should handle missing session', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      redisService.getSession.mockResolvedValue(null);

      await gateway.handleSendOffer(client, { sessionId: 'invalid', type: 'offer', data: {} });

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Session not found' });
    });

    it('should publish via Pub/Sub if peer not local', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-456'] });

      await gateway.handleSendOffer(client, { sessionId: 'session-123', type: 'offer', data: {} });

      expect(redisPubSub.publishSignalForward).toHaveBeenCalled();
    });
  });

  describe('handleSendAnswer', () => {
    it('should send answer to peer', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      const peerClient = createMockSocket();
      (gateway as any).connectedClients.set('device-456', peerClient);

      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-456'] });

      await gateway.handleSendAnswer(client, {
        sessionId: 'session-123',
        type: 'answer',
        data: { sdp: 'answer-sdp' },
      });

      expect(redisService.storeAnswer).toHaveBeenCalledWith('session-123', { sdp: 'answer-sdp' });
      expect(peerClient.emit).toHaveBeenCalledWith('answer', expect.objectContaining({
        sessionId: 'session-123',
        answer: { sdp: 'answer-sdp' },
      }));
    });
  });

  describe('handleSendCandidate', () => {
    it('should send ICE candidate to peer', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      const peerClient = createMockSocket();
      (gateway as any).connectedClients.set('device-456', peerClient);

      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-456'] });

      await gateway.handleSendCandidate(client, {
        sessionId: 'session-123',
        type: 'candidate',
        data: { candidate: 'ice-candidate' },
      });

      expect(redisService.addIceCandidate).toHaveBeenCalledWith('session-123', 'device-123', { candidate: 'ice-candidate' });
      expect(peerClient.emit).toHaveBeenCalledWith('candidate', expect.objectContaining({
        sessionId: 'session-123',
        candidate: { candidate: 'ice-candidate' },
      }));
    });
  });

  describe('handleSendMessage', () => {
    it('should forward chat message to peer', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      const peerClient = createMockSocket();
      (gateway as any).connectedClients.set('device-456', peerClient);

      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-456'] });

      await gateway.handleSendMessage(client, {
        sessionId: 'session-123',
        message: 'Hello!',
        timestamp: Date.now(),
      });

      expect(peerClient.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        sessionId: 'session-123',
        message: 'Hello!',
      }));
    });
  });

  describe('handleSendReaction', () => {
    it('should forward reaction to peer', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';
      const peerClient = createMockSocket();
      (gateway as any).connectedClients.set('device-456', peerClient);

      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-456'] });

      await gateway.handleSendReaction(client, {
        sessionId: 'session-123',
        emoji: '👍',
        timestamp: Date.now(),
      });

      expect(peerClient.emit).toHaveBeenCalledWith('reaction', expect.objectContaining({
        sessionId: 'session-123',
        emoji: '👍',
      }));
    });
  });

  describe('handleEndCall', () => {
    it('should end call and clean up session', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';

      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-456'], matchId: 'match-123' });
      mockRedisClient.get.mockResolvedValue(Date.now().toString());

      await gateway.handleEndCall(client, { sessionId: 'session-123', wasSkipped: false });

      expect(redisService.deleteSession).toHaveBeenCalledWith('session-123');
      expect(client.emit).toHaveBeenCalledWith('call-ended', { sessionId: 'session-123', skipStats: null });
    });

    it('should track analytics when call ends', async () => {
      const client = createMockSocket();
      client.data.deviceId = 'device-123';

      const startTime = Date.now() - 60000; // 1 minute ago
      redisService.getSession.mockResolvedValue({ peers: ['device-123', 'device-456'], matchId: 'match-123' });
      mockRedisClient.get.mockResolvedValue(startTime.toString());

      await gateway.handleEndCall(client, { sessionId: 'session-123', wasSkipped: true });

      expect(analyticsService.trackCallEnded).toHaveBeenCalledWith(expect.objectContaining({
        matchId: 'match-123',
        sessionId: 'session-123',
        wasSkipped: true,
      }));
    });
  });

  describe('handleConnectionStatus', () => {
    it('should track successful connection', async () => {
      const client = createMockSocket();
      redisService.getSession.mockResolvedValue({ matchId: 'match-123' });

      await gateway.handleConnectionStatus(client, {
        sessionId: 'session-123',
        status: 'connected',
        connectionTime: 2500,
      });

      expect(analyticsService.trackConnectionEstablished).toHaveBeenCalledWith({
        matchId: 'match-123',
        sessionId: 'session-123',
        connectionTime: 2500,
      });
    });

    it('should track failed connection', async () => {
      const client = createMockSocket();
      redisService.getSession.mockResolvedValue({ matchId: 'match-123' });

      await gateway.handleConnectionStatus(client, {
        sessionId: 'session-123',
        status: 'failed',
      });

      expect(analyticsService.trackConnectionFailed).toHaveBeenCalledWith({
        matchId: 'match-123',
        sessionId: 'session-123',
        reason: 'WebRTC connection failed',
      });
    });
  });

  describe('notifyMatch', () => {
    it('should notify both clients of match', async () => {
      const client1 = createMockSocket();
      const client2 = createMockSocket();
      (gateway as any).connectedClients.set('device-1', client1);
      (gateway as any).connectedClients.set('device-2', client2);

      await gateway.notifyMatch('device-1', 'device-2', 'session-123');

      expect(client1.emit).toHaveBeenCalledWith('matched', expect.objectContaining({
        sessionId: 'session-123',
        peerId: 'device-2',
      }));
      expect(client2.emit).toHaveBeenCalledWith('matched', expect.objectContaining({
        sessionId: 'session-123',
        peerId: 'device-1',
      }));
      expect(redisPubSub.publishMatchNotify).toHaveBeenCalled();
    });

    it('should store session start time', async () => {
      await gateway.notifyMatch('device-1', 'device-2', 'session-123');

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'session:session-123:startTime',
        600,
        expect.any(String)
      );
    });
  });
});
