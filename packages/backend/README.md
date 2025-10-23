# Video Chat Backend

Production-ready WebRTC signaling server built with NestJS, Socket.io, and Redis.

## Features

- ✅ **Real-time WebSocket signaling** for WebRTC peer connections
- ✅ **JWT authentication** with short-lived tokens (5 minutes)
- ✅ **Redis-based matchmaking** with region and language support
- ✅ **TURN server integration** with HMAC-based credentials
- ✅ **Abuse reporting system** with moderation tools
- ✅ **Prometheus metrics** for monitoring and observability
- ✅ **Rate limiting** and abuse detection
- ✅ **Health checks** and graceful shutdown
- ✅ **Docker support** for containerized deployment

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server
- Docker & Docker Compose (optional)

### Local Development

1. **Install dependencies:**
   ```bash
   cd packages/backend
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Redis:**
   ```bash
   redis-server --port 6379
   ```

4. **Start the backend:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3333`

### Docker Development

```bash
# Start all services (Redis, TURN, Backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## API Endpoints

### Authentication
- `POST /auth/token` - Generate JWT token
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/verify` - Verify token validity

### TURN Credentials
- `POST /turn/credentials` - Get TURN server credentials

### Reporting
- `POST /reports` - Submit abuse report
- `GET /reports` - List reports (admin)
- `POST /reports/moderate` - Moderate report (admin)

### Monitoring
- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check
- `GET /health/ready` - Readiness check

## WebSocket Events

### Client → Server
- `join-queue` - Join matchmaking queue
- `leave-queue` - Leave matchmaking queue
- `send-offer` - Send WebRTC offer
- `send-answer` - Send WebRTC answer
- `send-candidate` - Send ICE candidate
- `send-message` - Send chat message
- `send-reaction` - Send emoji reaction
- `end-call` - End current session

### Server → Client
- `connected` - Connection established
- `matched` - Paired with peer
- `offer` - Received WebRTC offer
- `answer` - Received WebRTC answer
- `candidate` - Received ICE candidate
- `message` - Received chat message
- `reaction` - Received emoji reaction
- `peer-disconnected` - Peer disconnected
- `error` - Error notification

## Configuration

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3333
LOG_LEVEL=debug

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=5m

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# TURN Server
TURN_SHARED_SECRET=your-turn-shared-secret
TURN_REALM=video-chat.local
TURN_HOST=localhost
TURN_PORT=3478
TURN_TLS_PORT=5349

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
OTEL_ENABLED=false
PROMETHEUS_PORT=9090
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Frontend      │    │   Admin UI      │
│   (React)       │    │   (React)       │    │   (React)       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Backend (NestJS)      │
                    │  ┌─────────────────────┐  │
                    │  │  WebSocket Gateway  │  │
                    │  │  (Socket.io)        │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │  Matchmaking        │  │
                    │  │  Service            │  │
                    │  └─────────────────────┘  │
                    │  ┌─────────────────────┐  │
                    │  │  Reporting          │  │
                    │  │  Service            │  │
                    │  └─────────────────────┘  │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Redis Cluster        │
                    │  ┌─────────────────────┐  │
                    │  │  Session State      │  │
                    │  │  Matchmaking Queue  │  │
                    │  │  Rate Limiting      │  │
                    │  │  Block Lists        │  │
                    │  └─────────────────────┘  │
                    └───────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     TURN Server           │
                    │  ┌─────────────────────┐  │
                    │  │  Media Relay         │  │
                    │  │  (coturn)            │  │
                    │  └─────────────────────┘  │
                    └───────────────────────────┘
```

## Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# Linting
npm run lint

# Type checking
npm run typecheck
```

## Production Deployment

### Docker

```bash
# Build production image
docker build -t video-chat-backend:latest .

# Run with environment variables
docker run -d \
  --name video-chat-backend \
  -p 3333:3333 \
  -p 9090:9090 \
  -e REDIS_HOST=your-redis-host \
  -e JWT_SECRET=your-production-secret \
  video-chat-backend:latest
```

### Kubernetes

See the `infrastructure/kubernetes/` directory for K8s manifests.

## Monitoring

### Prometheus Metrics

The backend exposes metrics at `/metrics`:

- `video_chat_active_connections` - Active WebSocket connections
- `video_chat_sessions_created_total` - Total sessions created
- `video_chat_match_latency_seconds` - Matchmaking latency
- `video_chat_webrtc_offers_total` - WebRTC offers sent
- `video_chat_reports_submitted_total` - Abuse reports submitted

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks Redis connectivity)

## Security

- **JWT tokens**: 5-minute expiration
- **Rate limiting**: Per-device and per-IP limits
- **CORS**: Strict origin validation
- **TURN credentials**: HMAC-based, time-limited
- **No PII storage**: Only device IDs and session metadata
- **Abuse detection**: Pattern recognition and reporting

## Performance

- **Signaling latency**: < 200ms p95
- **Match latency**: < 5s p95
- **ICE connection success**: > 95%
- **Pod availability**: > 99.9%

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Run linting and tests
5. Submit a pull request

## License

MIT
