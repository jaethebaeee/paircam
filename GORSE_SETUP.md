# Gorse ML Recommendation Engine Setup

This guide explains how to set up and deploy Gorse for the Connect matchmaking system.

## What is Gorse?

Gorse is an open-source recommendation engine that learns from user feedback to improve matchmaking over time. It uses collaborative filtering to find users with similar preferences and behaviors.

- **GitHub**: https://github.com/gorse-io/gorse
- **Docs**: https://gorse.io/
- **Free**: Open source, self-hosted
- **License**: GPL-3.0

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 Connect Backend (NestJS)                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐      ┌──────────────┐                 │
│  │  Matchmaking │      │  Feedback    │                 │
│  │   Service    │      │   Service    │                 │
│  └──────┬───────┘      └──────┬───────┘                 │
│         │                     │                          │
│         │ (uses scores)       │ (submits ratings)        │
│         │                     │                          │
│         └─────────┬───────────┘                          │
│                   │                                      │
│         ┌─────────▼──────────┐                          │
│         │  Gorse Service     │                          │
│         │  (Sync Manager)    │                          │
│         └─────────┬──────────┘                          │
└─────────────────┼────────────────────────────────────┘
                  │
                  │ (HTTP API calls)
                  │
┌─────────────────▼────────────────────────────────────┐
│                   Gorse Server                        │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  PostgreSQL  │  │ Redis Cache  │                │
│  │  (ratings)   │  │  (fast ML)   │                │
│  └──────────────┘  └──────────────┘                │
│                                                       │
│  ┌──────────────────────────────────┐              │
│  │   ML Engine (Collaborative       │              │
│  │   Filtering + Content-based)     │              │
│  └──────────────────────────────────┘              │
└──────────────────────────────────────────────────────┘
```

## Deployment Options

### Option 1: Local Development (Docker Compose)

Best for development and testing.

```bash
cd /home/user/paircam
docker-compose -f docker-compose.gorse.yml up -d
```

This starts:
- Gorse Server (port 8088)
- PostgreSQL database
- Redis cache

### Option 2: Production Deployment (Recommended)

#### On Railway/Heroku/Cloud Platform

1. **Create Gorse instance** (if available as addon)
2. **Or deploy Gorse Docker container separately**:
   ```bash
   docker run -d \
     --name gorse \
     -e GORSE_POSTGRES_URL="postgresql://user:pass@db:5432/gorse" \
     -e GORSE_REDIS_URL="redis://redis:6379" \
     -p 8088:8088 \
     zhenghaoz/gorse:latest
   ```

3. **Update Backend Environment Variables**:
   ```env
   GORSE_API_URL=https://gorse.yourdomain.com
   ```

#### On Kubernetes (Advanced)

See `kubernetes/gorse-deployment.yaml` for a production-ready K8s configuration.

## Environment Variables

Add to your backend `.env`:

```env
# Gorse Configuration
GORSE_API_URL=http://gorse:8088
GORSE_SYNC_INTERVAL_MINUTES=60

# Optional: Authentication
GORSE_API_KEY=your-api-key-here
```

## How It Works

### 1. Data Flow

```
User A rates User B ← feedback ← /api/feedback (POST)
                                      ↓
                            FeedbackService
                                      ↓
                      Stored in PostgreSQL DB
                                      ↓
                   GorseService.syncFeedbackToGorse() [hourly]
                                      ↓
                         Gorse HTTP API
                                      ↓
                      Gorse trains ML model
                                      ↓
                   When matching users:
                   calculateGorseScore() → getRecommendations()
