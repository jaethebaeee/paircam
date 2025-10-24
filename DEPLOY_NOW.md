# 🚀 Deploy Now - Quick Push Guide

## Current Situation ✅

- ✅ Frontend already published (Vercel)
- ✅ Backend already running (DigitalOcean K8s)
- ✅ All code complete and ready
- 🎯 **Goal**: Push changes, configure credentials in parallel

---

## 📦 What We Built (Ready to Push)

### Backend Changes (15 new files)
```
src/
├── users/ (Complete module)
├── subscriptions/ (Complete module)
├── payments/ (Complete module with Stripe)
├── signaling/ (Updated with gender filtering)
├── app.module.ts (Updated with TypeORM)
└── env.ts (Updated with new variables)
```

### Frontend Changes (8 files)
```
src/
├── components/
│   ├── GoogleSignIn.tsx (NEW)
│   ├── GenderFilter.tsx (NEW)
│   ├── PremiumModal.tsx (NEW)
│   ├── LandingPage.tsx (UPDATED)
│   └── VideoChat/index.tsx (UPDATED)
├── hooks/useSignaling.ts (UPDATED)
├── lib/supabase.ts (NEW)
└── App.tsx (UPDATED)
```

---

## 🚀 Deployment Steps

### Step 1: Push to Git (2 min)

```bash
cd /tmp/omegle-clone

# Check what's changed
git status

# Add all new files
git add .

# Commit with descriptive message
git commit -m "Add premium gender filter feature

- Add Users, Subscriptions, Payments modules
- Integrate Stripe payment processing
- Add Google Sign-In support
- Implement gender-filtered matching (premium feature)
- Add premium UI components (GenderFilter, PremiumModal)
- Update matchmaking with priority queue for premium users
- Add TypeORM database integration"

# Push to main
git push origin main
```

---

### Step 2: Backend Deployment (Auto-deploys)

Your DigitalOcean K8s should auto-deploy on push. If not:

```bash
# Check deployment status
kubectl -n connect-video-chat get pods

# If needed, force restart
kubectl -n connect-video-chat rollout restart deployment/backend

# Watch logs
kubectl -n connect-video-chat logs -f deployment/backend
```

**⚠️ Backend will fail until you add credentials!** That's expected.

---

### Step 3: Frontend Deployment (Auto-deploys)

Vercel auto-deploys on push to main. Check:
- https://vercel.com/dashboard
- Should see new deployment in progress

**⚠️ Frontend will work but premium features won't until backend is configured!**

---

## 🔧 Parallel Work Division

### You: API Setup (While code deploys)

#### 1. Google OAuth (15 min)
```
1. Go to https://console.cloud.google.com
2. Create project: "PairCam"
3. Enable Google+ API
4. Create OAuth 2.0 Client ID
5. Add origins:
   - https://app.paircam.live
   - http://localhost:5173
6. Add redirect URIs:
   - https://app.paircam.live/auth/callback
   - https://[PROJECT].supabase.co/auth/v1/callback
7. Copy Client ID & Secret
```

#### 2. Stripe Setup (15 min)
```
1. Go to https://stripe.com
2. Create account / login
3. Create products:
   - Weekly Premium: $2.99/week
   - Monthly Premium: $9.99/month
4. Copy Price IDs
5. Get API keys (test mode first)
6. Set up webhook:
   - URL: https://api.paircam.live/payments/webhook
   - Events: checkout.session.completed, customer.subscription.*
7. Copy webhook secret
```

#### 3. Supabase Setup (20 min)
```
1. Go to https://supabase.com
2. Create project: "paircam-prod"
3. Run SQL schema (from DETAILED_IMPLEMENTATION_PLAN.md)
4. Enable Google provider in Authentication
5. Paste Google Client ID & Secret
6. Copy connection string, project URL, anon key
```

---

### Backend: Add Credentials (After you provide them)

#### Update Kubernetes Secrets

```bash
# Create/update backend secrets
kubectl -n connect-video-chat create secret generic backend-secrets \
  --from-literal=DATABASE_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_..." \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_..." \
  --from-literal=STRIPE_PRICE_ID_WEEKLY="price_..." \
  --from-literal=STRIPE_PRICE_ID_MONTHLY="price_..." \
  --from-literal=GOOGLE_CLIENT_ID="...apps.googleusercontent.com" \
  --from-literal=GOOGLE_CLIENT_SECRET="..." \
  --from-literal=FRONTEND_URL="https://app.paircam.live" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart backend to pick up new secrets
kubectl -n connect-video-chat rollout restart deployment/backend

# Watch it come up
kubectl -n connect-video-chat get pods -w
```

