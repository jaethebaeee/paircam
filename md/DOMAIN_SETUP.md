# Domain Setup Guide for paircam.live

This guide covers connecting your domain `paircam.live` to the PairCam infrastructure.

## DNS Configuration

### Option A: Vercel (Frontend) + Railway/Render (Backend)

```dns
# Frontend - Vercel
Type: CNAME
Name: @
Value: cname.vercel-dns.com

Type: CNAME
Name: www
Value: cname.vercel-dns.com

# API Backend - Railway/Render
Type: CNAME
Name: api
Value: your-backend.railway.app (or your-backend.onrender.com)

# WebSocket (same as API if using same server)
Type: CNAME
Name: ws
Value: your-backend.railway.app
```

### Option B: Kubernetes Cluster

```dns
# Frontend
Type: A
Name: @
Value: <LOAD_BALANCER_IP>

Type: A
Name: www
Value: <LOAD_BALANCER_IP>

# API/WebSocket
Type: A
Name: api
Value: <LOAD_BALANCER_IP>

# TURN Server (required for WebRTC NAT traversal)
Type: A
Name: turn
Value: <TURN_SERVER_IP>

# Alternative TURN on different port
Type: SRV
Name: _turn._udp
Value: 10 0 3478 turn.paircam.live
```

### Option C: Single VPS (Docker Compose)

```dns
Type: A
Name: @
Value: <VPS_IP>

Type: A
Name: www
Value: <VPS_IP>

Type: A
Name: api
Value: <VPS_IP>

Type: A
Name: turn
Value: <VPS_IP>
```

## SSL/TLS Certificates

### Using Cloudflare (Recommended)

1. Add domain to Cloudflare
2. Update nameservers at your registrar
3. Enable "Full (strict)" SSL mode
4. Enable "Always Use HTTPS"
5. Set up Page Rules for caching

### Using Let's Encrypt (Self-managed)

```bash
# Install certbot
sudo apt install certbot

# Get certificates
sudo certbot certonly --standalone \
  -d paircam.live \
  -d www.paircam.live \
  -d api.paircam.live \
  -d turn.paircam.live

# Auto-renewal (add to crontab)
0 0 * * * certbot renew --quiet
```

## Environment Variables

### Frontend (.env.production)

```env
VITE_API_URL=https://api.paircam.live
VITE_WS_URL=wss://api.paircam.live
```

### Backend (.env.production)

```env
# Server
NODE_ENV=production
PORT=3333
LOG_LEVEL=info

# Security (GENERATE STRONG SECRETS!)
JWT_SECRET=<generate-with: openssl rand -base64 64>
TURN_SHARED_SECRET=<generate-with: openssl rand -base64 32>

# CORS - Production domains
CORS_ORIGINS=https://paircam.live,https://www.paircam.live

# Redis
REDIS_URL=redis://:<password>@<redis-host>:6379

# Database
DATABASE_URL=postgresql://<user>:<pass>@<host>:5432/paircam?sslmode=require

# TURN Server
TURN_HOST=turn.paircam.live
TURN_PORT=3478
TURN_REALM=paircam.live

# Stripe (Production keys)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_WEEKLY=price_xxx
STRIPE_PRICE_ID_MONTHLY=price_xxx
```

## TURN Server Configuration

### Coturn Config (/etc/turnserver.conf)

```conf
# Network
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=<YOUR_PUBLIC_IP>

# Domain
realm=paircam.live
server-name=paircam.live

# Authentication
use-auth-secret
static-auth-secret=<SAME_AS_TURN_SHARED_SECRET>

# Security
no-tlsv1
no-tlsv1_1
fingerprint
no-multicast-peers

# TLS (optional but recommended)
cert=/etc/letsencrypt/live/turn.paircam.live/fullchain.pem
pkey=/etc/letsencrypt/live/turn.paircam.live/privkey.pem

# Logging
log-file=/var/log/turnserver.log
verbose
```

## Vercel Deployment

### vercel.json

```json
{
  "buildCommand": "cd packages/frontend && npm run build",
  "outputDirectory": "packages/frontend/dist",
  "installCommand": "cd packages/frontend && npm install",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

### Deploy Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod

# Set environment variables
vercel env add VITE_API_URL production
vercel env add VITE_WS_URL production
```

## Railway Deployment (Backend)

### railway.json

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "packages/backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Deploy Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up

# Set environment variables
railway variables set JWT_SECRET=xxx
railway variables set DATABASE_URL=xxx
# ... etc
```

## Health Check Endpoints

After deployment, verify these endpoints:

```bash
# Frontend
curl https://paircam.live
# Should return HTML

# Backend Health
curl https://api.paircam.live/health
# Should return: {"status":"ok","timestamp":"..."}

# Backend Readiness
curl https://api.paircam.live/health/ready
# Should return: {"status":"ready","services":{"redis":"connected"}}

# WebSocket (test with wscat)
npx wscat -c wss://api.paircam.live/signaling
# Should connect successfully
```

## Cloudflare Configuration (Recommended)

### Page Rules

1. `*paircam.live/*` → SSL: Full (Strict)
2. `api.paircam.live/*` → Cache Level: Bypass
3. `turn.paircam.live/*` → Proxy: OFF (DNS only - required for TURN)

### Firewall Rules

```
# Allow WebSocket upgrades
(http.request.uri.path contains "/socket.io") → Allow

# Block suspicious patterns
(http.request.uri.query contains "script") → Block
```

### DNS Settings

- **Proxy status**:
  - `paircam.live` → Proxied (orange cloud)
  - `www.paircam.live` → Proxied
  - `api.paircam.live` → Proxied (for DDoS protection)
  - `turn.paircam.live` → DNS only (gray cloud) **IMPORTANT!**

## Post-Deployment Checklist

- [ ] Frontend loads at https://paircam.live
- [ ] API health check passes at https://api.paircam.live/health
- [ ] WebSocket connects at wss://api.paircam.live/signaling
- [ ] TURN server accessible (test with https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)
- [ ] SSL certificates valid (check with https://www.ssllabs.com/ssltest/)
- [ ] Stripe webhooks configured at https://api.paircam.live/payments/webhook
- [ ] Error tracking (Sentry) receiving events
- [ ] Monitoring dashboard showing metrics

## Troubleshooting

### WebSocket Connection Issues
```bash
# Check if WebSocket upgrade works
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://api.paircam.live/socket.io/
```

### TURN Server Issues
```bash
# Test TURN connectivity
turnutils_uclient -T -u user -w password turn.paircam.live

# Check if ports are open
nc -zv turn.paircam.live 3478
nc -zvu turn.paircam.live 3478
```

### SSL Certificate Issues
```bash
# Check certificate
openssl s_client -connect api.paircam.live:443 -servername api.paircam.live

# Check expiry
echo | openssl s_client -connect paircam.live:443 2>/dev/null | openssl x509 -noout -dates
```
