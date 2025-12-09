# PairCam LiveKit Migration Plan (100% Open Source)

## Overview

This document outlines the complete migration from custom WebRTC signaling to self-hosted LiveKit.

**Benefits:**
- ICE restart & reconnection (automatic)
- Simulcast (adaptive quality)
- Recording capability
- 99%+ connection success rate
- ~1,700 lines of code removed
- $15-50/mo infrastructure (vs $200-500 for TURN)

---

## Phase 1: Infrastructure Setup

### 1.1 Server Requirements

**Minimum (100 concurrent 1:1 calls):**
- 4 vCPU
- 8GB RAM
- 100GB SSD
- Ubuntu 22.04 LTS

**Recommended Providers:**
| Provider | Specs | Monthly |
|----------|-------|---------|
| Hetzner CX31 | 4 vCPU, 8GB | €15 (~$16) |
| DigitalOcean | 4 vCPU, 8GB | $48 |
| Vultr | 4 vCPU, 8GB | $48 |

### 1.2 Docker Compose Setup

Create `infrastructure/livekit/docker-compose.yml`:

```yaml
version: '3.8'

services:
  livekit:
    image: livekit/livekit-server:latest
    container_name: livekit-server
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
    command: --config /etc/livekit.yaml
    environment:
      - LIVEKIT_KEYS=${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}

  redis:
    image: redis:7-alpine
    container_name: livekit-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  # Optional: Recording service (egress)
  livekit-egress:
    image: livekit/egress:latest
    container_name: livekit-egress
    restart: unless-stopped
    network_mode: host
    environment:
      - EGRESS_CONFIG_FILE=/etc/egress.yaml
    volumes:
      - ./egress.yaml:/etc/egress.yaml
      - ./recordings:/recordings
    depends_on:
      - livekit
      - redis

  # Caddy for automatic HTTPS
  caddy:
    image: caddy:2-alpine
    container_name: livekit-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config

volumes:
  redis-data:
  caddy-data:
  caddy-config:
```

### 1.3 LiveKit Configuration

Create `infrastructure/livekit/livekit.yaml`:

```yaml
# LiveKit Server Configuration
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  tcp_port: 7881
  use_external_ip: true
  enable_loopback_candidate: false

redis:
  address: 127.0.0.1:6379

keys:
  # Generated with: openssl rand -base64 32
  APIxxxxxxxxxxxxxxxx: SecretKeyxxxxxxxxxxxxxxxxxxxxxxxx

logging:
  level: info
  pion_level: warn

room:
  # Auto-close empty rooms after 5 minutes
  empty_timeout: 300
  # Max 2 participants per room (1:1 chat)
  max_participants: 2

turn:
  enabled: true
  domain: turn.paircam.live
  tls_port: 5349
  udp_port: 3478
  # Use same secret as main server
  external_tls: true

webhook:
  # Notify backend when room events happen
  urls:
    - https://api.paircam.live/webhooks/livekit
  api_key: APIxxxxxxxxxxxxxxxx
```

### 1.4 Egress (Recording) Configuration

Create `infrastructure/livekit/egress.yaml`:

```yaml
log_level: info
api_key: APIxxxxxxxxxxxxxxxx
api_secret: SecretKeyxxxxxxxxxxxxxxxxxxxxxxxx
ws_url: ws://localhost:7880

# S3-compatible storage (optional - use local for now)
# s3:
#   access_key: xxx
#   secret: xxx
#   region: us-east-1
#   bucket: paircam-recordings

# Local file storage
file_output:
  local: true
  base_path: /recordings
```

### 1.5 Caddy Configuration (HTTPS)

Create `infrastructure/livekit/Caddyfile`:

```
livekit.paircam.live {
    reverse_proxy localhost:7880
}

turn.paircam.live {
    reverse_proxy localhost:5349
}
```

### 1.6 Environment Variables

Add to `.env.production`:

```bash
# LiveKit Configuration
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=SecretKeyxxxxxxxxxxxxxxxxxxxxxxxx
LIVEKIT_WS_URL=wss://livekit.paircam.live
LIVEKIT_HTTP_URL=https://livekit.paircam.live
```

