# 🚀 Ready to Launch - Final Steps

**Status**: All code complete! Just need credentials.  
**Last Updated**: October 24, 2025 @ 4:50 PM  
**Commit**: `b9e77f6` - "Add missing backend endpoints"

---

## ✅ What's Complete

### Backend (100% Code Complete)
- ✅ User management system
- ✅ Subscription management
- ✅ Payment processing (Stripe)
- ✅ Gender-filtered matchmaking
- ✅ Premium user priority
- ✅ All API endpoints:
  - `GET /api/users/me` - Get user profile & premium status
  - `POST /api/users/sync` - Sync Google sign-in with backend
  - `PUT /api/users/me` - Update user profile
  - `POST /api/payments/create-checkout` - Create Stripe checkout
  - `GET /api/payments/verify` - Verify payment success
  - `POST /api/payments/webhook` - Handle Stripe webhooks
  - `POST /api/payments/cancel-subscription` - Cancel subscription

### Frontend (100% Code Complete)
- ✅ Auth context provider
- ✅ Google Sign-In integration
- ✅ Premium modal & checkout flow
- ✅ Gender filter with premium lock
- ✅ Dynamic premium status
- ✅ All UI components styled

### Deployment (Auto-deploying Now)
- ✅ GitHub Actions building backend
- ✅ Vercel deploying frontend
- ✅ Kubernetes ready to receive new pods

---

## ⏳ What's Deploying Right Now

```bash
# Check status:
gh run list --limit 1
```

**Expected**:
- Backend build: ~2 minutes
- Frontend deploy: ~2 minutes
- Both will be live by 4:52 PM

**But they won't work yet** because they need credentials!

---

## 🔐 What You Need to Do (30 minutes)

### Step 1: Create Supabase Project (5 min)

1. Go to https://supabase.com
2. Click "New project"
3. Fill in:
   - **Name**: `paircam-db`
   - **Database Password**: (generate strong password - save it!)
   - **Region**: US West (or closest to your users)
4. Wait ~2 minutes for provisioning
5. Go to: **Settings → Database → Connection string**
6. Copy the **Connection pooling** URL (transaction mode)
7. Replace `[YOUR-PASSWORD]` with your actual password

**You'll get something like**:
```
postgresql://postgres.abcdefgh:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

### Step 2: Setup Google OAuth (5 min)

1. Go to https://console.cloud.google.com
2. Create new project: **"PairCam"**
3. Enable **Google+ API**
4. Go to: **Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: PairCam Web Client
   - **Authorized JavaScript origins**:
     - `https://app.paircam.live`
     - `http://localhost:5173` (for local testing)
   - **Authorized redirect URIs**:
     - `https://app.paircam.live`
     - `http://localhost:5173`
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

**You'll get**:
```
Client ID: 123456789-abc123def456.apps.googleusercontent.com
Client Secret: GOCSPX-abcdefghijklmnop
```

### Step 3: Enable Google in Supabase (2 min)

1. In Supabase dashboard: **Authentication → Providers → Google**
2. Toggle **Enable Sign in with Google**
3. Paste your Google Client ID and Secret
4. Copy the **Redirect URL** shown (should be like `https://[PROJECT].supabase.co/auth/v1/callback`)
5. Go back to Google Console and add this redirect URL
6. Click **Save** in Supabase

### Step 4: Setup Stripe (10 min)

1. Go to https://dashboard.stripe.com
2. Sign up / Sign in
3. **Switch to Test mode** (toggle in top right)
4. Go to: **Developers → API keys**
5. Copy:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal")

6. Create products:
   - Go to: **Products → Add product**
   - **Product 1**:
     - Name: `Premium Weekly`
     - Price: `$2.99`
     - Billing period: `Weekly`
     - Click **Save**
     - Copy the **Price ID**: `price_...`
   - **Product 2**:
     - Name: `Premium Monthly`
     - Price: `$9.99`
     - Billing period: `Monthly`
     - Click **Save**
     - Copy the **Price ID**: `price_...`

7. Setup webhook:
   - Go to: **Developers → Webhooks → Add endpoint**
   - **Endpoint URL**: `https://api.paircam.live/api/payments/webhook`
   - **Events to send**: Select these:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Click **Add endpoint**
   - Click on the webhook you just created
   - Click **Reveal** under "Signing secret"
   - Copy the **Webhook signing secret**: `whsec_...`

### Step 5: Add Credentials to Backend (3 min)

```bash
# Create the secret with all credentials
kubectl -n connect-video-chat create secret generic backend-secrets \
  --from-literal=DATABASE_URL="postgresql://postgres.abcdefgh:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_..." \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_..." \
  --from-literal=STRIPE_PRICE_ID_WEEKLY="price_..." \
  --from-literal=STRIPE_PRICE_ID_MONTHLY="price_..." \
  --from-literal=GOOGLE_CLIENT_ID="123456789-abc123.apps.googleusercontent.com" \
  --from-literal=GOOGLE_CLIENT_SECRET="GOCSPX-..." \
  --from-literal=FRONTEND_URL="https://app.paircam.live" \
  --dry-run=client -o yaml | kubectl apply -f -

# Update deployment to use the secrets
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

# Watch it come up (should take ~30 seconds)
kubectl -n connect-video-chat rollout status deployment/backend
```

### Step 6: Add Credentials to Frontend (5 min)

1. Go to https://vercel.com/dashboard
2. Click on your **paircam** project
3. Go to: **Settings → Environment Variables**
4. Add these variables (one by one):

