# 🚀 Quick Start Guide - Implement Premium Today

## TL;DR - What You Need to Do

1. **Set up Supabase** (15 min) - Database for users & subscriptions
2. **Add Google Sign-In** (30 min) - Easy authentication
3. **Integrate Stripe** (1 hour) - Payment processing
4. **Update Matchmaking** (1 hour) - Gender filter logic
5. **Build Premium UI** (2 hours) - Beautiful upgrade flow

**Total time: ~5 hours to MVP** ✨

---

## Step 1: Set Up Supabase (15 minutes)

### 1.1 Create Account
1. Go to https://supabase.com
2. Sign up with GitHub
3. Create new project: "paircam-prod"
4. Choose region closest to your users (US East recommended)
5. Set strong password (save it!)

### 1.2 Run SQL Schema
1. In Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy the entire SQL schema from `DETAILED_IMPLEMENTATION_PLAN.md` (section 1)
4. Click "Run"
5. ✅ You now have all tables!

### 1.3 Get Connection String
1. Go to "Settings" → "Database"
2. Copy "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your actual password
4. Save this for later

### 1.4 Enable Google Auth in Supabase
1. Go to "Authentication" → "Providers"
2. Enable "Google"
3. You'll add credentials after Step 2

---

## Step 2: Add Google Sign-In (30 minutes)

### 2.1 Create Google OAuth App
1. Go to https://console.cloud.google.com
2. Create new project: "PairCam"
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized JavaScript origins:
   - `https://app.paircam.live`
   - `http://localhost:5173` (for development)
7. Authorized redirect URIs:
   - `https://app.paircam.live/auth/callback`
   - `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
8. Save Client ID and Client Secret

### 2.2 Configure Supabase
1. Back in Supabase: "Authentication" → "Providers" → "Google"
2. Paste Client ID and Client Secret
3. Save

### 2.3 Install Frontend Dependencies
```bash
cd /tmp/omegle-clone/packages/frontend
npm install @supabase/supabase-js @react-oauth/google
```

### 2.4 Create Supabase Client
**File: `packages/frontend/src/lib/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2.5 Add Environment Variables
**File: `packages/frontend/.env`**
```bash
VITE_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Get these from:
- Supabase URL: Settings → API → Project URL
- Anon Key: Settings → API → anon/public key

### 2.6 Create Google Sign-In Component
**File: `packages/frontend/src/components/GoogleSignIn.tsx`**
```typescript
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { supabase } from '../lib/supabase';

export default function GoogleSignInButton() {
  const handleSuccess = async (credentialResponse: any) => {
    try {
      // Sign in with Google token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });

      if (error) throw error;

      console.log('Signed in:', data.user);
      
      // Refresh your app state
      window.location.reload();
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Failed to sign in with Google');
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.log('Login Failed')}
        theme="filled_blue"
        size="large"
        text="continue_with"
        shape="rectangular"
      />
    </GoogleOAuthProvider>
  );
}
```

### 2.7 Update Landing Page
**File: `packages/frontend/src/components/LandingPage.tsx`**

Add after the name input:
```tsx
import GoogleSignInButton from './GoogleSignIn';

// Inside the form, add:
<div className="space-y-4">
  {/* Existing name input */}
  
  {/* NEW: Google Sign-In */}
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-200"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-4 bg-white text-gray-500">Or continue with</span>
    </div>
  </div>
  
  <GoogleSignInButton />
  
  <p className="text-xs text-gray-500 text-center">
    Sign in to save your profile and access premium features
  </p>
