# 🔒 Production Environment Setup Guide

## Quick Start

```bash
# 1. Generate secrets
JWT_SECRET=$(openssl rand -base64 48)
TURN_SECRET=$(openssl rand -base64 48)
REDIS_PASSWORD=$(openssl rand -base64 32)

# 2. Create .env.production file
cat > .env.production << EOF
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
TURN_SHARED_SECRET=$TURN_SECRET
REDIS_PASSWORD=$REDIS_PASSWORD

# Update these with your actual values:
CORS_ORIGINS=https://paircam.live,https://www.paircam.live
FRONTEND_URL=https://paircam.live
TURN_HOST=turn.paircam.live
REDIS_HOST=your-redis-host
DATABASE_URL=postgresql://user:pass@host:5432/db
EOF
```

## Full Production Environment Variables

```bash
# ═══════════════════════════════════════
# SECURITY (REQUIRED)
# ═══════════════════════════════════════
NODE_ENV=production
JWT_SECRET=<output of: openssl rand -base64 48>
TURN_SHARED_SECRET=<output of: openssl rand -base64 48>
REDIS_PASSWORD=<output of: openssl rand -base64 32>

# ═══════════════════════════════════════
# DOMAIN & URLS
# ═══════════════════════════════════════
DOMAIN=paircam.live
API_URL=https://api.paircam.live
WS_URL=wss://api.paircam.live
FRONTEND_URL=https://paircam.live
CORS_ORIGINS=https://paircam.live,https://www.paircam.live

# ═══════════════════════════════════════
# TURN SERVER
# ═══════════════════════════════════════
TURN_PROVIDER=coturn
TURN_HOST=turn.paircam.live
TURN_PORT=3478
TURN_TLS_PORT=5349
TURN_REALM=paircam.live

# ═══════════════════════════════════════
# REDIS
# ═══════════════════════════════════════
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# ═══════════════════════════════════════
# OPTIONAL: STRIPE (for premium)
# ═══════════════════════════════════════
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_WEEKLY=price_...
STRIPE_PRICE_ID_MONTHLY=price_...

# ═══════════════════════════════════════
# OPTIONAL: DATABASE
# ═══════════════════════════════════════
DATABASE_URL=postgresql://user:password@host:5432/database

# ═══════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
MAX_CALLS_PER_MINUTE=10
MAX_SKIPS_PER_SESSION=5
```

## Security Validation

The backend now **automatically validates** secrets on startup:

✅ **What it checks:**
- Secrets are at least 32 characters
- Secrets are NOT default placeholder values
- Secrets are set in production environment

❌ **App will REFUSE to start if:**
- `JWT_SECRET` is default or too short
- `TURN_SHARED_SECRET` is default or too short
- Running in production with unsafe values

```typescript
// This is now enforced in packages/backend/src/env.ts
validateProductionSecret(process.env.JWT_SECRET, 'JWT_SECRET')
```

