# 🚀 Quick Deployment Steps

## ✅ What's Done
- ✅ Frontend built successfully
- ✅ Backend built successfully  
- ✅ Configuration files created
- ✅ Ready to deploy!

---

## 📦 What You Need

1. **GitHub Account** - To push your code
2. **Vercel Account** - For frontend (sign up free at vercel.com)
3. **Railway Account** - For backend + Redis (sign up free at railway.app)
4. **Metered Account** - For TURN server (sign up free at metered.ca)

---

## 🎯 Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
cd /tmp/omegle-clone

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit changes
git commit -m "Ready for production deployment"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/paircam.git

# Push to GitHub
git push -u origin main
```

---

### Step 2: Deploy Backend to Railway (5 minutes)

1. **Go to [railway.app](https://railway.app)** and sign up with GitHub

2. **Click "New Project"**

3. **Select "Deploy from GitHub repo"** → Choose your repository

4. **Configure the service:**
   - Railway should auto-detect the monorepo structure
   - Root directory: `packages/backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

5. **Add Redis database:**
   - Click "New" → "Database" → "Add Redis"
   - Railway will automatically link it

6. **Set Environment Variables:**
   - Click your backend service → "Variables" → "RAW Editor"
   - Paste this (generate secrets with `openssl rand -base64 32`):

```bash
JWT_SECRET=<paste-generated-secret>
NODE_ENV=production
PORT=3333
CORS_ORIGINS=https://your-app.vercel.app
TURN_HOST=turn.metered.ca
TURN_PORT=443
```

7. **Get your backend URL:**
   - In Railway, your service will have a URL like: `https://xxx.railway.app`
   - **Copy this URL** - you'll need it!

---

### Step 3: Deploy Frontend to Vercel (3 minutes)

1. **Go to [vercel.com](https://vercel.com)** and sign up with GitHub

2. **Click "Add New" → "Project"**

3. **Import your GitHub repository**

4. **Configure the project:**
   - Framework Preset: **Vite**
   - Root Directory: `packages/frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Set Environment Variables:**
   - Click "Environment Variables"
   - Add these (use your Railway URL from Step 2):

```bash
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app
```

6. **Click "Deploy"**

7. **Wait for deployment** (1-2 minutes)

8. **Get your Vercel URL:**
   - Vercel gives you: `https://your-app.vercel.app`
   - **Copy this URL**

---

### Step 4: Update Backend CORS (1 minute)

1. **Go back to Railway**

2. **Click your backend service → Variables**

3. **Update CORS_ORIGINS:**
```bash
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
```

4. **Redeploy** (Railway will auto-redeploy)

---

### Step 5: Set Up TURN Server (2 minutes)

1. **Go to [metered.ca](https://www.metered.ca/signup)** and sign up

2. **Create a new app**

3. **Copy your credentials** (username & password)

4. **Add to Railway** environment variables:
```bash
TURN_USERNAME=<your-metered-username>
TURN_CREDENTIAL=<your-metered-password>
```

---

### Step 6: Test Your Deployment! 🎉

1. Visit your Vercel URL: `https://your-app.vercel.app`

2. **Test Checklist:**
   - [ ] Landing page loads
   - [ ] Can enter name
   - [ ] Video chat starts
   - [ ] Text mode works
   - [ ] "Next" button works
   - [ ] Chat messages work

---

## 🐛 Troubleshooting

### "Backend not connecting"
- Check Railway logs: Railway Dashboard → Your Service → Logs
- Verify `VITE_API_URL` is correct in Vercel
- Make sure backend is running (check Railway dashboard)

### "WebSocket connection failed"
- Ensure you're using `wss://` (not `ws://`) in `VITE_WS_URL`
- Check CORS settings include your Vercel domain

### "Video not working"
- Check TURN credentials are correct
- Try on different networks (some corporate firewalls block WebRTC)

---

## 💰 Cost Breakdown

**Free Tier (Good for launch):**
- Vercel: Free (100GB bandwidth)
- Railway: $5/month credit (enough for light usage)
- Metered.ca: Free (50GB/month)
- **Total: ~$0-5/month**

---

## 🎯 Next Steps After Deployment

1. **Add Custom Domain:**
   - Vercel: Settings → Domains → Add `paircam.live`
   - Railway: Settings → Domains → Add `api.paircam.live`

2. **Set Up Monitoring:**
   - Railway has built-in metrics
   - Add Sentry for error tracking
   - Add Google Analytics

3. **Configure Backups:**
   - Railway Redis has automatic backups
   - Export user data regularly if using database

4. **Scale as Needed:**
   - Railway: Upgrade plan for more resources
   - Vercel: Scales automatically

---

## 📊 Monitor Your App

**Railway Dashboard:**
- View logs in real-time
- Monitor CPU/Memory usage
- Check deployment status

**Vercel Dashboard:**
- View deployment logs
- Check analytics
- Monitor performance

---

## 🔒 Security Checklist

Before going live:
- [ ] Change all default secrets
- [ ] HTTPS enabled (automatic on Vercel/Railway)
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] No secrets in code
- [ ] Environment variables secure

---

## 🚀 You're Live!

Congratulations! Your video chat app is now live in production!

**Share your app:**
- Tweet about it
- Post on Product Hunt
- Share with friends

**Need help?** Read the full guide: `DEPLOY_TO_PRODUCTION.md`

---

## Quick Commands

```bash
# View Railway logs
railway logs

# Redeploy on Vercel
vercel --prod

# Check build status
vercel ls

# Railway local development
railway run npm run dev
```

🎉 **Happy deploying!**

