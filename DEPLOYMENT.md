# Deployment Guide - Connect Backend

Railway is the recommended deployment platform. It's already configured and costs only **$5-40/month**.

## Quick Start - Local Development

```bash
# 1. Install dependencies
cd packages/backend
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your local settings

# 3. Start development server
npm run start:dev
```

**Server**: http://localhost:3000

---

## Production Deployment - Railway ⭐

Your project is already configured via `railway.toml` for Railway deployment.

### Why Railway?

| Feature | Railway | Heroku | Self-Hosted |
|---------|---------|--------|-------------|
| **Cost** | **$5-40/mo** | $7-500/mo | $5-500/mo |
| Setup | 1 click | Medium | Complex |
| Auto-deploy | ✅ Yes | ✅ Yes | ❌ No |
| PostgreSQL | ✅ Included | $9-50/mo | DIY |
| Redis | ✅ $5-10/mo | $30+/mo | DIY |
| Scalability | ✅ Excellent | Good | Excellent |
| **WebRTC Support** | **✅ Yes** | ✅ Yes | ✅ Yes |

### Deploy to Railway (5 minutes)

1. **Connect your GitHub repository**
   - Go to https://railway.app
   - Sign in with GitHub
   - Select `paircam` repository

2. **Railway auto-detects your setup**
   - Reads `railway.toml`
   - Installs dependencies
   - Builds the backend
   - Deploys automatically

3. **Add PostgreSQL**
   ```bash
   railway add postgresql
   # Railway automatically sets DATABASE_URL
   ```

4. **Add Redis** (optional but recommended)
   ```bash
   railway add redis
   # Railway automatically sets REDIS_URL
   ```

5. **Configure environment variables**
   - Dashboard → Variables
   - Add: JWT_SECRET, CORS_ORIGINS, etc.
   - See `.env.example` for all variables

6. **Push code to deploy**
   ```bash
   git push origin main
   # Railway auto-deploys in ~2 minutes
   ```

### Railway Features

- ✅ **Auto-deployments** - Every `git push`
- ✅ **Automatic SSL/TLS** - HTTPS out of the box
- ✅ **Database backups** - Daily automatic backups
- ✅ **Environment management** - UI for secrets
- ✅ **Logs & monitoring** - Built-in dashboards
- ✅ **Global CDN** - Fast worldwide
- ✅ **Zero downtime** - Blue-green deployments
- ✅ **Rollbacks** - One-click rollback to previous version
- ✅ **Scaling** - Add replicas with a click

### Railway Pricing Breakdown

```
Monthly allowance: $5 credit
Usage-based billing after that:

Backend (Node.js):
- CPU: $0.000231 per CPU-hour
- Memory: $0.000115 per GB-hour
- Typical usage: $5-15/month

PostgreSQL:
- Included in $5 credit

Redis:
- Add-on: $5-10/month

Total typical cost: $10-25/month
(vs Heroku $50+, AWS $100+)
```

### Deploy from GitHub Actions (Optional)

If you want automated builds to a registry:

```bash
railway link  # Link to Railway project
railway up    # Deploy current code
railway logs  # View logs
railway env   # Manage variables
```

### Rollback a Deployment

```bash
# Via Railway dashboard:
# 1. Deployments tab
# 2. Select previous version
# 3. Click "Redeploy"

# Or via CLI:
railway rollback
```

---

## Custom Domain Setup

1. **Get your Railway domain**
   - Dashboard → Settings → Domains
   - See your `yourapp.up.railway.app` URL

2. **Add custom domain**
   - Dashboard → Settings → Domains
   - Add your domain (e.g., `api.connect.chat`)
   - Railway generates SSL certificate

3. **Update DNS**
   ```
   CNAME: yourapp.up.railway.app
   ```

---

## Scaling on Railway

### Vertical Scaling (More powerful)
```bash
# Dashboard → Deployments → Settings
# Increase CPU/Memory allocation
# Done! No restart needed.
```

### Horizontal Scaling (More replicas)
```bash
# Dashboard → Deployments → Settings
# Set replicas: 1 → 3
# Railway distributes traffic automatically
```

### Auto-scaling (Based on load)
```bash
# Coming soon in Railway
# Currently: manual scaling via dashboard
```