```
VITE_API_URL = https://api.paircam.live
VITE_WS_URL = wss://api.paircam.live
VITE_SUPABASE_URL = https://[YOUR-PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GOOGLE_CLIENT_ID = 123456789-abc123.apps.googleusercontent.com
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_...
```

5. Click **Save**
6. Go to: **Deployments**
7. Click the **⋯** menu on the latest deployment
8. Click **Redeploy**
9. Check **Use existing Build Cache**
10. Click **Redeploy**

---

## ✅ Verification Steps

### 1. Check Backend is Running

```bash
# Check pod status
kubectl -n connect-video-chat get pods
# Should show: backend-xxx  1/1  Running

# Check logs
kubectl -n connect-video-chat logs -f deployment/backend
# Should see:
# ✓ Database connected
# ✓ Stripe initialized
# ✓ WebSocket server listening on 0.0.0.0:3333
```

### 2. Check Frontend is Live

```bash
# Visit in browser
open https://app.paircam.live

# Should see:
# - "Get Premium" button (top right)
# - Gender selector
# - "Continue with Google" button
# - No console errors
```

### 3. Test Google Sign-In

1. Open https://app.paircam.live
2. Click **"Continue with Google"**
3. Select your Google account
4. Should redirect back and show your name/email
5. Check browser console - should see: "Signed in with Google"

### 4. Test Premium Upgrade

1. Click **"Get Premium"**
2. Select a plan (Weekly or Monthly)
3. Click **"Upgrade Now"**
4. Should redirect to Stripe Checkout
5. Use test card: `4242 4242 4242 4242`
6. Expiry: Any future date (e.g., `12/25`)
7. CVC: Any 3 digits (e.g., `123`)
8. Click **"Pay"**
9. Should redirect back to app
10. Gender filter should now be unlocked (no lock icon)

### 5. Test Gender Filtering

1. After upgrading, select **"Match with Females only"**
2. Click **"Start Chat"**
3. Should only match with users who selected "Female" as their gender
4. Open another browser (incognito)
5. Select gender as "Female"
6. Both should match together

---

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check logs
kubectl -n connect-video-chat logs deployment/backend

# Common issues:
# - "Unable to connect to database" → Check DATABASE_URL format
# - "Missing environment variable" → Check all secrets are added
# - "Port already in use" → Restart deployment
```

### Frontend Shows Errors

```bash
# Check browser console (F12)

# Common issues:
# - "VITE_SUPABASE_URL is not defined" → Add env vars in Vercel
# - "Failed to fetch" → Backend not running or wrong API_URL
# - "Google sign-in not configured" → Add GOOGLE_CLIENT_ID
```

### Google Sign-In Fails

1. Check authorized origins in Google Console
2. Check redirect URIs match exactly
3. Check Google provider is enabled in Supabase
4. Check GOOGLE_CLIENT_ID in Vercel matches Google Console

### Stripe Checkout Fails

1. Check you're in **Test mode** in Stripe
2. Check webhook endpoint is configured
3. Check STRIPE_SECRET_KEY is correct
4. Check Price IDs match the products you created

### Payment Succeeds but Premium Doesn't Unlock

1. Check webhook is receiving events:
   ```bash
   kubectl -n connect-video-chat logs deployment/backend | grep webhook
   ```
2. Check subscription was created:
   ```bash
   kubectl -n connect-video-chat logs deployment/backend | grep "Subscription created"
   ```
3. Try refreshing the page
4. Check `/api/users/me` endpoint returns `isPremium: true`

---

## 📊 Final Checklist

Before launching to users:

- [ ] Backend pod is Running
- [ ] Frontend loads without errors
- [ ] Google sign-in works
- [ ] Stripe checkout works
- [ ] Test payment succeeds
- [ ] Premium features unlock
- [ ] Gender filter works
- [ ] Two users can match
- [ ] Video chat works
- [ ] "Next" button works
- [ ] Report system works

---

## 🎉 Launch!

Once all checks pass:

1. **Test with real users** (friends/family)
2. **Monitor logs** for errors
3. **Switch Stripe to Live mode** when ready for real payments
4. **Update Stripe webhook** to use live keys
5. **Announce launch!** 🚀

---

## 📈 Post-Launch Monitoring

### Watch Backend Logs
```bash
kubectl -n connect-video-chat logs -f deployment/backend
```

### Watch Metrics
```bash
# Visit: https://api.paircam.live/metrics
# Check:
# - matchmaking_matches_total (should increase)
# - websocket_connections (current users)
# - http_requests_total (API calls)
```

### Check Stripe Dashboard
- Monitor successful payments
- Check for failed payments
- Watch subscription count grow

### Check Supabase Dashboard
- Monitor database connections
- Check query performance
- Watch storage usage

---

## 🆘 Need Help?

### Documentation
- `QUICK_START_GUIDE.md` - Full setup tutorial
- `FINAL_CHECKLIST.md` - Comprehensive launch guide
- `DESIGN_SYSTEM.md` - UI/UX guidelines
- `FRONTEND_INTEGRATION_STATUS.md` - Frontend details
- `WHATS_DEPLOYED_WHATS_MISSING.md` - Status overview

### Quick Commands
```bash
# Backend status
kubectl -n connect-video-chat get all

# Backend logs
kubectl -n connect-video-chat logs -f deployment/backend

# Restart backend
kubectl -n connect-video-chat rollout restart deployment/backend

# Check builds
gh run list --limit 5

# Check frontend
vercel ls
```

---

**Current Status**: ⏳ Builds deploying, waiting for credentials

**Next Action**: Follow Steps 1-6 above to add credentials

**Time to Launch**: ~30 minutes from now!

🚀 **You're almost there!**

