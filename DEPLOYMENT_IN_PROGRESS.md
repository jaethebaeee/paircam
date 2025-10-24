# 🚀 Deployment In Progress

**Status**: ✅ Code pushed, builds running  
**Time**: October 24, 2025 @ 4:32 PM  
**Commit**: `0cec36f` - "Fix TypeScript compilation errors in tests and Stripe types"

---

## ✅ What's Done

### 1. Frontend - Already Published ✅
- **Status**: Live at https://app.paircam.live
- **Platform**: Vercel
- **Auto-deploy**: YES (triggers on git push)
- **Expected**: New version deploying now

### 2. Backend - Building Now ⏳
- **Platform**: GitHub Actions → ghcr.io → Kubernetes
- **Build**: [In Progress](https://github.com/jaethebaeee/paircam/actions)
- **Image**: `ghcr.io/jaethebaeee/connect-backend:main`
- **Deployment**: DigitalOcean Kubernetes

---

## 📊 Build Status

Check live status:
```bash
# Watch GitHub Actions
gh run watch

# Or check manually
gh run list --limit 3
```

Expected timeline:
- **+2 min**: GitHub Actions completes ✅
- **+3 min**: Docker image pushed to ghcr.io ✅
- **+5 min**: Kubernetes pulls new image
- **+6 min**: Backend pod restarts with new code
- **+6 min**: Backend crashes (no database yet) 🔴

---

## ⚠️ Expected: Backend Will Crash

**This is NORMAL and EXPECTED!**

The new code requires:
- ✅ Database (PostgreSQL via Supabase)
- ✅ Stripe API keys
- ✅ Google OAuth credentials

Without these, the backend will crash on startup:
```
Error: Missing DATABASE_URL environment variable
Error: Unable to connect to the database
```

Kubernetes will keep restarting it every 30 seconds:
```bash
kubectl -n connect-video-chat get pods
# Output:
# backend-xxx  0/1  CrashLoopBackOff  5  3m
```

---

## 🎯 Next Steps (While Build Runs)

### Step 1: Create Supabase Database (5 minutes)

1. Go to: https://supabase.com
2. Click "New project"
3. Fill in:
   - Name: `paircam-db`
   - Database Password: (generate strong password)
   - Region: Choose closest to your users
4. Wait ~2 minutes for provisioning
5. Go to: Settings → Database → Connection string
6. Copy the **Connection pooling** URL (looks like `postgresql://...`)
7. Save it! You'll need it.

### Step 2: Setup Google OAuth (5 minutes)

1. Go to: https://console.cloud.google.com
2. Create new project: "PairCam"
3. Enable Google+ API
4. Go to: Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure:
   - Application type: Web application
   - Authorized JavaScript origins: 
     - `https://app.paircam.live`
     - `http://localhost:5173` (for testing)
   - Authorized redirect URIs:
     - `https://app.paircam.live`
6. Copy Client ID and Client Secret
7. Save them!

### Step 3: Setup Stripe (5 minutes)

1. Go to: https://dashboard.stripe.com
2. Sign up / Sign in
3. Switch to **Test mode** (toggle in sidebar)
4. Go to: Developers → API keys
5. Copy:
   - Publishable key (starts with `pk_test_...`)
   - Secret key (starts with `sk_test_...`)
6. Go to: Products → Add product
7. Create two products:
   - **Weekly Premium**: $4.99/week
   - **Monthly Premium**: $14.99/month
8. Copy the Price IDs (starts with `price_...`)
9. Go to: Developers → Webhooks → Add endpoint
10. URL: `https://api.paircam.live/api/payments/webhook`
11. Events: Select all `checkout.*` and `customer.subscription.*` events
12. Copy the **Webhook signing secret** (starts with `whsec_...`)

---

## 🔐 Step 4: Add Credentials to Kubernetes

Once you have all credentials, add them:

```bash
# Create/update backend secrets
kubectl -n connect-video-chat create secret generic backend-secrets \
  --from-literal=DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_..." \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_..." \
  --from-literal=STRIPE_PRICE_ID_WEEKLY="price_..." \
  --from-literal=STRIPE_PRICE_ID_MONTHLY="price_..." \
  --from-literal=GOOGLE_CLIENT_ID="....apps.googleusercontent.com" \
  --from-literal=GOOGLE_CLIENT_SECRET="..." \
  --from-literal=FRONTEND_URL="https://app.paircam.live" \
  --dry-run=client -o yaml | kubectl apply -f -

# Update the backend deployment to use secrets
kubectl -n connect-video-chat patch deployment backend --patch '
spec:
  template:
    spec:
      containers:
      - name: backend
        envFrom:
        - secretRef:
            name: backend-secrets
'

# Restart backend to pick up secrets
kubectl -n connect-video-chat rollout restart deployment/backend

# Watch it come up
kubectl -n connect-video-chat rollout status deployment/backend
```

---

## ✅ Verification Commands

### Check Backend Build
```bash
# Watch the build
gh run watch

# See if it succeeded
gh run list --limit 1
# Should say: "completed  success"
```

### Check Kubernetes Deployment
```bash
# See pods
kubectl -n connect-video-chat get pods
# Before credentials: STATUS = CrashLoopBackOff
# After credentials: STATUS = Running

# Check logs (will show errors before credentials)
kubectl -n connect-video-chat logs -f deployment/backend

# Once running, you should see:
# ✓ Database connected
# ✓ Stripe initialized
# ✓ Users module loaded
# ✓ Payments module loaded
# ✓ WebSocket server listening on 0.0.0.0:3333
```

### Check Frontend
```bash
# Visit: https://app.paircam.live
# You should see:
# 1. New "Get Premium" button (top right)
# 2. Gender selector (Male/Female/Other)
# 3. "Continue with Google" button
# 4. Gender filter toggle (with lock icon if not premium)

# Check Vercel deployment
vercel ls

# Or visit Vercel dashboard
open https://vercel.com/dashboard
```

### Test End-to-End
```bash
# 1. Open two browser windows: https://app.paircam.live
# 2. In both: Allow camera/mic
# 3. Both should get matched together
# 4. Try clicking "Get Premium" → Should redirect to Stripe Checkout
# 5. Use test card: 4242 4242 4242 4242, any future date, any CVC
# 6. After payment, should redirect back and unlock gender filter
```

---

## 🐛 Troubleshooting

### Build Failed?
```bash
# Check the error
gh run view --log-failed

# If TypeScript errors, run locally:
cd packages/backend
npm run build

# Fix errors, commit, push again
```

### Kubernetes Not Pulling New Image?
```bash
# Check image pull policy
kubectl -n connect-video-chat get deployment backend -o yaml | grep imagePullPolicy

# Should be "Always", if not:
kubectl -n connect-video-chat patch deployment backend -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","imagePullPolicy":"Always"}]}}}}'

# Force restart
kubectl -n connect-video-chat rollout restart deployment/backend
```

### Backend Stuck in CrashLoopBackOff?
```bash
# Check logs
kubectl -n connect-video-chat logs deployment/backend

# If missing DATABASE_URL → Add credentials (see Step 4 above)
# If database connection refused → Check Supabase is running
# If other errors → Share logs with team
```

### Frontend Not Updating?
```bash
# Check Vercel deployment logs
vercel logs

# Force redeploy
cd packages/frontend
vercel --prod --force

# Clear browser cache and hard refresh (Cmd+Shift+R)
```

### Stripe Webhook Not Working?
```bash
# Test webhook locally first with Stripe CLI:
stripe listen --forward-to localhost:3333/api/payments/webhook

# Test a payment
stripe trigger checkout.session.completed

# Check backend logs
kubectl -n connect-video-chat logs deployment/backend | grep webhook
```

---

## 📈 Monitoring

### Real-time Backend Logs
```bash
# Follow logs
kubectl -n connect-video-chat logs -f deployment/backend

# Watch for errors
kubectl -n connect-video-chat logs -f deployment/backend | grep -i error

# Watch for successful matches
kubectl -n connect-video-chat logs -f deployment/backend | grep -i match
```

### Check Metrics
```bash
# CPU/Memory usage
kubectl -n connect-video-chat top pods

# Request count
curl https://api.paircam.live/metrics

# Health check
curl https://api.paircam.live/health
```

---

## 🎉 Success Criteria

### Backend is Ready When:
- ✅ Pod status is `Running`
- ✅ Logs show "WebSocket server listening"
- ✅ Health check returns 200: `curl https://api.paircam.live/health`
- ✅ Can create matches: Check `/metrics` for `matchmaking_matches_total > 0`

### Frontend is Ready When:
- ✅ https://app.paircam.live loads
- ✅ Can see "Get Premium" button
- ✅ Can select gender
- ✅ Can click "Start Chat"
- ✅ Two users can match and video chat

### Payments are Ready When:
- ✅ Click "Get Premium" → Opens Stripe Checkout
- ✅ Enter test card → Payment succeeds
- ✅ Redirects back to site with premium status
- ✅ Gender filter unlocks (no lock icon)
- ✅ Can select "Match with Females only"

---

## 📞 Need Help?

### Check Documentation
- `/tmp/omegle-clone/QUICK_START_GUIDE.md` - Setup tutorial
- `/tmp/omegle-clone/FINAL_CHECKLIST.md` - Full launch guide
- `/tmp/omegle-clone/DESIGN_SYSTEM.md` - UI/UX guide

### Common Issues
- **"Module not found"**: Run `npm install` in packages/backend
- **"TypeScript errors"**: Check `tsconfig.json` and run `npm run build`
- **"Database connection failed"**: Check DATABASE_URL format and Supabase status
- **"Stripe webhook failed"**: Verify webhook secret and endpoint URL
- **"No video"**: Check HTTPS (WebRTC requires HTTPS in production)

---

## ⏱️ Current Status Summary

```
🎨 Frontend:  ⏳ Deploying (Vercel auto-deploy)
🔧 Backend:   ⏳ Building (GitHub Actions)
🗄️ Database:  ⚠️ Not configured yet
💳 Stripe:    ⚠️ Not configured yet
🔐 Google:    ⚠️ Not configured yet
```

**Next Action**: While builds complete, set up Supabase, Google OAuth, and Stripe (Steps 1-3 above)

---

**Last Updated**: October 24, 2025 @ 4:32 PM  
**Build Watch**: `gh run watch`  
**Pod Watch**: `kubectl -n connect-video-chat get pods -w`

