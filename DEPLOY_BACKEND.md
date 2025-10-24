# 🚀 Deploy Backend - GitHub Actions Guide

## Current Setup ✅

- ✅ Code pushed to GitHub
- ✅ Backend using: `ghcr.io/jaethebaeee/connect-backend:main`
- ✅ Kubernetes waiting for new image

## Two Options to Deploy Backend

---

## Option 1: GitHub Actions (Automatic - Recommended)

### Check if you have a workflow file:

```bash
ls -la .github/workflows/
```

If you see `backend-deploy.yml` or similar, GitHub Actions should auto-deploy!

### Check GitHub Actions:
1. Go to: https://github.com/jaethebaeee/paircam/actions
2. You should see a workflow running
3. Wait for it to complete (~5-10 minutes)
4. Backend will auto-update in Kubernetes

---

## Option 2: Manual Docker Build & Push (If no GitHub Actions)

### Step 1: Build Docker Image

```bash
cd /tmp/omegle-clone/packages/backend

# Build the image
docker build -t ghcr.io/jaethebaeee/connect-backend:main .

# Or with the new code tag
docker build -t ghcr.io/jaethebaeee/connect-backend:premium-v1 .
```

### Step 2: Push to GitHub Container Registry

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u jaethebaeee --password-stdin

# Push the image
docker push ghcr.io/jaethebaeee/connect-backend:main

# Or with new tag
docker push ghcr.io/jaethebaeee/connect-backend:premium-v1
```

### Step 3: Update Kubernetes Deployment

```bash
# Force Kubernetes to pull new image
kubectl -n connect-video-chat rollout restart deployment/backend

# Watch the rollout
kubectl -n connect-video-chat rollout status deployment/backend

# Check pods
kubectl -n connect-video-chat get pods
```

---

## Frontend (Vercel) - Should Auto-Deploy

### Check Vercel Dashboard:
1. Go to: https://vercel.com/dashboard
2. Look for "paircam" or your project
3. Should see a deployment in progress
4. Wait ~2-3 minutes for build

### Manual Deploy (if needed):
```bash
cd /tmp/omegle-clone/packages/frontend

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

## ⚠️ Important: Backend Will Crash Without Credentials!

Your new backend code requires:
- ✅ DATABASE_URL (Supabase)
- ✅ STRIPE_SECRET_KEY
- ✅ GOOGLE_CLIENT_ID
- ✅ And other env vars

**Expected behavior:**
1. Backend deploys ✅
2. Backend crashes 🔴 (missing DATABASE_URL)
3. Kubernetes keeps restarting it
4. Once you add credentials → Backend works! ✅

---

## Quick Check Commands

### Backend Status:
```bash
# Check if new pods are starting
kubectl -n connect-video-chat get pods

# Check logs (will show errors about missing DB)
kubectl -n connect-video-chat logs -f deployment/backend

# Check deployment events
kubectl -n connect-video-chat describe deployment backend
```

### Frontend Status:
```bash
# Test if new code is live
curl -I https://app.paircam.live | grep -i "x-vercel"

# Check in browser
open https://app.paircam.live
# Should see new "Get Premium" button
```

---

## 🎯 Next Steps

### 1. Verify Deployments
```bash
# Backend
kubectl -n connect-video-chat get pods
# Should see new pod with STATUS: CrashLoopBackOff or Running

# Frontend - visit in browser
open https://app.paircam.live
```

### 2. While Backend is Deploying
Work on getting credentials:
- [ ] Supabase setup
- [ ] Google OAuth setup  
- [ ] Stripe setup

### 3. Add Credentials (Once Ready)
```bash
# Update secrets in Kubernetes
kubectl -n connect-video-chat create secret generic backend-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=STRIPE_SECRET_KEY="sk_test_..." \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart to pick up secrets
kubectl -n connect-video-chat rollout restart deployment/backend
```

---

## 🐛 Troubleshooting

### Backend not updating?
```bash
# Check image pull policy
kubectl -n connect-video-chat get deployment backend -o yaml | grep imagePullPolicy

# If it's "IfNotPresent", change to "Always"
kubectl -n connect-video-chat patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","imagePullPolicy":"Always"}]}}}}'

# Force restart
kubectl -n connect-video-chat rollout restart deployment/backend
```

### Frontend not updating?
```bash
# Check Vercel deployment
vercel ls

# Force redeploy
cd packages/frontend
vercel --prod --force
```

### GitHub Actions not running?
```bash
# Check if workflow file exists
cat .github/workflows/*.yml

# Trigger manually from GitHub UI:
# Go to: Actions tab → Select workflow → Run workflow
```

---

## ✅ Success Indicators

### Backend Deployed:
```bash
kubectl -n connect-video-chat logs deployment/backend
# Should see new logs with:
# - TypeORM initialization (will fail without DB)
# - "Users module loaded"
# - "Payments module loaded"
```

### Frontend Deployed:
```bash
# Visit: https://app.paircam.live
# Should see:
# - "Get Premium" button (top right)
# - Gender selector with 3 options
# - "Continue with Google" button
```

---

## 📊 Typical Timeline

```
Now:        Code pushed to GitHub ✅
+2 min:     Vercel starts building frontend
+5 min:     Frontend deployed ✅
+5 min:     GitHub Actions builds backend (if enabled)
+10 min:    Backend image pushed to ghcr.io
+12 min:    Kubernetes pulls new image
+13 min:    Backend crashes (no DB credentials) 🔴
+30 min:    You add credentials
+31 min:    Backend restarts successfully ✅
+35 min:    🎉 Everything works!
```

---

## 🚀 Quick Deploy Script

Save as `deploy.sh`:
```bash
#!/bin/bash
echo "🚀 Deploying PairCam..."

# Backend
cd packages/backend
docker build -t ghcr.io/jaethebaeee/connect-backend:main .
docker push ghcr.io/jaethebaeee/connect-backend:main
kubectl -n connect-video-chat rollout restart deployment/backend

# Frontend  
cd ../frontend
vercel --prod

echo "✅ Deployment triggered! Check status:"
echo "Backend: kubectl -n connect-video-chat get pods"
echo "Frontend: https://vercel.com/dashboard"
```

---

**TL;DR:** 
1. ✅ Code is pushed
2. ⏳ Check if GitHub Actions auto-builds
3. If not, run manual Docker build & push
4. 🎯 Backend will crash until you add DB credentials (expected!)
5. 🌐 Frontend should auto-deploy on Vercel