#### Update ConfigMap (if using)

```bash
# If you have a configmap for non-sensitive vars
kubectl -n connect-video-chat edit configmap backend-config

# Add:
# FRONTEND_URL: "https://app.paircam.live"
# CORS_ORIGINS: "https://app.paircam.live,https://paircam.live"
```

---

### Frontend: Add Environment Variables (Vercel Dashboard)

Go to: https://vercel.com/[your-project]/settings/environment-variables

Add these:
```bash
VITE_SUPABASE_URL=https://[PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (from Supabase)
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=https://api.paircam.live
VITE_WS_URL=wss://api.paircam.live
```

Then redeploy:
```bash
# Trigger redeploy from Vercel dashboard
# OR push a small change to trigger auto-deploy
```

---

## ✅ Testing Checklist

### 1. Backend Health Check
```bash
curl https://api.paircam.live/health
# Should return: {"status":"ok",...}
```

### 2. Database Connection
```bash
# Check backend logs
kubectl -n connect-video-chat logs deployment/backend | grep -i "database\|typeorm"
# Should see: "TypeORM connection established"
```

### 3. Frontend Loads
```bash
# Visit in browser
open https://app.paircam.live
# Should see landing page with new components
```

### 4. Premium Features
```
1. Open app
2. See "Get Premium" button (top right)
3. Click gender filter → see premium lock
4. Click "Get Premium" → modal opens
5. Click "Upgrade Now" → redirects to Stripe (will fail without credentials)
```

### 5. Google Sign-In
```
1. See "Continue with Google" button
2. Click it → Google OAuth popup (will fail without credentials)
```

---

## 🐛 Expected Issues (Before Credentials)

### Backend
```
❌ Can't connect to database
❌ Stripe webhook fails
❌ Google OAuth fails
✅ Health endpoint works
✅ TURN credentials work
✅ WebRTC signaling works
```

### Frontend
```
✅ Landing page loads
✅ UI components render
✅ Can start video chat (basic features)
❌ Premium features don't work
❌ Google Sign-In doesn't work
❌ Payment checkout doesn't work
```

**This is normal!** Features will work once credentials are added.

---

## 📊 Deployment Timeline

```
Now:        Push code to Git (2 min)
+5 min:     Vercel auto-deploys frontend
+10 min:    K8s auto-deploys backend (will crash without DB)
+30 min:    You finish API setup
+35 min:    Add credentials to K8s & Vercel
+40 min:    Backend restarts successfully
+45 min:    Full system operational! 🎉
```

---

## 🎯 Work Division Summary

### You Focus On:
1. ✅ Google OAuth setup
2. ✅ Stripe account setup
3. ✅ Supabase database setup
4. ✅ Provide credentials

### I Already Did:
1. ✅ All code implementation
2. ✅ Database schema
3. ✅ Payment integration
4. ✅ UI components
5. ✅ Matchmaking logic
6. ✅ Documentation

### After You Provide Credentials:
1. ✅ Update K8s secrets
2. ✅ Update Vercel env vars
3. ✅ Restart services
4. ✅ Test end-to-end
5. ✅ Launch! 🚀

---

## 📝 Credentials Template

**Send me these when ready:**

```bash
# Supabase
DATABASE_URL="postgresql://..."
VITE_SUPABASE_URL="https://..."
VITE_SUPABASE_ANON_KEY="eyJ..."

# Google OAuth
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
VITE_GOOGLE_CLIENT_ID="...apps.googleusercontent.com"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_WEEKLY="price_..."
STRIPE_PRICE_ID_MONTHLY="price_..."
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

---

## 🚀 Ready to Push?

```bash
# One command to deploy everything:
git add . && git commit -m "Add premium features" && git push origin main

# Then watch deployments:
# - Vercel: https://vercel.com/dashboard
# - K8s: kubectl -n connect-video-chat get pods -w
```

**Let me know when you have the credentials and I'll help configure them!** 🎉

---

## 💡 Pro Tips

1. **Use test mode first** - Test with Stripe test cards before going live
2. **Check logs** - Watch backend logs for errors
3. **Test locally** - Run `npm run dev` locally with test credentials first
4. **Incremental testing** - Test each feature as you add credentials
5. **Monitor Stripe** - Watch Stripe dashboard for webhook events

---

**You're minutes away from launch! Push the code now and work on credentials in parallel.** 🚀