---

## Phase 2: Backend Changes

### 2.1 Install Dependencies

```bash
cd packages/backend
npm install livekit-server-sdk
```

### 2.2 Create LiveKit Module

Create `packages/backend/src/livekit/livekit.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { LiveKitService } from './livekit.service';
import { LiveKitController } from './livekit.controller';

@Module({
  providers: [LiveKitService],
  controllers: [LiveKitController],
  exports: [LiveKitService],
})
export class LiveKitModule {}
```

### 2.3 Create LiveKit Service

Create `packages/backend/src/livekit/livekit.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
import { LoggerService } from '../services/logger.service';
import { env } from '../env';

export interface RoomTokens {
  roomName: string;
  token1: string;
  token2: string;
}

@Injectable()
export class LiveKitService {
  private readonly roomService: RoomServiceClient;
  private readonly webhookReceiver: WebhookReceiver;

  constructor(private readonly logger: LoggerService) {
    this.roomService = new RoomServiceClient(
      env.LIVEKIT_HTTP_URL,
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    );
    this.webhookReceiver = new WebhookReceiver(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
    );
  }

  /**
   * Create a room and generate tokens for both participants
   */
  async createRoomForMatch(
    sessionId: string,
    user1Id: string,
    user2Id: string,
  ): Promise<RoomTokens> {
    const roomName = `session-${sessionId}`;

    // Create room with 2 participant limit
    await this.roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 2,
    });

    // Generate tokens for both participants
    const token1 = this.generateToken(roomName, user1Id);
    const token2 = this.generateToken(roomName, user2Id);

    this.logger.log('LiveKit room created', { roomName, user1Id, user2Id });

    return { roomName, token1, token2 };
  }

  /**
   * Generate access token for a participant
   */
  generateToken(roomName: string, participantId: string): string {
    const token = new AccessToken(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET,
      {
        identity: participantId,
        ttl: '10m', // 10 minute expiry
      },
    );

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true, // For chat messages
    });

    return token.toJwt();
  }

  /**
   * Close a room (when call ends)
   */
  async closeRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
      this.logger.log('LiveKit room closed', { roomName });
    } catch (error) {
      this.logger.warn('Failed to close room', { roomName, error: error.message });
    }
  }

  /**
   * Get room info
   */
  async getRoomInfo(roomName: string) {
    try {
      const rooms = await this.roomService.listRooms([roomName]);
      return rooms[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Start recording a room
   */
  async startRecording(roomName: string): Promise<string | null> {
    try {
      // This requires egress service running
      const { egressId } = await this.roomService.startRoomCompositeEgress(
        roomName,
        { file: { filepath: `/recordings/${roomName}-{time}.mp4` } },
      );
      this.logger.log('Recording started', { roomName, egressId });
      return egressId;
    } catch (error) {
      this.logger.warn('Failed to start recording', { roomName, error: error.message });
      return null;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(body: string, authHeader: string): boolean {
    try {
      this.webhookReceiver.receive(body, authHeader);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(body: string, authHeader: string) {
    return this.webhookReceiver.receive(body, authHeader);
  }
}
```

### 2.4 Create LiveKit Controller

Create `packages/backend/src/livekit/livekit.controller.ts`:

```typescript
import { Controller, Post, Body, Headers, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { LiveKitService } from './livekit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LoggerService } from '../services/logger.service';

@Controller('livekit')
export class LiveKitController {
  constructor(
    private readonly liveKitService: LiveKitService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Generate token for joining a room
   * Called by frontend after matchmaking
   */
  @Post('token')
  @UseGuards(JwtAuthGuard)
  async generateToken(
    @Body() body: { roomName: string; participantId: string },
  ) {
    const token = this.liveKitService.generateToken(
      body.roomName,
      body.participantId,
    );
    return { token };
  }

  /**
   * Handle LiveKit webhooks
   * Events: room_started, room_finished, participant_joined, participant_left, etc.
   */
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('Authorization') authHeader: string,
  ) {
    const rawBody = req.rawBody?.toString() || '';

    if (!this.liveKitService.verifyWebhook(rawBody, authHeader)) {
      this.logger.warn('Invalid webhook signature');
      return { error: 'Invalid signature' };
    }

    const event = this.liveKitService.parseWebhookEvent(rawBody, authHeader);

    this.logger.log('LiveKit webhook received', {
      event: event.event,
      room: event.room?.name,
    });

    // Handle different events
    switch (event.event) {
      case 'room_finished':
        // Room closed - could trigger analytics
        break;
      case 'participant_left':
        // Participant left - notify remaining participant
        break;
      case 'track_published':
        // Track published - could trigger moderation
        break;
    }

    return { received: true };
  }
}
```