---

## Environment Variables

Railway automatically sets `DATABASE_URL` and `REDIS_URL` when you add services.

### Required to Configure

Go to Railway Dashboard → Variables and add:

```env
JWT_SECRET=your-random-secret-32+-characters
JWT_EXPIRATION=5m
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
LOG_LEVEL=info
```

### Optional (Recommended)

```env
# TURN Server (WebRTC)
TURN_PROVIDER=coturn
TURN_HOST=turn.yourdomain.com
TURN_PORT=3478
TURN_TLS_PORT=5349
TURN_SHARED_SECRET=your-secret

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Gorse ML
GORSE_API_URL=https://gorse.yourdomain.com
GORSE_SYNC_INTERVAL_MINUTES=60

# Monitoring
PROMETHEUS_PORT=9090
OTEL_ENABLED=true
```

---

## Monitoring & Logs

### View Logs

```bash
# Via Railway CLI
railway logs

# Via Railway Dashboard
# → Logs tab (real-time streaming)
```

### Health Check

```bash
curl https://yourapp.up.railway.app/health
```

### Metrics

```bash
curl https://yourapp.up.railway.app/metrics
```

---

## Database Backups

Railway automatically backs up PostgreSQL daily.

**Access backups**:
1. Railway Dashboard → Data
2. Select PostgreSQL instance
3. Backups tab
4. Download or restore

---

## Troubleshooting

### App Won't Start

```bash
# 1. Check logs
railway logs

# 2. Common issues:
# - DATABASE_URL missing → Add PostgreSQL via Railway
# - REDIS_URL missing → Add Redis via Railway
# - JWT_SECRET missing → Add to Variables

# 3. Restart
# Dashboard → Deployments → Restart
```

### High Memory Usage

```bash
# Check metrics
railway logs --tail=50

# Solutions:
# 1. Increase RAM → Dashboard → Settings
# 2. Check for memory leaks in code
# 3. Reduce Gorse sync frequency
```

### Database Connection Errors

```bash
# 1. Verify DATABASE_URL is set
railway env

# 2. Check PostgreSQL service is running
# Dashboard → Services → PostgreSQL → Status

# 3. Restart PostgreSQL
railway down postgresql
railway up postgresql
```

---

## Scaling

### Increase Resources

1. Dashboard → Deployments
2. Settings → CPU/Memory
3. Increase slider
4. Save (zero-downtime upgrade)

### Add More Replicas

1. Dashboard → Deployments
2. Settings → Replicas
3. Change 1 → 3
4. Save (load balanced automatically)

### Add More Regions

Contact Railway support to deploy in additional regions.

---

## Cost Optimization

**Current typical cost**:
- Backend: $5-15/month
- PostgreSQL: Included in $5 credit
- Redis: $5-10/month
- **Total: $10-25/month**

**To reduce costs**:
1. Use PostgreSQL (no separate charge)
2. Use Redis for caching (better than dedicated expensive tools)
3. Monitor resource usage
4. Remove unused services
5. Archive old match_feedback data

**Compared to alternatives**:
- Heroku: $50-500/month
- AWS: $100-1000+/month
- Docker (self-hosted): $100-500+/month
- **Railway saves 80-95%** ✅

---

## Deployment Checklist

Before going live:

- [ ] GitHub repo connected to Railway
- [ ] PostgreSQL database created
- [ ] Redis cache created
- [ ] JWT_SECRET configured (32+ chars)
- [ ] CORS_ORIGINS set to your domain
- [ ] TURN server configured
- [ ] Health check passing
- [ ] Custom domain added (if using)
- [ ] Backups enabled (automatic)
- [ ] Logs accessible

---

## Useful Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# View logs
railway logs

# Deploy latest code
railway up

# Manage environment variables
railway env

# View service status
railway status

# Rollback to previous version
railway rollback
```

---

## Support

- **Railway Docs**: https://docs.railway.app/
- **Railway Community**: https://railway.app/discord
- **Your GitHub**: https://github.com/jaethebaeee/paircam

---

**Deployment**: Railway ⭐
**Cost**: $10-25/month
**Status**: Production Ready ✅
**Last Updated**: 2025-12-08
