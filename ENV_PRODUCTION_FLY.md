# Production Environment Variables (Fly.io Deployment)

## Overview
This file documents all required environment variables for production deployment on Fly.io. **Do NOT commit this file to git** — use `flyctl secrets set` to manage sensitive values.

## Setting Secrets on Fly.io

Instead of creating `.env.production` files, set secrets directly on Fly.io:

```bash
# Login to Fly.io
flyctl auth login

# Set a single secret
flyctl secrets set JWT_SECRET=your-super-secret-value

# Set multiple secrets
flyctl secrets set \
  NODE_ENV=production \
  JWT_SECRET=your-secret \
  DATABASE_URL=your-database-url

# List all secrets
flyctl secrets list

# Remove a secret
flyctl secrets unset JWT_SECRET
```

## Required Environment Variables

### 1. Node Configuration
```env
NODE_ENV=production          # Always "production"
PORT=3333                    # Internal port
NIXPACKS_NODE_VERSION=18.18.0  # Required by Fly.io
LOG_LEVEL=info              # debug|info|warn|error
```

### 2. Database Configuration (Neon PostgreSQL)
**Signup:** https://console.neon.tech/

```env
# Format: postgresql://user:password@host/database?sslmode=require
# Example:
DATABASE_URL=postgresql://paircam:[PASSWORD]@ep-[ID].neon.tech/paircam?sslmode=require
```

**Getting the connection string:**
1. Login to Neon console
2. Select your project
3. Click "Connect"
4. Copy the "Connection string" for "Node.js"
5. Use exactly as-is in fly secrets

**Important:**
- Always include `?sslmode=require` at the end
- The free tier includes 0.5GB storage (enough for ~10k users)
- Upgrade to Pro ($19/month) for 10GB storage if needed

### 3. Cache Configuration (Upstash Redis)
**Signup:** https://console.upstash.com/

```env
# Format: redis://default:[PASSWORD]@[HOST]:6379
# Example:
REDIS_URL=redis://default:[PASSWORD]@great-rooster-12345.upstash.io:6379
```

**Getting the connection URL:**
1. Login to Upstash console
2. Create new Redis database (select closest region)
3. Click the database
4. Copy "Redis URL" from Connection section
5. Use exactly as-is in fly secrets

**Free Tier Limits:**
- 256MB storage
- 10,000 commands/day
- This is plenty for session management and caching

### 4. JWT Configuration
```env
# Generate with: openssl rand -base64 48
# Minimum 32 characters in production
JWT_SECRET=your-super-secure-random-string-minimum-32-chars
JWT_EXPIRATION=7d              # Token expiration time
```

**Generating a secure JWT secret:**
```bash
# On macOS/Linux:
openssl rand -base64 48

# Output example:
# Aw7k9+L2m3pQ8x5nH6vY2jZbC4dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zAb6Cd7e

# Copy the output and set:
flyctl secrets set JWT_SECRET='Aw7k9+L2m3pQ8x5nH6vY2jZbC4dE5fG6hI7jK8lM9nO0pQ1rS2tU3vW4xY5zAb6Cd7e'
```

### 5. TURN Server Configuration
**Primary (Free):** OpenRelay
**Fallback (Paid):** Metered.ca

```env
# Primary: OpenRelay (Free 20GB/month)
TURN_URLS=turn:openrelay.metered.ca:80
TURN_USERNAME=openrelayproject
TURN_PASSWORD=openrelayproject

# Fallback: Metered (upgrade if OpenRelay exhausted)
TURN_BACKUP_URLS=turn:a.relay.metered.ca:80
TURN_BACKUP_USERNAME=metered_username
TURN_BACKUP_PASSWORD=metered_password

# Generate shared secret for security
# Minimum 32 characters
TURN_SHARED_SECRET=$(openssl rand -base64 48)
```

### 6. Frontend Configuration
```env
FRONTEND_URL=https://paircam.live
CORS_ORIGINS=https://paircam.live,https://www.paircam.live
```

**Important:**
- `FRONTEND_URL` must match your actual domain
- `CORS_ORIGINS` must include all allowed origins (frontend + www variant)
- Add additional origins if needed (e.g., `https://staging.paircam.live`)

### 7. Stripe Configuration (Optional - for payments)
**Signup:** https://stripe.com/

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_WEEKLY=price_...
STRIPE_PRICE_ID_MONTHLY=price_...
```

**Getting Stripe keys:**
1. Login to Stripe Dashboard
2. Go to Developers → API Keys
3. Copy "Secret key" and "Publishable key"
4. Create webhook endpoint pointing to `https://paircam.live/webhook/stripe`
5. Copy webhook signing secret

