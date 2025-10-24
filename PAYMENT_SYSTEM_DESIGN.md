# 💳 Payment System Design - PairCam Premium

## Overview
Enable premium features for users who want gender-filtered matching (men seeking women only).

---

## Business Model

### Free Tier
- ✅ Random matching (any gender)
- ✅ Unlimited video/text chat
- ✅ Skip button
- ✅ Basic features

### Premium Tier - $9.99/month or $2.99/week
- ✨ **Gender Filter** (men → women only, women → men only)
- ⚡ Priority matching (skip queue)
- 🚫 Ad-free
- 🎥 HD video quality preference
- ↩️ Rewind last skip (1x per session)

---

## Technical Architecture

### 1. Database Schema (PostgreSQL via Supabase/Neon)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  gender VARCHAR(20), -- 'male', 'female', 'other', 'prefer_not_to_say'
  age INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50), -- 'active', 'canceled', 'past_due', 'trialing'
  plan VARCHAR(50), -- 'weekly', 'monthly'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment history
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount INTEGER, -- in cents
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50), -- 'succeeded', 'failed', 'pending'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_device_id ON users(device_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### 2. Backend Changes

#### New Modules

**`packages/backend/src/users/`**
- `user.entity.ts` - TypeORM entity
- `user.service.ts` - CRUD operations
- `user.controller.ts` - REST endpoints
- `dto/update-profile.dto.ts`

**`packages/backend/src/payments/`**
- `payment.service.ts` - Stripe integration
- `payment.controller.ts` - Checkout, webhooks
- `subscription.service.ts` - Subscription management
- `dto/create-checkout.dto.ts`

**`packages/backend/src/premium/`**
- `premium.guard.ts` - Check if user has active subscription
- `premium.decorator.ts` - `@RequirePremium()` decorator

#### Updated Files

**`packages/backend/src/auth/auth.service.ts`**
```typescript
export interface JwtPayload {
  sub: string;
  deviceId: string;
  userId?: string; // Add user ID
  isPremium?: boolean; // Cache premium status
  iat?: number;
  exp?: number;
}
```

**`packages/backend/src/signaling/matchmaking.service.ts`**
```typescript
export interface QueueUser {
  userId: string;
  deviceId: string;
  timestamp: number;
  region: string;
  language: string;
  gender?: string; // NEW
  genderPreference?: string; // NEW: 'any', 'male', 'female'
  isPremium: boolean; // NEW
  preferences: Record<string, unknown>;
  socketId: string;
}

// Updated matching logic
private areCompatible(user1: QueueUser, user2: QueueUser): boolean {
  // Existing checks...
  
  // Gender preference matching (premium only)
  if (user1.isPremium && user1.genderPreference && user1.genderPreference !== 'any') {
    if (user2.gender !== user1.genderPreference) {
      return false;
    }
  }
  
  if (user2.isPremium && user2.genderPreference && user2.genderPreference !== 'any') {
    if (user1.gender !== user2.genderPreference) {
      return false;
    }
  }
  
  return true;
}

// Priority queue for premium users
private findMatches(users: QueueUser[]): Array<{ user1: QueueUser; user2: QueueUser }> {
  const matches: Array<{ user1: QueueUser; user2: QueueUser }> = [];
  const used = new Set<string>();

  // Separate premium and free users
  const premiumUsers = users.filter(u => u.isPremium).sort((a, b) => a.timestamp - b.timestamp);
  const freeUsers = users.filter(u => !u.isPremium).sort((a, b) => a.timestamp - b.timestamp);
  
  // Match premium users first
  this.matchUserGroup(premiumUsers, matches, used);
  
  // Then match free users
  this.matchUserGroup(freeUsers, matches, used);
  
  // Cross-match if needed (premium with free)
  this.matchUserGroup([...premiumUsers, ...freeUsers], matches, used);
  
  return matches;
}
```

### 3. Frontend Changes

#### New Components

**`packages/frontend/src/components/PremiumModal.tsx`**
- Show premium features
- Pricing cards
- "Upgrade Now" CTA

**`packages/frontend/src/components/GenderSelector.tsx`**
- Gender selection (for profile)
- Gender preference (premium feature - locked for free users)

**`packages/frontend/src/components/PaymentCheckout.tsx`**
- Stripe Elements integration
- Weekly/Monthly toggle
- Payment form

**`packages/frontend/src/pages/AccountPage.tsx`**
- User profile
- Subscription status
- Cancel subscription
- Payment history

#### Updated Components

**`packages/frontend/src/components/LandingPage.tsx`**
- Add gender selection
- Add gender preference dropdown (with premium lock icon)
- Show "Premium Only" badge

**`packages/frontend/src/hooks/useAuth.ts`**
- Add user profile state
- Add `isPremium` flag
- Fetch user data on auth

**`packages/frontend/src/hooks/useSignaling.ts`**
- Pass gender + genderPreference to `join-queue`

### 4. Payment Flow

#### Stripe Integration

**Setup:**
1. Create Stripe account
2. Get API keys (test + production)
3. Create products:
   - Weekly Premium: $2.99
   - Monthly Premium: $9.99

**Checkout Flow:**
```
User clicks "Upgrade to Premium"
  ↓
Frontend: Create checkout session
  POST /api/payments/create-checkout
  Body: { plan: 'monthly' | 'weekly' }
  ↓
Backend: Stripe.checkout.sessions.create()
  Returns: { sessionId, url }
  ↓
Frontend: Redirect to Stripe Checkout
  window.location.href = url
  ↓
User completes payment
  ↓
Stripe webhook: checkout.session.completed
  ↓
Backend: Create/update subscription in DB
  ↓
User redirected back: /success?session_id=xxx
  ↓
Frontend: Refresh auth token (now includes isPremium: true)
```

**Webhook Events to Handle:**
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Renewal/changes
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Failed payment

### 5. Environment Variables

**Backend (.env)**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/paircam

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_WEEKLY=price_...
STRIPE_PRICE_ID_MONTHLY=price_...

# Frontend URL (for redirects)
FRONTEND_URL=https://app.paircam.live
```

**Frontend (.env)**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 6. Security Considerations

✅ **Server-side validation**: Always check premium status on backend
✅ **JWT includes premium flag**: Cached for performance, refreshed on subscription change
✅ **Webhook signature verification**: Validate Stripe webhooks
✅ **Rate limiting**: Prevent abuse of free tier
✅ **Gender verification**: Optional selfie verification for premium (future)

### 7. Analytics & Metrics

Track:
- Conversion rate (free → premium)
- Churn rate
- Average session length (free vs premium)
- Gender filter usage
- Revenue per user

### 8. Migration Path

**Phase 1: Database Setup** (Week 1)
- [ ] Set up PostgreSQL (Supabase/Neon)
- [ ] Create schema
- [ ] Add TypeORM to backend
- [ ] Migrate existing deviceIds to users table

**Phase 2: User Profiles** (Week 1)
- [ ] Create user module
- [ ] Add profile endpoints
- [ ] Update auth to include userId
- [ ] Add gender selection to frontend

**Phase 3: Payment Integration** (Week 2)
- [ ] Integrate Stripe SDK
- [ ] Create payment module
- [ ] Build checkout flow
- [ ] Set up webhooks
- [ ] Test with Stripe test cards

**Phase 4: Premium Features** (Week 2-3)
- [ ] Update matchmaking logic
- [ ] Add premium guard
- [ ] Build premium UI components
- [ ] Add gender filter
- [ ] Priority queue implementation

**Phase 5: Testing & Launch** (Week 3)
- [ ] End-to-end testing
- [ ] Load testing (premium vs free queue)
- [ ] Security audit
- [ ] Soft launch (50% traffic)
- [ ] Full launch

---

## Cost Estimate

### Stripe Fees
- 2.9% + $0.30 per transaction
- Example: $9.99 monthly → $0.59 fee = $9.40 net

### Database (Supabase Free Tier)
- 500MB storage
- 2GB bandwidth
- Upgrade to Pro ($25/mo) when needed

### Expected Revenue (Conservative)
- 1,000 daily active users
- 5% conversion rate = 50 premium users
- 50 × $9.99 = $499.50/month
- Minus Stripe fees (~$30) = **$469.50/month**

### Break-even
- Current costs: ~$50/month (DigitalOcean + Vercel + Redis)
- Need ~6 premium users to break even

---

## Alternative: One-Time Purchases

Instead of subscriptions, offer:
- **$4.99** - 100 gender-filtered matches
- **$9.99** - 300 matches
- **$19.99** - Unlimited for 30 days

Pros: Lower barrier to entry, no recurring billing
Cons: Less predictable revenue

---

## Recommendation

**Start with subscriptions** because:
1. Predictable recurring revenue
2. Higher lifetime value
3. Industry standard (Tinder, Bumble, etc.)
4. Easier to manage with Stripe

Offer **7-day free trial** to increase conversions.

---

## Next Steps

1. Choose database provider (Supabase recommended)
2. Set up Stripe account
3. Implement user profiles + gender selection
4. Build payment flow
5. Update matchmaking logic
6. Launch with beta testers

**Estimated Development Time**: 2-3 weeks
**Estimated Launch Date**: Mid-November 2025