```

### 2. Feedback Scoring

Users rate matches 1-5 stars with optional reasons:
```json
{
  "rating": 5,
  "reasons": ["great_conversation", "interesting_person"],
  "comment": "Really enjoyed talking!",
  "connectionQuality": "excellent",
  "callDuration": 300
}
```

Gorse converts ratings to scores (1→0, 5→10) for training.

### 3. Recommendation Integration

When matching users, the system:

1. Gets top 20 recommendations for User A
2. Gets top 20 recommendations for User B
3. Calculates bonus points:
   - Mutual recommendation: +15 points
   - One-way recommendation: +10 points
   - No recommendation: 0 points

Total compatibility score caps at 100 points.

## API Endpoints

### Feedback Submission
```
POST /api/feedback
{
  "matchId": "uuid",
  "sessionId": "uuid",
  "userId": "uuid",
  "peerId": "uuid",
  "rating": 5,
  "reasons": ["great_conversation"],
  "comment": "Nice person!",
  "connectionQuality": "excellent"
}
```

### Get Feedback Stats
```
GET /api/feedback/me/stats          (authenticated user)
GET /api/feedback/:userId/stats     (public stats)
GET /api/feedback/stats/global      (global stats)
GET /api/feedback/analysis/correlations
```

### Gorse Status
```
GET /api/gorse/status
GET /api/gorse/recommendations      (authenticated)
POST /api/gorse/train               (manual training trigger)
```

## Monitoring

### Check Gorse Health
```bash
curl http://localhost:8088/api/health

# Get stats
curl http://localhost:8088/api/stats

# View dashboard
# Open browser: http://localhost:8088/
```

### Logs
```bash
# Docker
docker logs -f gorse

# Kubernetes
kubectl logs -f deployment/gorse -n connect
```

## Troubleshooting

### Gorse Not Responding

```bash
# Check if service is running
docker ps | grep gorse

# Check database connectivity
docker exec gorse curl http://localhost:8088/api/health

# Restart
docker restart gorse
```

### No Recommendations Being Generated

1. Check minimum feedback threshold (Gorse requires ~50+ ratings to start training)
2. Verify sync is running: Check backend logs for "Syncing X feedback entries to Gorse"
3. Trigger manual training: `POST /api/gorse/train`
4. Wait 1-2 hours for model training

### Memory Issues

Adjust Gorse configuration in docker-compose:
```yaml
environment:
  GORSE_CACHE_DISABLED: "false"
  GORSE_MODEL_SEARCH_SIZE: 100  # Reduce from default 1000
```

## Performance Tuning

### For ~1M Users

1. **Increase sync interval**: `GORSE_SYNC_INTERVAL_MINUTES=360` (6 hours)
2. **Use Redis cache**: `GORSE_CACHE_ENABLED=true`
3. **Batch feedback**: Update in chunks of 1000
4. **Separate Gorse instance**: Don't share with other services

### Expected Results

- **Initial setup** (0-100 ratings): Recommendations inactive, fallback to regular matching
- **Growth phase** (100-1000 ratings): Weak recommendations, improving
- **Mature** (10000+ ratings): Strong recommendations, significant match quality improvement (~20-30% better)

## Configuration Files

- `docker-compose.gorse.yml` - Local development setup
- `gorse-config.yml` - Gorse server configuration
- `kubernetes/gorse-deployment.yaml` - K8s production deployment

## Migration Strategy

### Phase 1: Setup (Week 1)
- Deploy Gorse
- Enable feedback collection
- Start aggregating ratings

### Phase 2: Calibration (Week 2-3)
- Gather 500+ feedback entries
- Monitor recommendation quality
- Adjust weights if needed

### Phase 3: Launch (Week 4+)
- Enable Gorse scoring in matchmaking
- A/B test: 50% with Gorse, 50% without
- Monitor KPIs: match quality, skip rate, call duration

## Cost Analysis

| Service | Monthly Cost |
|---------|-------------|
| Gorse (self-hosted) | $0 (included in server cost) |
| PostgreSQL | Included in main DB |
| Redis | Shared with backend |
| **Total** | **$0** |

vs. Commercial solutions like PlayFab ($500-5000+/month)

## Next Steps

1. **Deploy Gorse**: `docker-compose -f docker-compose.gorse.yml up -d`
2. **Collect feedback**: Users will rate matches in UI
3. **Monitor**: Check `/api/gorse/status` daily
4. **Optimize**: Adjust weights after 1000+ ratings
5. **Scale**: Use this foundation for recommendation feed, friend suggestions, etc.

## Additional Resources

- [Gorse Quick Start](https://gorse.io/docs/getting-started/quick-start)
- [Gorse Configuration](https://gorse.io/docs/server-admin-guide/configuration)
- [Gorse API Docs](https://gorse.io/docs/api-docs)
- [Gorse Benchmark](https://gorse.io/docs/users-guide/evaluation)