### 2.5 Update Matchmaking Service

Modify `packages/backend/src/signaling/matchmaking.service.ts`:

```typescript
// Add import
import { LiveKitService } from '../livekit/livekit.service';

// Add to constructor
constructor(
  // ... existing deps
  private readonly liveKitService: LiveKitService,
) {}

// Replace createSession method
private async createSession(user1: QueueUser, user2: QueueUser, compatibilityScore?: number): Promise<void> {
  const sessionId = uuidv4();

  // Create LiveKit room and get tokens
  const { roomName, token1, token2 } = await this.liveKitService.createRoomForMatch(
    sessionId,
    user1.userId,
    user2.userId,
  );

  const sessionData = {
    id: sessionId,
    roomName, // LiveKit room name
    peers: [user1.userId, user2.userId],
    createdAt: Date.now(),
    region: user1.region,
    language: user1.language,
  };

  // Store session in Redis
  await this.redisService.createSession(sessionId, sessionData, 600); // 10 min TTL

  // Notify both users with their tokens
  await this.notifyMatchWithTokens(user1, user2, sessionId, roomName, token1, token2);

  this.logger.log('LiveKit session created', {
    sessionId,
    roomName,
    user1: user1.userId,
    user2: user2.userId,
    compatibilityScore,
  });
}

// New method to notify with tokens
private async notifyMatchWithTokens(
  user1: QueueUser,
  user2: QueueUser,
  sessionId: string,
  roomName: string,
  token1: string,
  token2: string,
): Promise<void> {
  // Emit to user1
  const client1 = this.connectedClients.get(user1.deviceId);
  if (client1) {
    client1.emit('matched', {
      sessionId,
      roomName,
      livekitToken: token1,
      livekitUrl: process.env.LIVEKIT_WS_URL,
      peerId: user2.userId,
      timestamp: Date.now(),
    });
  }

  // Emit to user2
  const client2 = this.connectedClients.get(user2.deviceId);
  if (client2) {
    client2.emit('matched', {
      sessionId,
      roomName,
      livekitToken: token2,
      livekitUrl: process.env.LIVEKIT_WS_URL,
      peerId: user1.userId,
      timestamp: Date.now(),
    });
  }
}
```

### 2.6 Update App Module

Modify `packages/backend/src/app.module.ts`:

```typescript
import { LiveKitModule } from './livekit/livekit.module';

@Module({
  imports: [
    // ... existing imports
    LiveKitModule,
  ],
})
export class AppModule {}
```

### 2.7 Update Environment Validation

Add to `packages/backend/src/env.ts`:

```typescript
// Add to EnvSchema
LIVEKIT_API_KEY: z.string().min(1),
LIVEKIT_API_SECRET: z.string().min(32),
LIVEKIT_WS_URL: z.string().url(),
LIVEKIT_HTTP_URL: z.string().url(),
```

---

## Phase 3: Frontend Changes

### 3.1 Install Dependencies

```bash
cd packages/frontend
npm install @livekit/components-react @livekit/components-styles livekit-client
```

### 3.2 Create LiveKit Video Room Component

Create `packages/frontend/src/components/VideoChat/LiveKitRoom.tsx`:

