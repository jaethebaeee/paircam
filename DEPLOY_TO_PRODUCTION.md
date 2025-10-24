# 🚀 Deploy to Production - Quick Guide

This guide will walk you through deploying PairCam to production using modern, easy-to-use platforms.

## Architecture Overview

- **Frontend**: Vercel (Free tier available)
- **Backend**: Railway (Free $5/month credit)
- **Redis**: Railway Redis
- **TURN Server**: Metered.ca (Free 50GB/month)

---

## Step 1: Deploy Backend to Railway

### 1.1 Install Railway CLI (Optional)
```bash
npm install -g @railway/cli
railway login
```

### 1.2 Deploy via Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app) and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect the backend

### 1.3 Set Environment Variables on Railway

In Railway Dashboard → Your Project → Backend Service → Variables:

```bash
# Required - Generate with: openssl rand -base64 32
JWT_SECRET=<your-strong-secret-here>

# Node
NODE_ENV=production
PORT=3333

# Database (if using)
DATABASE_URL=${{Railway.DATABASE_URL}}

# Redis - Use Railway Redis addon
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}

# TURN Server (we'll set up later)
TURN_HOST=turn.metered.ca
TURN_PORT=3478
TURN_USERNAME=<from-metered>
TURN_CREDENTIAL=<from-metered>

# CORS - Add your Vercel domain
CORS_ORIGINS=https://your-app.vercel.app
```

### 1.4 Add Redis to Railway

1. In Railway Dashboard → New → Database → Redis
2. Railway will automatically link it to your backend
3. The `REDIS_URL` variable will be available

### 1.5 Get Your Backend URL

After deployment, Railway gives you a URL like:
`https://your-app.railway.app`

Copy this URL - you'll need it for the frontend!

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### 2.2 Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Import Project"
3. Select your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.3 Set Environment Variables on Vercel

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```bash
# API URL (from Railway)
VITE_API_URL=https://your-backend.railway.app

# WebSocket URL (same as API, but with wss://)
VITE_WS_URL=wss://your-backend.railway.app
```

### 2.4 Redeploy

After adding environment variables, trigger a new deployment in Vercel.

---

## Step 3: Set Up TURN Server (for video calls)

### Option A: Metered.ca (Free Tier - Recommended)

1. Go to [metered.ca](https://www.metered.ca/)
2. Sign up for free account (50GB/month free)
3. Create a new app
4. Get your TURN credentials

Update Railway environment variables:
```bash
TURN_HOST=turn.metered.ca
TURN_PORT=443
TURN_USERNAME=<your-metered-username>
TURN_CREDENTIAL=<your-metered-credential>
```

### Option B: Twilio TURN (Pay-as-you-go)

1. Sign up at [twilio.com](https://www.twilio.com/)
2. Get credentials from Network Traversal Service
3. Update Railway environment variables

---

## Step 4: Configure CORS

In Railway → Backend → Environment Variables:

Update `CORS_ORIGINS` to include your Vercel domain:
```bash
CORS_ORIGINS=https://your-app.vercel.app,https://www.your-domain.com
```

---

## Step 5: Test Your Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test features:
   - ✅ Landing page loads
   - ✅ Can enter name and start chat
   - ✅ Video mode connects
   - ✅ Text mode works
   - ✅ "Next" button finds new matches
   - ✅ Chat messages send/receive

---

## Step 6: Add Custom Domain (Optional)

### For Frontend (Vercel):
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add `paircam.live` and `www.paircam.live`
3. Update DNS records as instructed by Vercel

### For Backend (Railway):
1. Railway Dashboard → Your Service → Settings → Domains
2. Add `api.paircam.live`
3. Update DNS records as instructed by Railway

---

## Monitoring & Maintenance

### Railway Dashboard:
- View logs: `railway logs`
- Monitor metrics: CPU, Memory, Network
- Scale as needed

### Vercel Dashboard:
- Analytics
- Performance insights
- Error tracking

---

## Cost Estimates

### Free Tier (Good for starting):
- **Vercel Frontend**: Free (up to 100GB bandwidth)
- **Railway**: $5/month credit (should be enough for light usage)
- **Metered.ca TURN**: Free (50GB/month)
- **Total**: ~$0-5/month

### Growing App (~1000 daily users):
- **Vercel**: ~$20/month
- **Railway Backend**: ~$20/month
- **Railway Redis**: ~$10/month
- **Metered.ca**: ~$30/month
- **Total**: ~$80/month

---

## Troubleshooting

### Backend won't start:
- Check Railway logs
- Verify all environment variables are set
- Ensure Redis is connected

### Frontend can't connect:
- Verify `VITE_API_URL` is correct
- Check CORS settings on backend
- Ensure backend is running

### Video calls not working:
- Verify TURN server credentials
- Test TURN connectivity: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

### WebSocket connection fails:
- Ensure `WS_URL` uses `wss://` (not `ws://`)
- Check Railway allows WebSocket connections (it does by default)

---

## Quick Commands

### Build Frontend:
```bash
cd packages/frontend && npm run build
```

### Build Backend:
```bash
cd packages/backend && npm run build
```

### Test Production Build Locally:
```bash
# Frontend
cd packages/frontend && npm run preview

# Backend
cd packages/backend && npm start
```

---

## Security Checklist

- ✅ All secrets changed from defaults
- ✅ HTTPS enabled (automatic on Vercel/Railway)
- ✅ CORS configured properly
- ✅ Rate limiting enabled
- ✅ Environment variables secured
- ✅ No secrets in code/git

---

## Next Steps After Deployment

1. **Set up monitoring**: Add error tracking (Sentry)
2. **Add analytics**: Google Analytics or Plausible
3. **Configure CDN**: Cloudflare for extra performance
4. **Set up backups**: Database backups if using one
5. **Create staging environment**: For testing before production

---

## Support

Need help? Check:
- Railway docs: https://docs.railway.app
- Vercel docs: https://vercel.com/docs
- Metered docs: https://www.metered.ca/docs

🎉 **Congratulations on deploying to production!**

