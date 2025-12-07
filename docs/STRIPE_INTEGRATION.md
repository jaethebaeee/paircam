# Stripe Payment Integration

## Overview

PairCam uses Stripe Checkout for subscription payments. This document covers the complete payment flow, testing instructions, and troubleshooting.

## Payment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PAYMENT FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User clicks "Upgrade to Premium"                                │
│         │                                                           │
│         ▼                                                           │
│  2. PremiumModal opens → Select plan (weekly/monthly)               │
│         │                                                           │
│         ▼                                                           │
│  3. POST /payments/create-checkout                                  │
│         │                                                           │
│         ▼                                                           │
│  4. Backend creates Stripe Checkout Session                         │
│         │                                                           │
│         ▼                                                           │
│  5. User redirected to Stripe Checkout (hosted)                     │
│         │                                                           │
│         ▼                                                           │
│  6. User completes payment on Stripe                                │
│         │                                                           │
│         ├─────────────────────────────────┐                        │
│         ▼                                 ▼                        │
│  7a. Success URL redirect            7b. Webhook fires             │
│      → /success?session_id=...           → checkout.session.completed
│         │                                 │                        │
│         ▼                                 ▼                        │
│  8a. SuccessPage verifies           8b. Backend creates            │
│      payment status                      subscription in DB         │
│         │                                                           │
│         ▼                                                           │
│  9. User sees confirmation + confetti                               │
│         │                                                           │
│         ▼                                                           │
│  10. Auto-redirect to home (10s) with premium status               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Environment Variables Required

```bash
# Backend (.env)
STRIPE_SECRET_KEY=sk_live_...        # Live or test key
STRIPE_WEBHOOK_SECRET=whsec_...      # From Stripe Dashboard
STRIPE_PRICE_ID_WEEKLY=price_...     # Weekly plan price ID
STRIPE_PRICE_ID_MONTHLY=price_...    # Monthly plan price ID
FRONTEND_URL=https://paircam.live    # For redirect URLs
```

## API Endpoints

### POST /payments/create-checkout
Creates a Stripe Checkout session.

**Auth:** Required (JWT)

**Request:**
```json
{
  "plan": "weekly" | "monthly"
}
```

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST /payments/webhook
Handles Stripe webhook events.

**Auth:** None (signature verification)

**Events Handled:**
- `checkout.session.completed` - Creates subscription
- `customer.subscription.updated` - Updates status
- `customer.subscription.deleted` - Cancels subscription
- `invoice.payment_succeeded` - Logs success
- `invoice.payment_failed` - Logs failure

### GET /payments/verify
Verifies a checkout session.

**Auth:** Required (JWT)

**Query:** `session_id=cs_...`

**Response:**
```json
{
  "success": true,
  "isPremium": true,
  "subscription": {
    "plan": "monthly",
    "status": "active",
    "currentPeriodEnd": "2024-01-15T00:00:00Z"
  }
}
```

### POST /payments/cancel-subscription
Cancels subscription at period end.

**Auth:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "message": "Subscription will cancel at period end",
  "endsAt": "2024-01-15T00:00:00Z"
}
```

### GET /subscriptions/status
Gets premium status and subscription details.

**Auth:** Required (JWT)

**Response:**
```json
{
  "isPremium": true,
  "userId": "uuid",
  "subscription": {
    "plan": "monthly",
    "status": "active",
    "currentPeriodEnd": "2024-01-15T00:00:00Z",
    "cancelAtPeriodEnd": false
  }
}
```

## Testing Locally

### 1. Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.io/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.io/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe
```

### 2. Start Webhook Forwarding
```bash
stripe listen --forward-to localhost:3333/payments/webhook
```

This will output a webhook signing secret (whsec_...). Use this for local testing.

### 3. Test Cards
Use these test card numbers:

| Card | Number | Behavior |
|------|--------|----------|
| Success | 4242 4242 4242 4242 | Payment succeeds |
| Decline | 4000 0000 0000 0002 | Card declined |
| Auth Required | 4000 0025 0000 3155 | 3D Secure |
| Insufficient | 4000 0000 0000 9995 | Insufficient funds |

### 4. Test Flow
1. Start backend: `npm run dev`
2. Start frontend: `npm run dev`
3. Start Stripe CLI: `stripe listen --forward-to localhost:3333/payments/webhook`
4. Open app, click "Get Premium"
5. Select plan, click "Upgrade Now"
6. Complete payment with test card
7. Verify redirect to /success
8. Verify subscription in database

## Webhook Configuration (Production)

### Stripe Dashboard Setup
1. Go to Developers → Webhooks
2. Add endpoint: `https://api.paircam.live/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy signing secret to env vars

### Verify Webhook Security
The webhook handler:
1. Receives raw body (not parsed JSON)
2. Verifies signature using `stripe.webhooks.constructEvent()`
3. Rejects invalid signatures with 400 error

## Troubleshooting

### "Invalid webhook signature"
- Ensure raw body middleware is configured
- Check webhook secret matches Stripe Dashboard
- For local testing, use Stripe CLI webhook secret

### "Payment system not configured"
- Check STRIPE_SECRET_KEY is set
- Verify key starts with `sk_test_` (test) or `sk_live_` (production)

### "Price ID not configured"
- Set STRIPE_PRICE_ID_WEEKLY and STRIPE_PRICE_ID_MONTHLY
- Create prices in Stripe Dashboard under Products

### Webhook not firing
- Check Stripe Dashboard → Developers → Webhooks → Logs
- Verify endpoint URL is correct
- Ensure server is accessible from internet

## File Structure

```
packages/
├── backend/src/
│   ├── main.ts                          # Raw body middleware
│   ├── payments/
│   │   ├── payments.controller.ts       # API routes
│   │   ├── payments.service.ts          # Stripe logic
│   │   ├── payments.module.ts           # DI module
│   │   ├── dto/create-checkout.dto.ts   # Validation
│   │   └── entities/payment.entity.ts   # DB entity
│   └── subscriptions/
│       ├── subscriptions.controller.ts  # Status endpoint
│       ├── subscriptions.service.ts     # DB queries
│       └── entities/subscription.entity.ts
│
└── frontend/src/
    ├── components/
    │   ├── PremiumModal.tsx             # Upgrade UI
    │   ├── SuccessPage.tsx              # Post-payment
    │   └── SubscriptionManager.tsx      # View/cancel
    └── App.tsx                          # Routes
```

## Pricing Configuration

Current pricing (configurable in Stripe):
- Weekly: $2.99/week
- Monthly: $9.99/month (25% savings)

Premium features:
- Gender filter
- Priority matching
- Ad-free experience
- Unlimited matches
- Rewind skip

## Security Checklist

- [x] Webhook signature verification
- [x] Raw body middleware for webhooks
- [x] JWT authentication on payment endpoints
- [x] User ownership verification on sessions
- [x] HTTPS only in production
- [ ] Rate limiting on checkout endpoint (recommended)
- [ ] Webhook idempotency (recommended)