```tsx
import { useEffect, useState, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useTracks,
  useRoomContext,
  useParticipants,
  useDataChannel,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Track, RoomEvent, DataPacket_Kind } from 'livekit-client';
import '@livekit/components-styles';

interface LiveKitVideoRoomProps {
  token: string;
  serverUrl: string;
  roomName: string;
  userName: string;
  onDisconnected: () => void;
  onMessage: (message: string, sender: string) => void;
  isTextMode?: boolean;
}

// Inner component that uses LiveKit hooks
function VideoRoom({
  userName,
  onMessage,
  isTextMode,
}: {
  userName: string;
  onMessage: (message: string, sender: string) => void;
  isTextMode?: boolean;
}) {
  const room = useRoomContext();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

  // Data channel for chat
  const { send, message } = useDataChannel('chat');

  // Handle incoming messages
  useEffect(() => {
    if (message) {
      try {
        const data = JSON.parse(new TextDecoder().decode(message.payload));
        onMessage(data.text, data.sender);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    }
  }, [message, onMessage]);

  // Send chat message
  const sendMessage = useCallback((text: string) => {
    const payload = JSON.stringify({ text, sender: userName });
    send(new TextEncoder().encode(payload), { reliable: true });
  }, [send, userName]);

  // Expose sendMessage to parent
  useEffect(() => {
    (window as any).__livekitSendMessage = sendMessage;
    return () => {
      delete (window as any).__livekitSendMessage;
    };
  }, [sendMessage]);

  // Get local and remote tracks
  const localVideoTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera
  );
  const remoteVideoTrack = tracks.find(
    (t) => !t.participant.isLocal && t.source === Track.Source.Camera
  );
  const localAudioTrack = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Microphone
  );
  const remoteAudioTrack = tracks.find(
    (t) => !t.participant.isLocal && t.source === Track.Source.Microphone
  );

  const remoteParticipant = participants.find((p) => !p.isLocal);

  if (isTextMode) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white">Connected to {remoteParticipant?.identity || 'stranger'}</p>
        <RoomAudioRenderer />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-900">
      {/* Remote Video (Main) */}
      <div className="absolute inset-0">
        {remoteVideoTrack ? (
          <VideoTrack
            trackRef={remoteVideoTrack}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-slate-800">
            <div className="text-center">
              <div className="w-24 h-24 bg-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl text-slate-400">
                  {remoteParticipant?.identity?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <p className="text-slate-400">
                {remoteParticipant ? 'Camera off' : 'Waiting for partner...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute bottom-24 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
        {localVideoTrack ? (
          <VideoTrack
            trackRef={localVideoTrack}
            className="h-full w-full object-cover mirror"
          />
        ) : (
          <div className="h-full w-full bg-slate-700 flex items-center justify-center">
            <span className="text-slate-400 text-sm">Camera off</span>
          </div>
        )}
      </div>

      {/* Audio tracks */}
      {remoteAudioTrack && <AudioTrack trackRef={remoteAudioTrack} />}
      <RoomAudioRenderer />

      {/* Connection quality indicator */}
      {remoteParticipant && (
        <div className="absolute top-4 left-4 bg-black/50 rounded-full px-3 py-1">
          <span className="text-white text-sm">
            {remoteParticipant.connectionQuality === 'excellent' && '●●●●'}
            {remoteParticipant.connectionQuality === 'good' && '●●●○'}
            {remoteParticipant.connectionQuality === 'poor' && '●●○○'}
            {remoteParticipant.connectionQuality === 'unknown' && '●○○○'}
          </span>
        </div>
      )}
    </div>
  );
}

// Main component with LiveKitRoom wrapper
export default function LiveKitVideoRoom({
  token,
  serverUrl,
  roomName,
  userName,
  onDisconnected,
  onMessage,
  isTextMode = false,
}: LiveKitVideoRoomProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      video={!isTextMode}
      audio={true}
      onDisconnected={onDisconnected}
      onError={(err) => {
        console.error('LiveKit error:', err);
        setError(err.message);
      }}
      options={{
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 640, height: 480, frameRate: 24 },
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }}
    >
      {error ? (
        <div className="h-full flex items-center justify-center bg-slate-900">
          <div className="text-center text-red-400">
            <p>Connection error: {error}</p>
            <button
              onClick={onDisconnected}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            >
              Leave Room
            </button>
          </div>
        </div>
      ) : (
        <VideoRoom
          userName={userName}
          onMessage={onMessage}
          isTextMode={isTextMode}
        />
      )}
    </LiveKitRoom>
  );
}
```

