# Deployment Guide - Connect Backend

This guide covers deployment options for the Connect backend, from local development to global production.

## Quick Start

### Option 1: Local Development

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
**API Docs**: http://localhost:3000/api

---

## Deployment Options

### Option 1: Railway (Current Setup) ⭐ Recommended

Your project is already configured for Railway deployment via `railway.toml`.

**Pros**:
- ✅ Zero-config (Railway autodetects Node.js)
- ✅ Automatic SSL/TLS certificates
- ✅ Built-in environment variable management
- ✅ One-click deploy from GitHub
- ✅ Automatic builds on push
- ✅ Integrated PostgreSQL addon
- ✅ Global CDN
- ✅ Pay-per-use (no fixed costs)

**Deploy to Railway**:
1. Push code to GitHub
2. Connect your GitHub repo to Railway
3. Railway auto-builds and deploys
4. Environment variables auto-synced

**Cost**: ~$5-50/month depending on usage

### Option 2: Docker + Container Registry (CI/CD)

Push Docker images to GitHub Container Registry (GHCR) for manual deployment.

**Dockerfile**: Already created at `packages/backend/Dockerfile`

**GitHub Actions Workflow**: `.github/workflows/build-backend.yml`

**Manual Docker Build**:
```bash
# Build image
docker build -t connect-backend:latest packages/backend

# Run locally
docker run -e DATABASE_URL=postgresql://... \
           -e REDIS_URL=redis://... \
           -p 3000:3000 \
           connect-backend:latest

# Push to registry
docker tag connect-backend:latest ghcr.io/yourusername/connect-backend:latest
docker push ghcr.io/yourusername/connect-backend:latest
```

**Deploy to**:
- AWS ECS
- Heroku
- DigitalOcean App Platform
- Google Cloud Run
- Azure Container Instances
- Self-hosted Docker Swarm/Kubernetes

### Option 3: Kubernetes (Enterprise)

For global scale, high availability.

**Prerequisites**: Kubernetes cluster (AWS EKS, GKE, AKS, etc.)

**Create Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: connect-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: ghcr.io/yourusername/connect-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: database-url
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

**Cost**: $50-500+/month depending on scale

### Option 4: Heroku (Legacy)

Still supported, but Railway is cheaper and better.

```bash
# Install Heroku CLI
# heroku login
# heroku create your-app-name
# heroku addons:create heroku-postgresql:hobby-dev
# git push heroku main
```

**Cost**: $7-500+/month

---

## Environment Variables

### Required (All Deployments)

```env
# Node environment
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/connect

# Cache (Redis)
REDIS_URL=redis://user:password@host:6379/0

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=5m

# CORS
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# TURN Server
TURN_PROVIDER=coturn
TURN_HOST=turn.yourdomain.com
TURN_PORT=3478
TURN_TLS_PORT=5349
TURN_SHARED_SECRET=your-secret
```

### Optional (Recommended for Production)

```env
# Monitoring
PROMETHEUS_PORT=9090
OTEL_ENABLED=true

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Gorse ML
GORSE_API_URL=https://gorse.yourdomain.com
GORSE_SYNC_INTERVAL_MINUTES=60
```

---

## Scaling Strategies

### Stage 1: Single Instance (0-10K users)

```
Users → Load Balancer → Backend (1) → PostgreSQL → Redis
```

- **Cost**: $5-50/month
- **Latency**: 50-200ms
- **Setup**: Railway default

### Stage 2: Multi-Region (10K-100K users)

```
Users
├── North America → Backend (US) → PostgreSQL (US)
├── Europe → Backend (EU) → PostgreSQL (EU)
└── Asia → Backend (APAC) → PostgreSQL (APAC)

All regions ↔ Redis Cluster (global)
```

- **Cost**: $50-500/month
- **Latency**: 10-50ms (regional)
- **Setup**: Railway Regions or multi-cloud

### Stage 3: Global High-Availability (100K+ users)

```
Cloudflare/Route53 (global DNS)
│
├── Region 1: Backend × 3 replicas + PostgreSQL + Redis
├── Region 2: Backend × 3 replicas + PostgreSQL + Redis
└── Region 3: Backend × 3 replicas + PostgreSQL + Redis

Shared: Analytics DB, Gorse ML
```

