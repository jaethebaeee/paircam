# Connect - Global Video Chat Platform

**Complete Documentation & Development Guide**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Local Development](#local-development)
5. [Production Deployment](#production-deployment)
6. [ML Matching System (Gorse)](#ml-matching-system-gorse)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Connect** is a global peer-to-peer video chat application with intelligent matching, feedback-driven recommendations, and WebRTC-powered video streaming.

### Tech Stack
- **Backend**: NestJS + TypeORM + PostgreSQL + Redis
- **Frontend**: React + Vite + WebRTC
- **ML Engine**: Gorse (collaborative filtering)
- **Deployment**: Railway ($10-25/month)
- **WebRTC**: Socket.io signaling + TURN servers

### Key Features
- 🌍 Global matchmaking with 25+ compatibility factors
- 🤖 ML-driven recommendations (Gorse)
- 📊 Real-time feedback and analytics
- 🔐 JWT authentication + OAuth support
- 💳 Stripe payment integration
- 📱 Mobile-responsive WebRTC video
- 🚀 Production-ready on Railway

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Users (WebRTC)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   ┌────────────┐             ┌────────────┐
   │  Frontend  │             │  Frontend  │
   │  (Vite)    │             │  (Vite)    │
   └──────┬─────┘             └──────┬─────┘
          │                          │
          └──────────────┬───────────┘
                         │
          ┌──────────────┴──────────────┐
          │   NestJS Backend (Railway)  │
          │  ┌────────────────────────┐ │
          │  │ Signaling/Matching     │ │
          │  │ Auth/Feedback/Gorse    │ │
          │  └────────────────────────┘ │
          └──────────────┬───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌─────────┐      ┌─────────┐     ┌──────────┐
   │PostgreSQL│      │ Redis   │     │Gorse ML  │
   │(matches) │      │(cache)  │     │(scoring) │
   └─────────┘      └─────────┘     └──────────┘
```

### Core Services

**MatchmakingService** (signaling/matchmaking.service.ts)
- O(n log n) geographic bucketing
- 25+ compatibility factors
- Gorse ML scoring integration
- Real-time queue management via Redis

**FeedbackService** (feedback/feedback.service.ts)
- 1-5 star user ratings
- Connection quality metrics
- ML training data collection
- Redis caching (1-hour TTL)

**GorseService** (gorse/gorse.service.ts)
- HTTP API client for Gorse
- Hourly feedback sync
- Recommendation fetching
- Graceful fallback if unavailable

**AuthService** (auth/auth.service.ts)
- JWT token generation/validation
- Google OAuth integration
- Session management

---

## Features

### 1. Intelligent Matchmaking

**Compatibility Score Calculation** (0-100 points):

| Factor | Points | Details |
|--------|--------|---------|
| Geographic | 0-20 | Time zone + region proximity |
| Language | 0-15 | Native + learning languages |
| Interests | 0-15 | Shared interest tags |
| Age/Gender | 0-20 | Preferences match |
| Reputation | 0-10 | User rating system |
| ML Bonus | 0-15 | Gorse recommendations |
| Premium | +5 | Premium user priority |
| Call Quality | 0-5 | Previous call ratings |

**Queue Types**:
- `casual` - Random matching
- `serious` - 18+ filtered
- `language` - Language learning pairs
- `gaming` - Gaming community

### 2. ML Matching with Gorse

**How It Works**:
1. Users rate matches (1-5 stars)
2. FeedbackService collects ratings + metadata
3. GorseService syncs feedback hourly to Gorse
4. Gorse trains ALS (Alternating Least Squares) model
5. MatchmakingService fetches recommendations
6. Recommended users get +10-15 bonus points

**Setup**: See [Production Deployment](#production-deployment) → Gorse Configuration

### 3. Feedback & Analytics

**User Feedback Endpoints**:
- `POST /api/feedback` - Submit rating for match
- `GET /api/feedback/me/stats` - Personal feedback stats
- `GET /api/feedback/:userId/stats` - User statistics

**Collected Data**:
- Rating (1-5)
- Connection quality
- Call duration
- Feedback reason
- Timestamp

---

## Local Development

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL + Redis) OR local instances

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/jaethebaeee/paircam
cd paircam/packages/backend
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with local values:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/connect
# REDIS_URL=redis://localhost:6379
# JWT_SECRET=your-secret-key (32+ chars)

# 3. Start services (Docker)
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=connect \
  postgres:15

docker run -d -p 6379:6379 redis:7

# 4. Run migrations
npm run typeorm migration:run

# 5. Start dev server
npm run start:dev
```

**Server**: http://localhost:3000

### Available Commands

```bash
npm run start        # Production build
npm run start:dev    # Development (watch mode)
npm run build        # Compile TypeScript
npm run test         # Run tests
npm run lint         # Linting
```

---

## Production Deployment

### Why Railway?

| Feature | Railway | Heroku | AWS |
|---------|---------|--------|-----|
| **Cost** | **$10-25/mo** | $50-500/mo | $100-1000+/mo |
| Setup | 1 click | Medium | Complex |
| PostgreSQL | ✅ Included | $9-50/mo | DIY |
| Redis | ✅ $5-10/mo | $30+/mo | DIY |
| SSL/TLS | ✅ Auto | ✅ Auto | DIY |
| Backups | ✅ Daily | ✅ Yes | DIY |

### Deploy to Railway (5 minutes)

1. **Connect GitHub repo**
   - Go to https://railway.app
   - Sign in with GitHub
   - Select `paircam` repository

2. **Railway auto-detects**
   - Reads `railway.toml`
   - Installs dependencies
   - Builds backend
   - Deploys automatically

3. **Add PostgreSQL**
   ```bash
   railway add postgresql
   # Sets DATABASE_URL automatically
   ```

4. **Add Redis** (recommended)
   ```bash
   railway add redis
   # Sets REDIS_URL automatically
   ```

5. **Configure variables**
   - Railway Dashboard → Variables
   - Set: `JWT_SECRET`, `CORS_ORIGINS`, etc.

6. **Deploy**
   ```bash
   git push origin main
   # Auto-deploys in ~2 minutes
   ```

### Gorse Configuration (Optional)

**Local Gorse Setup** (for ML matching):

```bash
# Docker
docker run -d -p 8088:8088 -p 7070:7070 \
  -e RECOMMENDATION_AUTO_ENRICH=true \
  -e RECOMMENDATION_POPULAR_WINDOW=168 \
  gorse/gorse:latest

# Set in Railway Variables
GORSE_API_URL=http://gorse:8088  # or external URL
GORSE_SYNC_INTERVAL_MINUTES=60
```

**Without Gorse**: Matching still works with the 25+ compatibility factors.

### Environment Variables

**Required**:
```env
NODE_ENV=production
JWT_SECRET=your-random-secret-32+-characters
JWT_EXPIRATION=5m
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
DATABASE_URL=postgresql://...  # Set by Railway
REDIS_URL=redis://...  # Set by Railway
```

**Optional but Recommended**:
```env
# TURN Server (WebRTC)
TURN_PROVIDER=coturn
TURN_HOST=turn.yourdomain.com
TURN_PORT=3478
TURN_TLS_PORT=5349
TURN_SHARED_SECRET=your-secret

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Monitoring
PROMETHEUS_PORT=9090
OTEL_ENABLED=true
LOG_LEVEL=info
```

### Scaling on Railway

**Vertical Scaling** (more powerful):
- Dashboard → Deployments → Settings
- Increase CPU/Memory slider
- Zero-downtime upgrade

**Horizontal Scaling** (more replicas):
- Dashboard → Deployments → Settings
- Set replicas: 1 → 3
- Auto load-balanced

---

## ML Matching System (Gorse)

### How Gorse Works

**Collaborative Filtering**:
1. Users rate matches (implicit feedback)
2. Gorse builds user-item matrix
3. ALS algorithm finds patterns
4. Predicts scores for unseen pairs
5. Returns top N recommendations

**Example**:
- User A rated User B ⭐⭐⭐⭐ (4 stars)
- User C rated User B ⭐⭐⭐⭐ (4 stars)
- Gorse finds other matches they both liked
- Recommends those to both users

### Feedback Loop

```
User 1 ←→ User 2
    ↓
Rate Match (1-5 stars)
    ↓
FeedbackService.submitFeedback()
    ↓
Redis cache updated
    ↓
(Every 60 minutes)
    ↓
GorseService.syncFeedbackToGorse()
    ↓
Gorse re-trains model
    ↓
MatchmakingService gets recommendations
    ↓
+10-15 points bonus for recommended matches
```

### Scoring Bonus

- **Mutual recommendation** (+15 points): Both users in each other's top 10
- **One-way recommendation** (+10 points): In one user's top 10
- **No recommendation** (0 points): Not recommended

### API Endpoints

```bash
# Get recommendations
curl http://localhost:3000/api/gorse/recommendations?userId=USER_ID&limit=10

# Get Gorse status
curl http://localhost:3000/api/gorse/status

# Trigger training
curl -X POST http://localhost:3000/api/gorse/train
```

---

## API Reference

### Authentication

**Login/Register**:
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "username": "username"
}

POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

**OAuth**:
```bash
GET /auth/google/callback?code=CODE&state=STATE
# Redirects to frontend with token
```

### Matching

**Enter Queue**:
```bash
POST /signaling/queue
{
  "region": "US-WEST",
  "language": "en",
  "socketId": "socket-id",
  "interests": ["gaming", "music"],
  "age": 25,
  "gender": "M",
  "isPremium": false
}
```

**Get Match Recommendations** (Gorse):
```bash
GET /api/gorse/recommendations?userId=USER_ID&limit=10

Response:
[
  { "id": "user-456", "score": 8.5 },
  { "id": "user-789", "score": 7.2 }
]
```

### Feedback

**Submit Match Rating**:
```bash
POST /api/feedback
{
  "matchId": "MATCH_ID",
  "rating": 5,
  "reasons": ["good_conversation", "fun"],
  "connectionQuality": "excellent",
  "callDuration": 600
}
```

**Get Personal Stats**:
```bash
GET /api/feedback/me/stats

Response:
{
  "totalMatches": 42,
  "averageRating": 4.2,
  "connectionQualityStats": {
    "excellent": 15,
    "good": 18,
    "poor": 9
  }
}
```

### Analytics

**Match Analytics**:
```bash
GET /api/analytics/matches?period=7d

Response:
{
  "totalMatches": 156,
  "avgMatchDuration": 480,
  "conversionRate": 0.65,
  "topRegions": [...]
}
```

---

## Environment Variables

### Complete Reference

```env
# ============= GENERAL =============
NODE_ENV=production
LOG_LEVEL=info

# ============= DATABASE =============
DATABASE_URL=postgresql://user:pass@host:5432/db
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=connect

# ============= CACHE =============
REDIS_URL=redis://localhost:6379

# ============= AUTH =============
JWT_SECRET=your-secret-32-characters-minimum
JWT_EXPIRATION=5m
JWT_REFRESH_EXPIRATION=7d

# ============= API =============
PORT=3000
CORS_ORIGINS=https://yourdomain.com

# ============= WEBRTC =============
TURN_PROVIDER=coturn
TURN_HOST=turn.yourdomain.com
TURN_PORT=3478
TURN_TLS_PORT=5349
TURN_SHARED_SECRET=secret

# ============= ML MATCHING =============
GORSE_API_URL=http://gorse:8088
GORSE_SYNC_INTERVAL_MINUTES=60

# ============= PAYMENTS =============
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ============= OAUTH =============
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# ============= MONITORING =============
PROMETHEUS_PORT=9090
OTEL_ENABLED=true
```

---

## Troubleshooting

### App Won't Start

```bash
# Check logs
railway logs
# OR locally
npm run start:dev

# Common issues:
# 1. DATABASE_URL missing → Add PostgreSQL
# 2. REDIS_URL missing → Add Redis
# 3. JWT_SECRET missing → Add to variables
# 4. Port 3000 in use → Change PORT env var
```

### Matching Not Working

```bash
# 1. Check queue is populated
GET /api/analytics/queue-status

# 2. Verify PostgreSQL connection
curl http://localhost:3000/health

# 3. Check Redis is connected
redis-cli ping

# 4. Restart matching service
# Dashboard → Restart
```

### Gorse Not Recommended

```bash
# 1. Check Gorse is running
curl http://gorse:8088/api/health

# 2. Verify feedback is syncing
GET /api/feedback/me/stats

# 3. Check sync logs
railway logs --filter="Gorse"

# 4. Manually trigger training
POST /api/gorse/train
```

### High Memory Usage

```bash
# 1. Check what's using memory
railway logs --tail=100

# 2. Solutions:
# - Increase RAM allocation (Railway Dashboard)
# - Reduce feedback retention period
# - Archive old match_feedback data
# - Check for memory leaks
```

### Database Connection Errors

```bash
# 1. Verify DATABASE_URL is set
railway env

# 2. Check PostgreSQL is running
# Dashboard → Services → PostgreSQL → Status

# 3. Restart PostgreSQL
railway down postgresql
railway up postgresql

# 4. Check firewall (if self-hosted)
# Ensure port 5432 is accessible
```

### WebRTC Video Not Working

```bash
# 1. Check TURN server is configured
# Dashboard → Variables → TURN_HOST, TURN_PORT

# 2. Test connectivity
curl http://localhost:3000/api/turn/config

# 3. Check browser console for errors
# DevTools → Console tab

# 4. Verify ports are open
# 3478 (TURN TCP), 5349 (TURN TLS), 3000 (signaling)
```

---

## File Structure

```
paircam/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── auth/              # Authentication
│   │   │   ├── feedback/          # Ratings & analytics
│   │   │   ├── gorse/             # ML matching
│   │   │   ├── signaling/         # WebRTC & matching
│   │   │   ├── analytics/         # Stats & metrics
│   │   │   └── app.module.ts      # Main module
│   │   ├── dist/                  # Compiled JS
│   │   └── package.json
│   └── frontend/
│       ├── src/
│       └── package.json
├── railway.toml                   # Railway config
├── DOCS.md                        # This file
└── README.md                      # Project overview
```

---

## Quick Links

- **GitHub**: https://github.com/jaethebaeee/paircam
- **Railway Docs**: https://docs.railway.app/
- **Gorse Docs**: https://gorse.io/
- **NestJS Docs**: https://docs.nestjs.com/
- **WebRTC Docs**: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API

---

**Status**: Production Ready ✅
**Cost**: $10-25/month on Railway
**Last Updated**: 2025-12-08