</div>
```

---

## Step 3: Integrate Stripe (1 hour)

### 3.1 Create Stripe Account
1. Go to https://stripe.com
2. Sign up
3. Activate account (fill in business details)
4. Stay in "Test mode" for now

### 3.2 Create Products
1. In Stripe dashboard: "Products" → "Add product"
2. Create two products:

**Product 1: Weekly Premium**
- Name: "PairCam Premium - Weekly"
- Price: $2.99 USD
- Billing period: Weekly
- Copy the Price ID (starts with `price_`)

**Product 2: Monthly Premium**
- Name: "PairCam Premium - Monthly"
- Price: $9.99 USD
- Billing period: Monthly
- Copy the Price ID

### 3.3 Get API Keys
1. "Developers" → "API keys"
2. Copy:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)

### 3.4 Install Backend Dependencies
```bash
cd /tmp/omegle-clone/packages/backend
npm install stripe @nestjs/typeorm typeorm pg
```

### 3.5 Update Backend Environment
**File: `packages/backend/.env`**
```bash
# Add these:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # Get this after setting up webhook
STRIPE_PRICE_ID_WEEKLY=price_...
STRIPE_PRICE_ID_MONTHLY=price_...
FRONTEND_URL=https://app.paircam.live
```

### 3.6 Update env.ts
**File: `packages/backend/src/env.ts`**

Add to the env object:
```typescript
export const env = {
  // ... existing vars
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_PRICE_ID_WEEKLY: process.env.STRIPE_PRICE_ID_WEEKLY || '',
  STRIPE_PRICE_ID_MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};
```

### 3.7 Create Payment Module
Use the code from `IMPLEMENTATION_ROADMAP.md` Phase 3 to create:
- `packages/backend/src/payments/payments.service.ts`
- `packages/backend/src/payments/payments.controller.ts`
- `packages/backend/src/payments/payments.module.ts`

### 3.8 Set Up Stripe Webhook
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your local backend
stripe listen --forward-to localhost:3333/payments/webhook

# Copy the webhook signing secret (whsec_...) to .env
```

For production:
1. In Stripe dashboard: "Developers" → "Webhooks"
2. Add endpoint: `https://api.paircam.live/payments/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to production .env

---

## Step 4: Build Premium UI (2 hours)

### 4.1 Create Premium Modal
**File: `packages/frontend/src/components/PremiumModal.tsx`**

Use the complete code from `IMPLEMENTATION_ROADMAP.md` Phase 4.

### 4.2 Add Premium Button to Landing Page
**File: `packages/frontend/src/components/LandingPage.tsx`**

Add near the top:
```tsx
import { useState } from 'react';
import PremiumModal from './PremiumModal';

export default function LandingPage({ onStartCall }: LandingPageProps) {
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      {/* Add Premium Badge in top-right */}
      <button
        onClick={() => setShowPremiumModal(true)}
        className="fixed top-24 right-4 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        ⭐ Get Premium
      </button>
      
      {/* Rest of your landing page */}
      
      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  );
}
```

### 4.3 Add Gender Filter UI
**File: `packages/frontend/src/components/GenderFilter.tsx`**
```tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface GenderFilterProps {
  onPreferenceChange: (preference: string) => void;
}

