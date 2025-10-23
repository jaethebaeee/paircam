# 🚂 Deploy to Railway.app

Railway is the easiest way to deploy your video chat app with automatic HTTPS and scaling.

## 📋 Prerequisites

- GitHub account
- Railway account (free at [railway.app](https://railway.app))
- Your code pushed to GitHub

---

## 🚀 Deployment Steps

### Step 1: Create Project

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your repository

### Step 2: Add Redis Service

1. Click **"+ New"**
2. Select **"Database"**
3. Choose **"Redis"**
4. Redis will be automatically configured

### Step 3: Deploy Backend

1. Click **"+ New"**
2. Select **"GitHub Repo"** → Your repo
3. **Configure:**
   - **Root Directory:** `packages/backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

4. **Add Variables:**
   ```
   NODE_ENV=production
   PORT=3333
   JWT_SECRET=<generate-with-openssl-rand-base64-32>
   JWT_EXPIRATION=5m
   REDIS_HOST=${{Redis.REDIS_HOST}}
   REDIS_PORT=${{Redis.REDIS_PORT}}
   REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
   TURN_SHARED_SECRET=<generate-with-openssl-rand-base64-32>
   TURN_REALM=video-chat.railway.app
   CORS_ORIGINS=${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
   LOG_LEVEL=info
   ```

5. **Generate Domain:**
   - Go to Settings → Public Networking
   - Click "Generate Domain"
   - Copy the URL (e.g., `backend-production-abc123.up.railway.app`)

### Step 4: Deploy Frontend

1. Click **"+ New"**
2. Select **"GitHub Repo"** → Your repo
3. **Configure:**
   - **Root Directory:** `packages/frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run preview -- --host 0.0.0.0 --port $PORT`

4. **Add Variables:**
   ```
   VITE_API_URL=https://<your-backend-domain>
   VITE_WS_URL=wss://<your-backend-domain>
   ```
   
   Replace `<your-backend-domain>` with the backend URL from Step 3.

5. **Generate Domain:**
   - Go to Settings → Public Networking
   - Click "Generate Domain"
   - Copy the frontend URL

### Step 5: Update CORS

1. Go back to **Backend service**
2. Update `CORS_ORIGINS` variable:
   ```
   CORS_ORIGINS=https://<your-frontend-domain>
   ```
3. Backend will automatically redeploy

---

## ✅ Verify Deployment

1. **Check Backend Health:**
   ```bash
   curl https://<backend-url>/health
   ```

2. **Open Frontend:**
   - Visit your frontend URL
   - Click "Start Video Chat"
   - Open in another browser/incognito
   - Both should match!

---

## 🎯 Custom Domain (Optional)

### Add Custom Domain to Frontend

1. In Railway, go to Frontend service
2. Settings → Public Networking
3. Click "Custom Domain"
4. Enter your domain: `yourdomain.com`
5. Add DNS record at your domain registrar:
   ```
   Type: CNAME
   Name: @
   Value: <provided-by-railway>
   ```

### Add Custom Domain to Backend

1. Go to Backend service
2. Settings → Public Networking
3. Add custom domain: `api.yourdomain.com`
4. Add DNS record:
   ```
   Type: CNAME
   Name: api
   Value: <provided-by-railway>
   ```

5. Update Frontend env variables:
   ```
   VITE_API_URL=https://api.yourdomain.com
   VITE_WS_URL=wss://api.yourdomain.com
   ```

6. Update Backend CORS:
   ```
   CORS_ORIGINS=https://yourdomain.com
   ```

---

## 📊 Monitoring

### View Logs

1. Click on any service
2. Go to **"Deployments"** tab
3. Click on latest deployment
4. View real-time logs

### Metrics

1. Click on service
2. Go to **"Metrics"** tab
3. View CPU, Memory, Network usage

### Check Health

Backend provides health endpoints:
- Health: `https://<backend-url>/health`
- Metrics: `https://<backend-url>/metrics`

---

## 💰 Pricing

- **Starter Plan (Free):**
  - $5 of usage included
  - Good for testing
  
- **Developer Plan ($5/month):**
  - $5 credit + pay for usage
  - Good for small apps
  
- **Team Plan ($20/month):**
  - $20 credit + pay for usage
  - Good for production

**Estimated cost for 500 concurrent users:** $10-20/month

---

## 🔄 Auto-Deploy

Railway automatically deploys when you push to your main branch!

```bash
git add .
git commit -m "Update feature"
git push origin main
# Railway will automatically deploy! 🚀
```

---

## 🐛 Troubleshooting

### Backend not connecting to Redis

Make sure you're using Railway's Redis variables:
```
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

### CORS errors

Update backend `CORS_ORIGINS` to match your frontend URL.

### WebSocket not working

Railway supports WebSocket out of the box. Make sure:
1. Frontend is using `wss://` (not `ws://`)
2. Backend URL is correct in frontend env vars

### Frontend build fails

Try updating the start command:
```
npm run preview -- --host 0.0.0.0 --port $PORT
```

Or use nginx in Docker (see Railway docs).

---

## ✨ Benefits of Railway

✅ **Easy Setup** - Deploy in minutes  
✅ **Auto-Deploy** - Push to deploy  
✅ **Free HTTPS** - Automatic SSL  
✅ **Auto-Scaling** - Scales with traffic  
✅ **Great DX** - Developer-friendly UI  
✅ **Built-in Redis** - One-click database  
✅ **Zero DevOps** - No server management  

---

## 🚀 You're Live!

Your video chat app is now deployed on Railway! 🎉

**Next Steps:**
1. Add custom domain
2. Set up monitoring alerts
3. Test with real users
4. Scale as needed

---

**Happy Deploying! 🚂**

