# PairCam Documentation

A production-ready random video chat app. Meet new people worldwide with instant 1-on-1 video connections.

**Live:** [paircam.live](https://paircam.live)

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Frontend](#frontend)
5. [Backend](#backend)
6. [Configuration](#configuration)
7. [Deployment](#deployment)
8. [Domain Setup](#domain-setup)
9. [User Experience Flows](#user-experience-flows)
10. [Security & Compliance](#security--compliance)
11. [Monitoring](#monitoring)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### Features

**Core Features:**
- Real-time random video chat with instant 1-on-1 connections
- Text messaging with emoji support
- Global matching - connect with people worldwide
- Anonymous - no registration required
- Secure - JWT authentication and encrypted connections
- Fast matching - < 5 seconds average match time
- Responsive - works on desktop, tablet, and mobile

**Safety Features:**
- Abuse reporting system
- IP and device blocking
- Rate limiting to prevent spam
- Moderation tools for admins

**Technical Features:**
- WebRTC peer-to-peer connections
- TURN fallback for NAT/firewalls
- Prometheus metrics and health checks
- Docker and Kubernetes ready

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | NestJS 10, Socket.io 4, TypeScript |
| Database | Neon (Serverless PostgreSQL 17) |
| Cache | Upstash (Serverless Redis) |
| Hosting | Vercel (Frontend), Railway (Backend) |
| Payments | Stripe |
| TURN | Metered.ca (managed) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- Redis 7+
- Modern browser (Chrome, Firefox, Safari, Edge)

### 3-Step Setup

```bash
# 1. Install dependencies
./install-all.sh

# 2. Start all services
./start-all.sh

# 3. Open in browser
# http://localhost:5173
```

Open in two browser windows to test matching.

### Manual Setup

```bash
# Start Redis
redis-server --port 6379

# Install & Start Backend
cd packages/backend
npm install
npm run dev

# Install & Start Frontend (new terminal)
cd packages/frontend
npm install
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3333
- Health: http://localhost:3333/health
- Metrics: http://localhost:3333/metrics

---

## Architecture

```
                         INTERNET / CLIENTS
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  Browser 1   │    │  Browser 2   │    │   Mobile     │
  │ (React/Vite) │    │ (React/Vite) │    │   (PWA/Web)  │
  └──────────────┘    └──────────────┘    └──────────────┘
        │ HTTPS+WSS          │ HTTPS+WSS          │ HTTPS+WSS
        └────────────────────┼────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │     Backend (NestJS)        │
              │  • WebSocket signaling      │
              │  • JWT authentication       │
              │  • Matchmaking service      │
              │  • Abuse reporting          │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │        Redis Cluster        │
              │  • Session management       │
              │  • Matchmaking queue        │
              │  • Rate limiting            │
              │  • Block lists              │
              └─────────────────────────────┘

     Peer-to-Peer WebRTC (Direct Media)
     Falls back to TURN if NAT prevents P2P
```

### Project Structure

```
paircam/
├── packages/
│   ├── backend/              # NestJS backend
│   │   └── src/
│   │       ├── auth/         # JWT authentication
│   │       ├── signaling/    # WebSocket gateway
│   │       ├── redis/        # Redis service
│   │       ├── turn/         # TURN credentials
│   │       ├── reporting/    # Abuse reports
│   │       └── monitoring/   # Metrics
│   │
│   └── frontend/             # React frontend
│       └── src/
│           ├── components/   # UI components
│           ├── hooks/        # Custom hooks
│           └── config/       # Configuration
│
├── docker-compose.yml        # Docker config
├── install-all.sh            # Installation script
├── start-all.sh              # Start script
└── stop-all.sh               # Stop script
```

### Module Dependencies (Backend)

```
AppModule (Root)
├── ConfigModule (Global)
├── LoggerModule (Global)
├── RedisModule (Global)
├── AuthModule (Global)
│   ├── AuthService
│   ├── JwtStrategy
│   └── JwtAuthGuard
├── SignalingModule
│   ├── SignalingGateway
│   └── MatchmakingService
├── TurnModule
├── ReportingModule
└── MonitoringModule
```

---

## Frontend

### Design Features
- Modern UI with gradients and glassmorphism
- Inter font for professional typography
- Smooth animations and transitions
- Mobile-first responsive design

### Components
- **LandingPage** - Hero section with features
- **VideoChat** - Dual video layout with controls
- **ChatPanel** - Real-time messaging
- **Navbar** - Clean header with backdrop blur
- **Footer** - Links and info

### Color Palette
- **Primary**: Blue (#0ea5e9) to Indigo (#6366f1)
- **Background**: Slate-50 to Blue-50 gradient
- **Text**: Slate-900 (primary), Slate-600 (secondary)

### Development

```bash
cd packages/frontend

npm run dev        # Development server
npm run build      # Production build
npm run test       # Run tests
npm run lint       # Lint code
npm run typecheck  # Type check
```

---

## Backend

### API Endpoints

**Authentication:**
- `POST /auth/token` - Generate JWT token
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/verify` - Verify token validity

**TURN Credentials:**
- `POST /turn/credentials` - Get TURN server credentials

**Reporting:**
- `POST /reports` - Submit abuse report
- `GET /reports` - List reports (admin)
- `POST /reports/moderate` - Moderate report (admin)

**Monitoring:**
- `GET /metrics` - Prometheus metrics
- `GET /health` - Health check
- `GET /health/ready` - Readiness check

### WebSocket Events

**Client → Server:**
- `join-queue` - Join matchmaking queue
- `leave-queue` - Leave matchmaking queue
- `send-offer` - Send WebRTC offer
- `send-answer` - Send WebRTC answer
- `send-candidate` - Send ICE candidate
- `send-message` - Send chat message
- `end-call` - End current session

**Server → Client:**
- `connected` - Connection established
- `matched` - Paired with peer
- `offer` / `answer` / `candidate` - WebRTC signaling
- `message` - Received chat message
- `peer-disconnected` - Peer left
- `error` - Error notification

### Development

```bash
cd packages/backend

npm run dev        # Development server
npm run build      # Production build
npm run test       # Run tests
npm run lint       # Lint code
```

---

## Configuration

### Backend Environment Variables

```env
# Server
NODE_ENV=development
PORT=3333
LOG_LEVEL=debug

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=5m

# Database (Neon)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/paircam?sslmode=require

# Redis (Upstash)
REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379

# TURN Server
TURN_SHARED_SECRET=your-turn-shared-secret
TURN_HOST=turn.paircam.live
TURN_PORT=3478

# CORS
CORS_ORIGINS=http://localhost:5173

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:3333
VITE_WS_URL=ws://localhost:3333
```

---

## Deployment

### Production Services

| Service | Provider | Dashboard |
|---------|----------|-----------|
| Frontend | Vercel | vercel.com |
| Backend | Railway | railway.app |
| Database | Neon | console.neon.tech |
| Redis | Upstash | console.upstash.com |
| Payments | Stripe | dashboard.stripe.com |
| TURN | Metered | metered.ca |

### Docker Deployment

```bash
docker-compose up -d

# Services:
# - Redis: localhost:6379
# - Backend: localhost:3333
# - Frontend: localhost:5173
```

### Vercel (Frontend)

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Railway (Backend)

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

---

## Domain Setup

### DNS Configuration (Vercel + Railway)

```dns
# Frontend - Vercel
Type: CNAME, Name: @, Value: cname.vercel-dns.com
Type: CNAME, Name: www, Value: cname.vercel-dns.com

# API Backend - Railway
Type: CNAME, Name: api, Value: your-backend.railway.app

# WebSocket
Type: CNAME, Name: ws, Value: your-backend.railway.app
```

### SSL/TLS with Cloudflare

1. Add domain to Cloudflare
2. Update nameservers at registrar
3. Enable "Full (strict)" SSL mode
4. Enable "Always Use HTTPS"

### Cloudflare DNS Settings

- `paircam.live` → Proxied (orange cloud)
- `www.paircam.live` → Proxied
- `api.paircam.live` → Proxied
- `turn.paircam.live` → DNS only (gray cloud) **IMPORTANT!**

### Health Check Endpoints

```bash
# Frontend
curl https://paircam.live

# Backend Health
curl https://api.paircam.live/health

# WebSocket
npx wscat -c wss://api.paircam.live/signaling
```

---

## User Experience Flows

### Happy Path - Video Chat

```
Landing Page
    ↓ User enters name, clicks "Start Video Chat"
Grant Permissions (1-2 seconds)
    ↓ Camera preview shows
Finding Match (1-3 seconds)
    ↓ "Searching for someone..." animation
Matched!
    ↓ WebRTC connection established
Chatting
    ↓ Controls: Toggle video/audio, text chat, skip, report, stop
```

### Permission Denied Flow

User denied camera/mic access:
1. Shows browser-specific instructions
2. Offers alternatives: Retry, Audio Only, Text Only, Go Back
3. Never blocks user completely

### Slow Network Flow

```
Network: 3G (2.1 Mbps) → Auto-adjust to SD Quality
Network degrades → Yellow warning with [Switch to Audio Only]
Network worsens → Recommendation to use audio-only
```

### Report & Safety Flow

1. User clicks Report button
2. Select reason (Harassment, Inappropriate, Spam, Other)
3. Optional comment
4. Submit → Auto-skip to next person

### Visual Indicators

**Connection Quality:**
- Excellent: 4 bars (green)
- Good: 3 bars (blue)
- Fair: 2 bars (yellow)
- Poor: 1 bar (orange)
- Offline: X (red)

**Button Colors:**
- Red: Stop, End, Danger
- Orange: Report, Warning
- Pink/Purple: Next/Skip
- Blue: Audio-only mode
- Gray: Secondary actions

---

## Security & Compliance

### Implemented Security

- JWT tokens with 5-minute expiration
- CORS with strict origin validation
- Helmet.js security headers
- Rate limiting per device/IP
- Input validation with class-validator
- TURN credentials with HMAC-SHA1
- No PII storage
- Audit logging

### Network Adaptation

Automatic quality adjustment based on network:
- Excellent: 1080p @ 30fps
- Good: 720p @ 24fps
- Fair: 480p @ 15fps
- Poor: 240p @ 10fps (recommends audio-only)

### Compliance Requirements

**Before Production Launch:**
- Terms of Service page
- Privacy Policy page
- Cookie consent banner
- GDPR data export/deletion

**Recommended:**
- Content moderation API
- Admin dashboard for reports
- Data retention policy

---

## Monitoring

### Prometheus Metrics

Available at `/metrics`:
- `video_chat_active_connections` - Active WebSocket connections
- `video_chat_sessions_created_total` - Total sessions created
- `video_chat_match_latency_seconds` - Matchmaking latency
- `video_chat_webrtc_offers_total` - WebRTC offers sent
- `video_chat_reports_submitted_total` - Abuse reports submitted

### Health Checks

- `GET /health` - Liveness probe
- `GET /health/ready` - Readiness probe (checks Redis)

### Performance Targets

- Signaling latency: p95 < 200ms
- Match latency: p95 < 5s
- ICE connection success: >= 95%
- TURN fallback rate: < 15%
- Pod availability: >= 99.9%

---

## Troubleshooting

### Backend won't start
```bash
redis-cli ping          # Check Redis
lsof -i:3333           # Check port
tail -f /tmp/backend.log
```

### Frontend won't start
```bash
lsof -i:5173           # Check port
tail -f /tmp/frontend.log
```

### Can't match users
```bash
redis-cli llen matchmaking:queue  # Check queue
# Check both users connected, check backend logs
```

### Camera/Microphone not working
- Allow permissions in browser
- Check if camera used by another app
- Try HTTPS (required for some browsers)

### WebSocket Connection Issues
```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  https://api.paircam.live/socket.io/
```

### SSL Certificate Issues
```bash
openssl s_client -connect api.paircam.live:443
echo | openssl s_client -connect paircam.live:443 2>/dev/null | openssl x509 -noout -dates
```

---

## License

MIT License

---

**Made with React, NestJS, and TypeScript**

**Live at [paircam.live](https://paircam.live)**
