# 🔌 Frontend Integration Status

## ✅ What's Done

### Components Created ✅
- ✅ `GoogleSignIn.tsx` - Google OAuth button (functional)
- ✅ `PremiumModal.tsx` - Stripe checkout modal (functional)
- ✅ `GenderFilter.tsx` - Gender preference selector (functional)
- ✅ `supabase.ts` - Supabase client setup

### Dependencies Installed ✅
- ✅ `@react-oauth/google` (v0.12.2)
- ✅ `@supabase/supabase-js` (v2.76.1)

### Components Imported in LandingPage ✅
- ✅ All three components imported
- ✅ Premium button renders
- ✅ Gender filter renders
- ✅ Google sign-in button renders

---

## ❌ What's MISSING

### 1. No Auth Context/Provider ❌
**Problem**: Components exist but there's no global auth state management.

**What's needed**:
- Auth context provider wrapping the app
- Track Supabase auth state globally
- Expose `user`, `isPremium`, `isAuthenticated` to all components

### 2. Premium Status Not Checked ❌
**Problem**: `isPremium` is hardcoded to `false` in LandingPage.

```typescript
// Current (BAD):
const [isPremium] = useState(false); // TODO: Get from auth context
```

**What's needed**:
- API call to backend: `GET /api/users/me` to get user profile
- Check if user has active subscription
- Update UI based on premium status

### 3. Google Sign-In Not Integrated with Backend ❌
**Problem**: Google sign-in uses Supabase, but our backend doesn't know about it.

**What's needed**:
- After Google sign-in, send Supabase user ID to backend
- Backend creates/updates user record
- Backend returns JWT token for WebSocket auth

### 4. Stripe Checkout Success Not Handled ❌
**Problem**: After Stripe payment, user returns to site but premium status doesn't update.

**What's needed**:
- Success page/callback route (e.g., `/success?session_id=...`)
- Verify payment with backend
- Update auth context with new premium status
- Show success message

### 5. No Environment Variables in Frontend ❌
**Problem**: Components reference env vars that don't exist yet.

**What's needed**:
- Create `.env` file in `packages/frontend/`
- Add all required variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `VITE_API_URL`

---

## 🔧 Required Fixes

### Fix 1: Create Auth Context Provider