### 8. Google OAuth (Optional - for social login)
**Signup:** https://console.cloud.google.com/

```env
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

### 9. Monitoring (Optional but recommended)
**Sentry for error tracking:** https://sentry.io/

```env
SENTRY_DSN=https://...@...sentry.io/...
SENTRY_ENVIRONMENT=production
SENTRY_TRACE_SAMPLE_RATE=0.1
```

**Log level:**
```env
LOG_LEVEL=info        # info|debug|warn|error
DEBUG_MODE=false      # Set to true for verbose logging (not recommended in prod)
```

---

## Complete Setup Checklist

### Prerequisites
- [ ] Fly.io account created: https://fly.io
- [ ] flyctl CLI installed: `curl -L https://fly.io/install.sh | sh`
- [ ] Logged into Fly.io: `flyctl auth login`

### Infrastructure Setup
- [ ] Neon PostgreSQL database created
- [ ] Neon DATABASE_URL copied
- [ ] Upstash Redis database created
- [ ] Upstash REDIS_URL copied
- [ ] Secrets generated: `openssl rand -base64 48`
- [ ] Cloudflare DNS configured
- [ ] Domain pointing to Fly.io

### Set All Required Secrets
```bash
# In order:
flyctl secrets set NODE_ENV=production
flyctl secrets set PORT=3333
flyctl secrets set NIXPACKS_NODE_VERSION=18.18.0
flyctl secrets set LOG_LEVEL=info
flyctl secrets set DATABASE_URL='postgresql://...'
flyctl secrets set REDIS_URL='redis://...'
flyctl secrets set JWT_SECRET='...'
flyctl secrets set JWT_EXPIRATION=7d
flyctl secrets set FRONTEND_URL='https://paircam.live'
flyctl secrets set CORS_ORIGINS='https://paircam.live,https://www.paircam.live'
flyctl secrets set TURN_URLS='turn:openrelay.metered.ca:80'
flyctl secrets set TURN_USERNAME='openrelayproject'
flyctl secrets set TURN_PASSWORD='openrelayproject'
flyctl secrets set TURN_SHARED_SECRET='...'
```

### Verify Setup
```bash
# List all secrets
flyctl secrets list

# Check database connection
flyctl ssh console
psql $DATABASE_URL -c "SELECT version();"

# Check Redis connection
redis-cli -u $REDIS_URL PING

# Check health endpoint
curl https://paircam.live/health
```

---

## Troubleshooting

### "Database connection refused"
- Verify DATABASE_URL format includes `?sslmode=require`
- Check Neon database is active in console
- Verify network connection from Fly.io (usually works by default)

### "Redis connection timeout"
- Verify REDIS_URL format is correct
- Check Upstash database is running
- Try connecting from your machine: `redis-cli -u $REDIS_URL PING`

### "Invalid JWT token"
- Ensure JWT_SECRET is set correctly with at least 32 characters
- Verify JWT_SECRET hasn't been copied with extra spaces
- Generate new secret: `openssl rand -base64 48`

### "TURN server not working"
- Verify TURN_URLS format: `turn:server.com:port`
- OpenRelay free tier has 20GB/month limit
- Monitor usage with: `curl https://paircam.live/metrics | grep turn`
- Upgrade to Metered if limit exceeded

---

## Security Best Practices

✅ **DO:**
- Generate secrets with `openssl rand -base64 48`
- Store in Fly.io secrets, not `.env` files
- Rotate secrets every 90 days
- Use different secrets per environment (staging vs production)
- Enable database SSL connections

❌ **DON'T:**
- Commit `.env.production` to git
- Share secrets in Slack or email
- Use simple passwords (at least 32 random characters)
- Reuse secrets across environments
- Expose secrets in logs

---

## Monitoring & Alerts

**Check secret values are set:**
```bash
flyctl secrets list
```

**View logs:**
```bash
flyctl logs --app paircam
```

**Check secrets are loaded:**
```bash
flyctl ssh console
echo $JWT_SECRET  # Should output your secret
```

**Monitor for errors:**
1. Sentry Dashboard: https://sentry.io
2. Fly.io Metrics: https://fly.io/dashboard
3. Upstash Metrics: https://console.upstash.com
4. Neon Database Metrics: https://console.neon.tech

---

## Emergency: Reset All Secrets

**WARNING: This will unset all secrets. Use only in emergency!**

```bash
flyctl secrets unset JWT_SECRET TURN_SHARED_SECRET DATABASE_URL REDIS_URL # ... etc
```

Then re-set all secrets from this guide.

---

**Last Updated:** December 2025
**Status:** ✅ Production Ready
