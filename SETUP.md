# PairCam Production Setup Guide

This guide will help you set up all the infrastructure needed for PairCam in production.

**Total Setup Time: ~30 minutes**
**Total Monthly Cost: $0** (until you process payments)

---

## Table of Contents

1. [Database Setup (Supabase/Neon)](#1-database-setup)
2. [Google OAuth Setup](#2-google-oauth-setup)
3. [Stripe Setup](#3-stripe-setup)
4. [Redis Setup (Upstash)](#4-redis-setup)
5. [TURN Server Setup](#5-turn-server-setup)
6. [Environment Variables](#6-environment-variables)
7. [Deployment](#7-deployment)

---

## 1. Database Setup

### Option A: Supabase (Recommended)

**Free Tier:** 500MB database, 2 GB bandwidth

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Choose a name and **strong database password** (save this!)
4. Select region closest to your users
5. Wait for project to initialize (~2 minutes)

**Get Connection String:**
1. Go to Project Settings → Database
2. Copy the "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password

```bash
# Example
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### Option B: Neon

**Free Tier:** 512MB storage, 1 compute hour/day

1. Go to [neon.tech](https://neon.tech) and create account
2. Create new project
3. Copy connection string from dashboard

**Reference:** [NestJS TypeORM + Supabase](https://github.com/andriishupta/nestjs-supabase-setup)

---

## 2. Google OAuth Setup

**Cost:** FREE (unlimited users)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name: `paircam` (or your app name)
4. Click "Create"

### Step 2: Enable APIs

1. Go to "APIs & Services" → "Enable APIs and Services"
2. Search for "Google+ API" and enable it
3. Search for "Google Identity" and enable it

### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" → Create
3. Fill in:
   - App name: `PairCam`
   - User support email: your email
   - Developer contact: your email
4. Click "Save and Continue"
5. Scopes: Add `email` and `profile` → Save
6. Test users: Add your email for testing → Save

### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: `PairCam Web`
5. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   https://paircam.live
   https://www.paircam.live
   ```
6. **Authorized redirect URIs:**
   ```
   http://localhost:5173
   https://paircam.live
   ```
7. Click "Create"
8. **Copy Client ID and Client Secret**

```bash
# Backend
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx

# Frontend (same Client ID)
VITE_GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
```

**Reference:** [NestJS Google OAuth Example](https://github.com/iMichaelOwolabi/google-oauth-nestjs)

---

## 3. Stripe Setup

**Cost:** 2.9% + 30¢ per successful transaction (no monthly fee)

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete account verification

### Step 2: Get API Keys

1. Go to Developers → API keys
2. Copy **Publishable key** (starts with `pk_`)
3. Copy **Secret key** (starts with `sk_`)

```bash
# Backend
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx

# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxx
```

### Step 3: Create Products & Prices

1. Go to Products → Add Product
2. Create "Premium Weekly":
   - Name: `Premium Weekly`
   - Price: $2.99 / week (recurring)
   - Copy the Price ID (starts with `price_`)

3. Create "Premium Monthly":
   - Name: `Premium Monthly`
   - Price: $9.99 / month (recurring)
   - Copy the Price ID

```bash
STRIPE_PRICE_ID_WEEKLY=price_xxxxxxxxxxxxxxxx
STRIPE_PRICE_ID_MONTHLY=price_yyyyyyyyyyyyyyyy
```

### Step 4: Setup Webhook

1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://api.yourdomain.com/payments/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
```

**Reference:** [NestJS Stripe Subscriptions](https://github.com/reyco1/nestjs-stripe)

---

## 4. Redis Setup

### Option A: Upstash (Recommended)

**Free Tier:** 10,000 commands/day

1. Go to [upstash.com](https://upstash.com)
2. Create account → Create database
3. Select region closest to your backend
4. Copy the Redis URL

```bash
REDIS_URL=rediss://default:xxxxx@us1-xxxxx.upstash.io:6379
```

### Option B: Railway

**Free Tier:** $5 credit/month

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy Redis
3. Copy connection URL from Variables tab

**Reference:** [Redis Pub/Sub for horizontal scaling](https://github.com/your-repo) (already implemented in codebase)

---

## 5. TURN Server Setup

TURN servers relay video when direct P2P connection fails (corporate firewalls, etc.)

### Option A: Metered.ca (Recommended)

**Free Tier:** 500MB/month

1. Go to [metered.ca](https://www.metered.ca/stun-turn)
2. Sign up and create a TURN credential
3. Copy credentials

```bash
TURN_PROVIDER=managed
TURN_URLS=turn:a.relay.metered.ca:80,turn:a.relay.metered.ca:443,turns:a.relay.metered.ca:443
TURN_USERNAME=your-username
TURN_PASSWORD=your-password
```

### Option B: Twilio

**Free Tier:** $15 credit

1. Go to [twilio.com](https://www.twilio.com/docs/stun-turn)
2. Get Network Traversal credentials
3. Use their STUN/TURN servers

---

## 6. Environment Variables

### Backend (`packages/backend/.env`)

```bash
# Node Environment
NODE_ENV=production
PORT=3333

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRATION=7d

# Database
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres

# Redis
REDIS_URL=rediss://default:xxxxx@us1-xxxxx.upstash.io:6379

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
STRIPE_PRICE_ID_WEEKLY=price_xxxx
STRIPE_PRICE_ID_MONTHLY=price_xxxx

# Google OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# Frontend URL (for redirects)
FRONTEND_URL=https://paircam.live

# TURN Server
TURN_PROVIDER=managed
TURN_URLS=turn:a.relay.metered.ca:80
TURN_USERNAME=xxxx
TURN_PASSWORD=xxxx

# CORS
CORS_ORIGINS=https://paircam.live,https://www.paircam.live
```

### Frontend (`packages/frontend/.env`)

```bash
# API
VITE_API_URL=https://api.paircam.live
VITE_WS_URL=wss://api.paircam.live

# Google OAuth (same Client ID as backend)
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
```

---

## 7. Deployment

### Run Database Migrations

```bash
cd packages/backend
npm run typeorm migration:run
```

### Build & Deploy

```bash
# Backend
cd packages/backend
npm run build
npm start

# Frontend
cd packages/frontend
npm run build
# Deploy dist/ folder to Vercel/Netlify/Cloudflare Pages
```

### Recommended Hosting

| Service | Use For | Cost |
|---------|---------|------|
| **Vercel** | Frontend | Free |
| **Railway** | Backend + Redis | $5/month |
| **Fly.io** | Backend | Free tier |
| **Supabase** | Database | Free |

---

## Open Source References

These repos were used as reference for implementation:

### Authentication
- [NestJS Google OAuth Example](https://github.com/iMichaelOwolabi/google-oauth-nestjs)
- [NestJS Social Login](https://github.com/m-haecker/nestjs-social-login)
- [NestJS Supabase Auth](https://github.com/nawespel/nestjs-supabase-auth)

### Payments
- [NestJS Stripe Module](https://github.com/dhaspden/nestjs-stripe)
- [NestJS Stripe Subscriptions](https://github.com/reyco1/nestjs-stripe)
- [Stripe Checkout Example](https://github.com/audiBookning/sample-nestjs-stripe)

### Database
- [NestJS Supabase Setup](https://github.com/andriishupta/nestjs-supabase-setup)
- [NestJS TypeORM Docs](https://docs.nestjs.com/techniques/database)

---

## Troubleshooting

### Google Sign-In Not Working

1. Check that `VITE_GOOGLE_CLIENT_ID` matches backend `GOOGLE_CLIENT_ID`
2. Verify authorized origins include your domain
3. Check browser console for errors

### Stripe Webhook Failing

1. Verify webhook endpoint is accessible
2. Check `STRIPE_WEBHOOK_SECRET` is correct
3. Test with Stripe CLI: `stripe listen --forward-to localhost:3333/payments/webhook`

### Database Connection Failed

1. Check `DATABASE_URL` format is correct
2. Verify password doesn't have special characters (URL encode if needed)
3. Check Supabase/Neon dashboard for connection limits

---

## Security Checklist

- [ ] `JWT_SECRET` is at least 32 characters and randomly generated
- [ ] All secrets are in environment variables, not code
- [ ] CORS_ORIGINS only includes your domains
- [ ] Database password is strong and unique
- [ ] Stripe webhook secret is configured
- [ ] HTTPS is enabled for all production URLs