export default function GenderFilter({ onPreferenceChange }: GenderFilterProps) {
  const [isPremium, setIsPremium] = useState(false);
  const [genderPreference, setGenderPreference] = useState('any');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has active subscription
    const { data } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    setIsPremium(!!data && new Date(data.current_period_end) > new Date());
  };

  const handlePreferenceChange = (preference: string) => {
    if (!isPremium && preference !== 'any') {
      setShowUpgradePrompt(true);
      return;
    }
    
    setGenderPreference(preference);
    onPreferenceChange(preference);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900">
        Who would you like to meet?
        {!isPremium && (
          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            Premium
          </span>
        )}
      </label>
      
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handlePreferenceChange('any')}
          className={`p-3 rounded-xl border-2 transition-all ${
            genderPreference === 'any'
              ? 'border-pink-500 bg-pink-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">🌍</div>
          <div className="text-sm font-medium">Anyone</div>
        </button>
        
        <button
          onClick={() => handlePreferenceChange('female')}
          className={`p-3 rounded-xl border-2 transition-all relative ${
            genderPreference === 'female'
              ? 'border-pink-500 bg-pink-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {!isPremium && (
            <div className="absolute top-1 right-1 text-xs">🔒</div>
          )}
          <div className="text-2xl mb-1">👩</div>
          <div className="text-sm font-medium">Women</div>
        </button>
        
        <button
          onClick={() => handlePreferenceChange('male')}
          className={`p-3 rounded-xl border-2 transition-all relative ${
            genderPreference === 'male'
              ? 'border-pink-500 bg-pink-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {!isPremium && (
            <div className="absolute top-1 right-1 text-xs">🔒</div>
          )}
          <div className="text-2xl mb-1">👨</div>
          <div className="text-sm font-medium">Men</div>
        </button>
      </div>
      
      {showUpgradePrompt && (
        <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⭐</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-1">
                Premium Feature
              </p>
              <p className="text-sm text-gray-600 mb-3">
                Gender filters are available with Premium. Match with your preferred gender only!
              </p>
              <button
                onClick={() => {/* Open premium modal */}}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:shadow-lg transition-all"
              >
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.4 Add to Landing Page
```tsx
import GenderFilter from './GenderFilter';

// Inside your form, after age input:
<GenderFilter onPreferenceChange={(pref) => {
  // Store preference for when user starts matching
  setGenderPreference(pref);
}} />
```

---

## Step 5: Update Matchmaking Logic (1 hour)

### 5.1 Update QueueUser Interface
**File: `packages/backend/src/signaling/matchmaking.service.ts`**

```typescript
export interface QueueUser {
  userId: string;
  deviceId: string;
  timestamp: number;
  region: string;
  language: string;
  socketId: string;
  
  // NEW: Premium features
  gender?: string;
  age?: number;
  isPremium: boolean;
  genderPreference?: string; // 'any', 'male', 'female'
  preferences: Record<string, unknown>;
}
```

### 5.2 Update areCompatible Method
```typescript
private areCompatible(user1: QueueUser, user2: QueueUser): boolean {
  // Existing checks
  if (user1.region !== 'global' && user2.region !== 'global' && user1.region !== user2.region) {
    return false;
  }
  if (user1.language !== user2.language) {
    return false;
  }

  // NEW: Gender preference check (premium only)
  if (user1.isPremium && user1.genderPreference && user1.genderPreference !== 'any') {
    if (!user2.gender || user2.gender !== user1.genderPreference) {
      return false; // User1 wants specific gender, user2 doesn't match
    }
  }
  
  if (user2.isPremium && user2.genderPreference && user2.genderPreference !== 'any') {
    if (!user1.gender || user1.gender !== user2.genderPreference) {
      return false; // User2 wants specific gender, user1 doesn't match
    }
  }

  return true;
}
```

### 5.3 Update findMatches to Prioritize Premium
```typescript
private findMatches(users: QueueUser[]): Array<{ user1: QueueUser; user2: QueueUser }> {
  const matches: Array<{ user1: QueueUser; user2: QueueUser }> = [];
  const used = new Set<string>();

  // Separate premium and free users
  const premiumUsers = users.filter(u => u.isPremium).sort((a, b) => a.timestamp - b.timestamp);
  const freeUsers = users.filter(u => !u.isPremium).sort((a, b) => a.timestamp - b.timestamp);

  // Match premium users first (they get priority)
  for (const premiumUser of premiumUsers) {
    if (used.has(premiumUser.userId)) continue;

    // Try to find match in all users
    for (const candidate of [...premiumUsers, ...freeUsers]) {
      if (used.has(candidate.userId) || candidate.userId === premiumUser.userId) continue;

      if (this.areCompatible(premiumUser, candidate)) {
        matches.push({ user1: premiumUser, user2: candidate });
        used.add(premiumUser.userId);
        used.add(candidate.userId);
        break;
      }
    }
  }

  // Then match remaining free users
  for (let i = 0; i < freeUsers.length - 1; i++) {
    if (used.has(freeUsers[i].userId)) continue;

    for (let j = i + 1; j < freeUsers.length; j++) {
      if (used.has(freeUsers[j].userId)) continue;

      if (this.areCompatible(freeUsers[i], freeUsers[j])) {
        matches.push({ user1: freeUsers[i], user2: freeUsers[j] });
        used.add(freeUsers[i].userId);
        used.add(freeUsers[j].userId);
        break;
      }
    }
  }

  return matches;
}
```

### 5.4 Update SignalingGateway to Pass Premium Status
**File: `packages/backend/src/signaling/signaling.gateway.ts`**

In the `handleJoinQueue` method:
```typescript
@SubscribeMessage('join-queue')
async handleJoinQueue(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { region?: string; language?: string; gender?: string; genderPreference?: string },
): Promise<void> {
  const deviceId = client.data.deviceId;
  
  // NEW: Check if user is premium
  const user = await this.usersService.findByDeviceId(deviceId);
  const isPremium = user ? await this.usersService.isPremium(user.id) : false;

  await this.matchmakingService.addToQueue(deviceId, {
    region: data.region,
    language: data.language,
    socketId: client.id,
    gender: data.gender,
    genderPreference: data.genderPreference,
    isPremium, // NEW
    preferences: {},
  });

  client.emit('queue-joined', {
    position: await this.matchmakingService.getQueuePosition(deviceId),
    timestamp: Date.now(),
    isPremium, // Let frontend know
  });
}
```

---

## Step 6: Test Everything (30 minutes)

### 6.1 Test Stripe Checkout
Use test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### 6.2 Test Flow
1. ✅ Sign in with Google
2. ✅ Set gender in profile
3. ✅ Try to use gender filter → see "Premium" lock
4. ✅ Click "Upgrade to Premium"
5. ✅ Complete Stripe checkout
6. ✅ Webhook processes subscription
7. ✅ Return to app → now premium
8. ✅ Gender filter now works
9. ✅ Match with someone of preferred gender

---

## Step 7: Deploy to Production

### 7.1 Update Production Environment Variables

**Vercel (Frontend):**
```bash
VITE_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... # Switch to live key
VITE_API_URL=https://api.paircam.live
VITE_WS_URL=wss://api.paircam.live
```

**DigitalOcean (Backend):**
Update Kubernetes secrets with:
- `DATABASE_URL` (production Supabase)
- `STRIPE_SECRET_KEY` (live key)
- `STRIPE_WEBHOOK_SECRET` (production webhook)
- `STRIPE_PRICE_ID_WEEKLY` (live price)
- `STRIPE_PRICE_ID_MONTHLY` (live price)

### 7.2 Switch Stripe to Live Mode
1. In Stripe dashboard, toggle from "Test mode" to "Live mode"
2. Update all environment variables with live keys
3. Re-create webhook for production URL

### 7.3 Deploy
```bash
# Frontend (Vercel)
cd packages/frontend
vercel --prod

# Backend (already deployed, just update secrets)
kubectl -n connect-video-chat set env deployment/backend \
  DATABASE_URL="..." \
  STRIPE_SECRET_KEY="..." \
  # ... etc
```

---

## 🎉 You're Done!

Your app now has:
- ✅ Google Sign-In
- ✅ User profiles with gender
- ✅ Premium subscriptions via Stripe
- ✅ Gender-filtered matching
- ✅ Priority queue for premium users

**Next steps:**
- Add analytics to track conversions
- Send email notifications for subscriptions
- Add more premium features (HD video, rewind, etc.)
- Market your app! 🚀

---

## Troubleshooting

### Stripe webhook not working
```bash
# Check webhook logs in Stripe dashboard
# Make sure endpoint URL is correct
# Verify webhook secret matches .env
```

### Gender filter not working
```bash
# Check if user is actually premium:
SELECT * FROM subscriptions WHERE user_id = '...';

# Check matchmaking logs:
# Should see isPremium: true in queue data
```

### Google Sign-In fails
```bash
# Verify redirect URIs in Google Console
# Check CORS settings in Supabase
# Make sure client ID is correct
```

---

## Support

If you get stuck:
1. Check Stripe dashboard for payment errors
2. Check Supabase logs for database errors
3. Check browser console for frontend errors
4. Check backend logs: `kubectl logs -n connect-video-chat deployment/backend`

Good luck! 🚀