- **Cost**: $500-5000+/month
- **Latency**: <10ms (geo-optimized)
- **Setup**: Kubernetes or multi-region Railway

---

## Monitoring & Alerts

### Health Checks

```bash
# Endpoint
GET /health

# Response
{
  "status": "ok",
  "timestamp": "2025-12-08T10:00:00Z"
}
```

### Metrics (Prometheus)

```bash
# Endpoint
GET /metrics

# Metrics
- video_chat_connections_total
- video_chat_connection_time_seconds
- matchmaking_queue_length
- api_requests_total
- api_request_duration_seconds
```

### Logging

- Railway: Integrated logs
- Docker: `docker logs <container>`
- Kubernetes: `kubectl logs <pod>`

### Recommended Monitoring Tools

- **Error tracking**: Sentry
- **APM**: New Relic or DataDog
- **Metrics**: Prometheus + Grafana
- **Alerts**: PagerDuty

---

## Database Backups

### PostgreSQL Backups

```bash
# Manual backup
pg_dump postgresql://user:pass@host/dbname > backup.sql

# Restore
psql postgresql://user:pass@host/dbname < backup.sql

# Automated (Railway)
# Railway manages automated daily backups
# Access: Dashboard → Data → Backups
```

### Redis Persistence

```bash
# Enable AOF (Append-Only File) for durability
redis-cli CONFIG SET appendonly yes
```

---

## Security Checklist

- [ ] JWT_SECRET is >32 random characters
- [ ] DATABASE_URL uses strong password
- [ ] CORS_ORIGINS restricted to your domain
- [ ] HTTPS enforced (automatic on Railway)
- [ ] Database backups enabled
- [ ] Environment variables not in git
- [ ] Rate limiting enabled
- [ ] TURN server credentials rotated monthly
- [ ] PostgreSQL port not exposed publicly
- [ ] Redis requires authentication

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
railway logs  # Railway
docker logs <container>  # Docker

# Common issues:
# 1. Database connection failed
#    → Check DATABASE_URL and network access
# 2. Redis not available
#    → Check REDIS_URL and Redis service
# 3. Port already in use
#    → Change PORT env var
```

### High Latency

```bash
# Check region
curl https://api.yourdomain.com/health

# Measure latency
ping api.yourdomain.com

# Solutions:
# 1. Deploy to region closer to users
# 2. Enable caching (Redis)
# 3. Use CDN for static assets
```

### Database Too Large

```sql
-- Check size
SELECT pg_size_pretty(pg_database_size('connect'));

-- Archive old data
DELETE FROM match_feedback WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '30 days';

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

---

## Cost Comparison

| Platform | Monthly Cost | Scaling | Best For |
|----------|-------------|---------|----------|
| **Railway** | $5-100 | Good | Production ⭐ |
| Heroku | $7-500 | OK | Simple apps |
| AWS EC2 | $5-500 | Excellent | Enterprise |
| AWS Fargate | $10-500 | Excellent | Containers |
| Vercel | $0-150 | Good | Serverless |
| DigitalOcean | $5-480 | Good | Developers |
| Render | $7-100 | Good | Simple apps |

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database created and migrated
- [ ] Redis instance running
- [ ] TURN server configured
- [ ] SSL/TLS certificates valid
- [ ] Health check passing
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Team notified of deployment
- [ ] Rollback plan prepared

---

## Useful Commands

```bash
# Railway
railway up
railway logs
railway env

# Docker
docker build -t connect-backend packages/backend
docker run -p 3000:3000 connect-backend
docker push ghcr.io/username/connect-backend

# Kubernetes
kubectl apply -f deployment.yaml
kubectl logs deployment/connect-backend
kubectl scale deployment/connect-backend --replicas=5

# Development
npm run start:dev    # With hot reload
npm run build        # Build for production
npm run typeorm      # Run migrations
```

---

## Support

- **Railway Docs**: https://docs.railway.app/
- **Docker Docs**: https://docs.docker.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/documentation/

---

**Last Updated**: 2025-12-08
**Status**: Production Ready ✅