### 3.3 Update VideoChat Component

Replace most of `packages/frontend/src/components/VideoChat/index.tsx`:

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useMatchmaking } from '../../hooks/useMatchmaking'; // New simplified hook
import { API_URL } from '../../config/api';
import LiveKitVideoRoom from './LiveKitRoom';
import VideoControls from './VideoControls';
import ChatPanel from './ChatPanel';
import WaitingQueue from '../WaitingQueue';
import ReportModal from '../ReportModal';
import BlockModal from '../BlockModal';
import { blockUser } from '../../api/blocking';

interface VideoChatProps {
  onStopChatting: () => void;
  userName: string;
  userGender?: string;
  genderPreference?: string;
  interests?: string[];
  queueType?: 'casual' | 'serious' | 'language' | 'gaming';
  nativeLanguage?: string;
  learningLanguage?: string;
  isTextMode?: boolean;
  showWaitingQueue?: boolean;
  onMatched?: () => void;
  onWaitingCancel?: () => void;
}

interface MatchData {
  sessionId: string;
  roomName: string;
  livekitToken: string;
  livekitUrl: string;
  peerId: string;
}

export default function VideoChat({
  onStopChatting,
  userName,
  userGender,
  genderPreference,
  interests = [],
  queueType = 'casual',
  nativeLanguage,
  learningLanguage,
  isTextMode = false,
  showWaitingQueue = false,
  onMatched,
  onWaitingCancel,
}: VideoChatProps) {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [messages, setMessages] = useState<Array<{ text: string; isMine: boolean; sender?: string }>>([]);
  const [showChat, setShowChat] = useState(isTextMode);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!isTextMode);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { accessToken, authenticate } = useAuth();

  // Simplified matchmaking hook (just handles queue joining)
  const {
    connected,
    queueStatus,
    joinQueue,
    leaveQueue,
  } = useMatchmaking({
    accessToken,
    onMatched: (data: MatchData) => {
      setMatch(data);
      onMatched?.();
    },
  });

  // Authenticate on mount
  useEffect(() => {
    authenticate();
  }, [authenticate]);

  // Join queue when connected
  useEffect(() => {
    if (connected && !match) {
      joinQueue({
        region: 'global',
        language: 'en',
        gender: userGender,
        genderPreference,
        interests,
        queueType,
        nativeLanguage,
        learningLanguage,
      });
    }
  }, [connected, match, joinQueue, userGender, genderPreference, interests, queueType, nativeLanguage, learningLanguage]);

  // Handle incoming chat messages from LiveKit data channel
  const handleMessage = useCallback((text: string, sender: string) => {
    setMessages((prev) => [...prev, { text, isMine: false, sender }]);
  }, []);

  // Send message via LiveKit data channel
  const handleSendMessage = useCallback((text: string) => {
    if ((window as any).__livekitSendMessage) {
      (window as any).__livekitSendMessage(text);
      setMessages((prev) => [...prev, { text, isMine: true, sender: userName }]);
    }
  }, [userName]);

  // Handle disconnect from LiveKit
  const handleDisconnected = useCallback(() => {
    setMatch(null);
    setMessages([]);
    // Rejoin queue
    if (connected) {
      joinQueue({
        region: 'global',
        language: 'en',
        gender: userGender,
        genderPreference,
        interests,
        queueType,
        nativeLanguage,
        learningLanguage,
      });
    }
  }, [connected, joinQueue, userGender, genderPreference, interests, queueType, nativeLanguage, learningLanguage]);

  // Skip to next user
  const handleNext = useCallback(() => {
    if (isSkipping) return;
    setIsSkipping(true);
    setMatch(null);
    setMessages([]);

    joinQueue({
      region: 'global',
      language: 'en',
      gender: userGender,
      genderPreference,
      interests,
      queueType,
      nativeLanguage,
      learningLanguage,
    });

    skipTimeoutRef.current = setTimeout(() => {
      setIsSkipping(false);
    }, 2000);
  }, [isSkipping, joinQueue, userGender, genderPreference, interests, queueType, nativeLanguage, learningLanguage]);

  // Stop chatting
  const handleStopChatting = useCallback(() => {
    leaveQueue();
    setMatch(null);
    onStopChatting();
  }, [leaveQueue, onStopChatting]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current);
      }
    };
  }, []);

  // Show waiting queue
  if (showWaitingQueue && !match) {
    return (
      <WaitingQueue
        queuePosition={queueStatus?.position}
        estimatedWaitTime={undefined}
        onCancel={onWaitingCancel || onStopChatting}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-slate-900 relative">
      {/* LiveKit Video Room */}
      {match ? (
        <LiveKitVideoRoom
          token={match.livekitToken}
          serverUrl={match.livekitUrl}
          roomName={match.roomName}
          userName={userName}
          onDisconnected={handleDisconnected}
          onMessage={handleMessage}
          isTextMode={isTextMode}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4" />
            <p className="text-white">Looking for someone to chat with...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <VideoControls
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        onToggleVideo={() => setIsVideoEnabled(!isVideoEnabled)}
        onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
        onStopChatting={handleStopChatting}
        onNext={handleNext}
        onToggleChat={() => setShowChat(!showChat)}
        onReport={() => setShowReportModal(true)}
        onBlock={() => setShowBlockModal(true)}
        isSkipping={isSkipping}
        isTextMode={isTextMode}
        isConnected={!!match}
      />

      {/* Chat Panel */}
      {showChat && (
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          onClose={() => setShowChat(false)}
          isFullScreen={isTextMode}
        />
      )}

      {/* Modals */}
      {showReportModal && match && (
        <ReportModal
          onSubmit={async (reason, comment) => {
            // Submit report
            await fetch(`${API_URL}/reports`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                reportedPeerId: match.peerId,
                sessionId: match.sessionId,
                reason,
                comment,
              }),
            });
            setShowReportModal(false);
            toast.success('Report submitted');
          }}
          onClose={() => setShowReportModal(false)}
          isLoading={false}
        />
      )}

      {showBlockModal && match && (
        <BlockModal
          onBlock={async (reason) => {
            await blockUser(accessToken!, match.peerId, reason, match.sessionId);
            setShowBlockModal(false);
            toast.success('User blocked');
            handleNext();
          }}
          onClose={() => setShowBlockModal(false)}
          isLoading={false}
        />
      )}
    </div>
  );
}
```

### 3.4 Create Simplified Matchmaking Hook

Create `packages/frontend/src/hooks/useMatchmaking.ts`:

```typescript
import { useCallback, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

interface MatchData {
  sessionId: string;
  roomName: string;
  livekitToken: string;
  livekitUrl: string;
  peerId: string;
}

interface QueueStatus {
  position: number;
  timestamp: number;
}

interface JoinQueueParams {
  region?: string;
  language?: string;
  gender?: string;
  genderPreference?: string;
  interests?: string[];
  queueType?: 'casual' | 'serious' | 'language' | 'gaming';
  nativeLanguage?: string;
  learningLanguage?: string;
}

interface UseMatchmakingOptions {
  accessToken: string | null;
  onMatched: (data: MatchData) => void;
}

export function useMatchmaking({ accessToken, onMatched }: UseMatchmakingOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onMatchedRef = useRef(onMatched);
  onMatchedRef.current = onMatched;

  useEffect(() => {
    if (!accessToken) return;

    const newSocket = io(`${API_URL}/signaling`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      auth: { token: `Bearer ${accessToken}` },
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      setError(err.message);
      setConnected(false);
    });

    newSocket.on('queue-joined', (data: QueueStatus) => {
      setQueueStatus(data);
    });

    newSocket.on('queue-update', (data: { position: number }) => {
      setQueueStatus((prev) => ({
        ...prev,
        position: data.position,
        timestamp: Date.now(),
      } as QueueStatus));
    });

    // NEW: Match includes LiveKit token
    newSocket.on('matched', (data: MatchData) => {
      setQueueStatus(null);
      onMatchedRef.current(data);
    });

    newSocket.on('error', (err: { message: string }) => {
      setError(err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  const joinQueue = useCallback((params: JoinQueueParams) => {
    if (socket?.connected) {
      socket.emit('join-queue', params);
    }
  }, [socket]);

  const leaveQueue = useCallback(() => {
    if (socket?.connected) {
      socket.emit('leave-queue');
      setQueueStatus(null);
    }
  }, [socket]);

  return {
    connected,
    queueStatus,
    error,
    joinQueue,
    leaveQueue,
  };
}
```

---

## Phase 4: Files to Remove

After migration, delete these files (total: ~1,700 lines):

### Backend:
```
packages/backend/src/signaling/signaling.gateway.ts  (765 lines) → SIMPLIFY
packages/backend/src/turn/turn.service.ts           (63 lines)  → DELETE
packages/backend/src/turn/turn.controller.ts        → DELETE
packages/backend/src/turn/turn.module.ts            → DELETE
packages/backend/src/turn/__tests__/*               → DELETE
```

### Frontend:
```
packages/frontend/src/hooks/useWebRTC.ts                    (320 lines) → DELETE
packages/frontend/src/hooks/useSignaling.ts                 (407 lines) → REPLACE with useMatchmaking
packages/frontend/src/hooks/useNetworkQuality.ts            (120 lines) → DELETE (LiveKit handles this)
packages/frontend/src/hooks/useAdaptiveMediaConstraints.ts  (99 lines)  → DELETE (LiveKit handles this)
```

---

## Phase 5: Deployment Steps

### 5.1 Server Setup (Hetzner/DigitalOcean)

```bash
# 1. Create server (Ubuntu 22.04, 4 vCPU, 8GB RAM)

# 2. SSH in and install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Clone infrastructure config
git clone https://github.com/yourusername/paircam.git
cd paircam/infrastructure/livekit

# 4. Configure environment
cp .env.example .env
# Edit .env with your keys

# 5. Generate LiveKit keys
docker run --rm livekit/generate
# Copy output to .env

# 6. Start services
docker compose up -d

# 7. Verify
curl http://localhost:7880
```

### 5.2 DNS Configuration

```
A record:     livekit.paircam.live → your-server-ip
A record:     turn.paircam.live    → your-server-ip
```

### 5.3 Firewall Rules

```bash
# Required ports
ufw allow 80/tcp    # HTTP (Caddy)
ufw allow 443/tcp   # HTTPS (Caddy)
ufw allow 7880/tcp  # LiveKit API
ufw allow 7881/tcp  # LiveKit RTC/TCP
ufw allow 3478/udp  # TURN UDP
ufw allow 5349/tcp  # TURN TLS
ufw allow 50000:60000/udp  # WebRTC UDP range
```

---

## Phase 6: Testing Checklist

- [ ] LiveKit server responds on `/`
- [ ] Can generate tokens via API
- [ ] Two browsers can connect to same room
- [ ] Video/audio works both directions
- [ ] Chat messages work via data channel
- [ ] Disconnect triggers rejoin queue
- [ ] Skip works correctly
- [ ] Recording works (optional)
- [ ] Webhooks received by backend

---

## Cost Summary

| Item | Before | After |
|------|--------|-------|
| TURN Server | $200-500/mo | $0 (built into LiveKit) |
| Media Server | $0 | $15-50/mo (VPS) |
| Code Complexity | ~1,700 lines | ~200 lines |
| Connection Success | 70-80% | 99%+ |
| Features | Basic | Full (simulcast, recording, etc.) |

**Total Monthly Savings: ~$150-450/mo**
**Plus:** Better reliability, less maintenance, more features

---

## Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| 1 | 1 day | Infrastructure setup |
| 2 | 2-3 days | Backend changes |
| 3 | 2-3 days | Frontend changes |
| 4 | 1 day | Testing & cleanup |
| 5 | 1 day | Deployment |

**Total: 1-2 weeks**

---

## Next Steps

1. Provision server (Hetzner CX31 recommended)
2. Set up DNS records
3. Deploy LiveKit with Docker Compose
4. Implement backend changes
5. Implement frontend changes
6. Test thoroughly
7. Deploy to production
8. Remove old code
