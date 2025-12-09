# Paircam Infrastructure Setup

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  Vercel (app.paircam.live)                                      │
│  - React + Vite                                                  │
│  - Domain: GoDaddy → Vercel                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ❓ Railway (recommended) - TO BE DEPLOYED                      │
│  - NestJS + Socket.io (WebSockets)                              │
│  - Port: 3333                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      DATABASE           │     │        CACHE            │
│  Neon PostgreSQL        │     │   Upstash Redis         │
│  (via Vercel)           │     │   (via Vercel)          │
│                         │     │                         │
│  - Users                │     │  - Sessions             │
│  - Subscriptions        │     │  - Matchmaking queue    │
│  - Payments             │     │  - Rate limiting        │
│  - Blocked users        │     │  - WebRTC signaling     │
└─────────────────────────┘     └─────────────────────────┘
```

## Vercel Project

- **Project ID**: `prj_5q6wSqXnlSPaX7dRxkTWPCZ9MB9E`
- **Dashboard**: [vercel.com/dashboard](https://vercel.com)

## Services Overview

| Service | Provider | Status | Dashboard |
|---------|----------|--------|-----------|
| Frontend | Vercel | ✅ Deployed | [vercel.com](https://vercel.com) |
| Domain | GoDaddy | ✅ Connected | [godaddy.com](https://godaddy.com) |
| Database | Neon (via Vercel) | ✅ Connected | Vercel Storage |
| Redis | Upstash (via Vercel) | ✅ Connected | Vercel Storage |
| Backend | Railway | ❌ Not deployed | [railway.app](https://railway.app) |

## Environment Variables

### Frontend (Vercel)
```bash
# Auto-injected by Vercel Storage integrations
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Backend (Railway - needs to be set)
```bash
# Required
NODE_ENV=production
PORT=3333
DATABASE_URL=postgresql://neondb_owner:npg_q6iv1NTAbhdD@ep-shiny-frog-ah6hwcj6-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
REDIS_URL=redis://default:mRplKxIRmtFvN4S3nnrGFutu4kgV6mh6@redis-11699.c16.us-east-1-2.ec2.cloud.redislabs.com:11699
JWT_SECRET=<generate-32-char-secret>
TURN_SHARED_SECRET=<generate-32-char-secret>

# Optional
FRONTEND_URL=https://app.paircam.live
CORS_ORIGINS=https://app.paircam.live

# Stripe (when ready)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_WEEKLY=price_...
STRIPE_PRICE_ID_MONTHLY=price_...

# Google OAuth (when ready)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# TURN Server (for video calls behind NAT)
TURN_PROVIDER=managed
TURN_URLS=turn:a.relay.metered.ca:80
TURN_USERNAME=...
TURN_PASSWORD=...
```

## Next Steps

### 1. Deploy Backend to Railway
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. New Project → Deploy from GitHub repo
4. Select `packages/backend` folder
5. Add environment variables (see above)
6. Get your Railway URL (e.g., `paircam-backend.up.railway.app`)

### 2. Update Frontend to Point to Backend
Update the frontend API URL to point to your Railway backend URL.

### 3. Configure TURN Server (for video calls)
Sign up for a TURN service like [Metered](https://www.metered.ca/) or [Twilio](https://www.twilio.com/) for NAT traversal.

## Connection URLs

| Service | Connection String |
|---------|-------------------|
| PostgreSQL | `postgresql://neondb_owner:npg_q6iv1NTAbhdD@ep-shiny-frog-ah6hwcj6-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| Redis | `redis://default:mRplKxIRmtFvN4S3nnrGFutu4kgV6mh6@redis-11699.c16.us-east-1-2.ec2.cloud.redislabs.com:11699` |

## Cost Estimates (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Neon PostgreSQL | Free tier | Free (0.5 GB) |
| Upstash Redis | Free tier | Free (10K commands/day) |
| Railway | Starter | ~$5 (usage-based) |
| GoDaddy Domain | Annual | ~$12/year |
| TURN Server | Metered | ~$0.40/GB |

**Total: ~$5-10/month** (depends on usage)