**File**: `packages/frontend/src/contexts/AuthContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isPremium: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPremiumStatus = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = import.meta.env.VITE_API_URL;
      
      const response = await fetch(`${apiUrl}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsPremium(data.isPremium || false);
      }
    } catch (error) {
      console.error('Failed to check premium status:', error);
    }
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user) {
        refreshPremiumStatus();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refreshPremiumStatus();
      } else {
        setIsPremium(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsPremium(false);
  };

  return (
    <AuthContext.Provider value={{ user, isPremium, isLoading, signOut, refreshPremiumStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
```

### Fix 2: Wrap App with AuthProvider

**File**: `packages/frontend/src/main.tsx`

```typescript
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
```

### Fix 3: Update LandingPage to Use Auth Context

**File**: `packages/frontend/src/components/LandingPage.tsx`

```typescript
import { useAuthContext } from '../contexts/AuthContext';

export default function LandingPage({ onStartCall }: LandingPageProps) {
  const { isPremium, user } = useAuthContext(); // ← Use real auth state
  
  // Remove: const [isPremium] = useState(false);
  
  // ... rest of component
}
```

### Fix 4: Update GoogleSignIn Success Handler

**File**: `packages/frontend/src/components/GoogleSignIn.tsx`

```typescript
const handleSuccess = async (credentialResponse: any) => {
  try {
    // Sign in with Google token via Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credentialResponse.credential,
    });

    if (error) throw error;

    // Send to backend to create/update user
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('accessToken');
    
    await fetch(`${apiUrl}/api/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        supabaseUserId: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
      }),
    });

    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    if (onError) onError();
  }
};
```

### Fix 5: Add Success Route Handler

**File**: `packages/frontend/src/pages/Success.tsx` (NEW)

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';

export default function Success() {
  const navigate = useNavigate();
  const { refreshPremiumStatus } = useAuthContext();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      if (!sessionId) {
        navigate('/');
        return;
      }

      try {
        // Verify with backend
        const token = localStorage.getItem('accessToken');
        const apiUrl = import.meta.env.VITE_API_URL;
        
        const response = await fetch(`${apiUrl}/api/payments/verify?session_id=${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Refresh premium status
          await refreshPremiumStatus();
          setLoading(false);
          
          // Redirect to home after 3 seconds
          setTimeout(() => navigate('/'), 3000);
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        navigate('/');
      }
    };

    verifyPayment();
  }, [navigate, refreshPremiumStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="text-center p-8 bg-white rounded-3xl shadow-xl max-w-md">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Premium!</h1>
        <p className="text-gray-600 mb-6">
          Your payment was successful. You now have access to all premium features!
        </p>
        <div className="space-y-2 text-left bg-gradient-to-br from-pink-50 to-purple-50 p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Gender Filter Unlocked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Priority Matching</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Ad-Free Experience</span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-6">Redirecting you back...</p>
      </div>
    </div>
  );
}
```

### Fix 6: Create Environment Variables File

**File**: `packages/frontend/.env`

```bash
# API URLs
VITE_API_URL=https://api.paircam.live
VITE_WS_URL=wss://api.paircam.live

# Supabase (get from https://supabase.com/dashboard)
VITE_SUPABASE_URL=https://[YOUR_PROJECT].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (get from https://console.cloud.google.com)
VITE_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com

# Stripe (get from https://dashboard.stripe.com)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🎯 Implementation Priority

### Phase 1: Auth Context (30 minutes)
1. Create `AuthContext.tsx`
2. Wrap app in `main.tsx`
3. Update `LandingPage.tsx` to use context
4. Test: Premium status should be dynamic

### Phase 2: Backend Sync (20 minutes)
1. Update `GoogleSignIn.tsx` success handler
2. Create backend endpoint: `POST /api/users/sync`
3. Create backend endpoint: `GET /api/users/me`
4. Test: Google sign-in should create user in backend

### Phase 3: Payment Success Flow (20 minutes)
1. Create `Success.tsx` page
2. Add route in router
3. Update `PremiumModal.tsx` to redirect to success page
4. Create backend endpoint: `GET /api/payments/verify`
5. Test: Payment should unlock premium features

### Phase 4: Environment Setup (10 minutes)
1. Create `.env` file
2. Add all credentials
3. Test: All API calls should work

---

## 📋 Backend Endpoints Still Needed

### 1. `GET /api/users/me`
Returns current user profile including premium status.

```typescript
// Response:
{
  id: string;
  deviceId: string;
  email?: string;
  name?: string;
  gender?: string;
  isPremium: boolean;
  subscription?: {
    plan: 'weekly' | 'monthly';
    status: string;
    currentPeriodEnd: string;
  };
}
```

### 2. `POST /api/users/sync`
Syncs Supabase user with backend user.

```typescript
// Request:
{
  supabaseUserId: string;
  email: string;
  name?: string;
}

// Response:
{
  success: boolean;
  user: { ... };
}
```

### 3. `GET /api/payments/verify`
Verifies Stripe checkout session and activates subscription.

```typescript
// Query params: ?session_id=cs_test_...

// Response:
{
  success: boolean;
  subscription: { ... };
}
```

---

## 🚨 Critical Issues

### Issue 1: Two Auth Systems
**Problem**: We have both:
- Device-based auth (JWT tokens via `useAuth.ts`)
- Supabase auth (Google OAuth)

**Solution**: Choose ONE:
- **Option A (Recommended)**: Use device auth for anonymous users, Supabase for logged-in users
- **Option B**: Use only Supabase, create anonymous sessions for non-logged-in users

### Issue 2: No Router
**Problem**: Success page needs routing but app doesn't use React Router.

**Solution**: 
- Add `react-router-dom` dependency
- Wrap app with `<BrowserRouter>`
- Add routes for `/` and `/success`

---

## ✅ Quick Fix Checklist

```bash
# 1. Install missing dependencies
cd packages/frontend
npm install react-router-dom

# 2. Create auth context
# (Copy code from Fix 1 above)

# 3. Create success page
# (Copy code from Fix 5 above)

# 4. Update components
# (Apply fixes 2, 3, 4)

# 5. Add environment variables
# (Create .env file)

# 6. Test locally
npm run dev

# 7. Deploy
git add -A
git commit -m "Complete frontend integration for auth and payments"
git push
```

---

## 📊 Current Status

```
Component Creation:     ✅ 100% (4/4 components)
Dependency Install:     ✅ 100% (2/2 packages)
UI Integration:         ✅ 100% (components render)
Functional Integration: ❌ 20% (missing auth context, backend sync, success flow)
Environment Setup:      ❌ 0% (no .env file)
Backend Endpoints:      ❌ 0% (3 endpoints missing)
```

**Overall Frontend Integration**: 40% Complete

---

## 🎯 Next Steps

1. **Right now**: Create auth context and wire up premium status
2. **While backend builds**: Set up Supabase, Google OAuth, Stripe
3. **After credentials**: Add environment variables
4. **Final step**: Test end-to-end flow

**Estimated time to complete**: 1-2 hours

