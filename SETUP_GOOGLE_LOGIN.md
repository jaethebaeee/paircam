# 🔐 Setup Google Sign-In (Optional)

## Why Google Login Isn't Showing

The Google Sign-In button requires 3 environment variables that aren't set yet:

```bash
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-key>
```

**Current Status**: If these aren't set, the component shows a message or doesn't render.

---

## Option 1: Remove Google Sign-In (Quick Fix)

If you don't need Google login, let's remove it to clean up the UI:

### Step 1: Hide the Component
Edit `packages/frontend/src/components/LandingPage.tsx`:

Remove or comment out lines 214-230:

```tsx
// {/* Google Sign-In */}
// <div className="space-y-3">
//   <div className="relative">
//     ...
//   </div>
//   <GoogleSignInButton />
//   ...
// </div>
```

### Step 2: Push Changes
```bash
cd /tmp/omegle-clone
git add packages/frontend/src/components/LandingPage.tsx
git commit -m "Remove Google Sign-In from landing page"
git push origin main
```

**Result**: Cleaner UI, no Google login option

---

## Option 2: Set Up Google Sign-In (Full Setup - 15 min)

If you want to keep Google login, here's how to set it up:

### Step 1: Create Google OAuth Client (5 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted
6. Application type: **Web application**
7. Authorized JavaScript origins:
   ```
   http://localhost:5173
   https://your-app.vercel.app
   ```
8. Authorized redirect URIs:
   ```
   http://localhost:5173
   https://your-app.vercel.app
   ```
9. Click **Create**
10. **Copy your Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)

### Step 2: Create Supabase Project (5 min)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click **New Project**
3. Choose a name: `paircam`
4. Set a strong database password
5. Choose region closest to your users
6. Click **Create Project** (takes ~2 min)
7. Once ready, go to **Project Settings** → **API**
8. Copy these values:
   - **Project URL** (your Supabase URL)
   - **anon public** key (your Supabase Anon Key)

### Step 3: Enable Google Auth in Supabase (2 min)

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Sign in with Google**
4. Paste your **Google Client ID** from Step 1
5. Go back to Google Cloud Console
6. In your OAuth client, click to view details
7. Copy **Client Secret**
8. Paste into Supabase **Google Client Secret**
9. Click **Save**

### Step 4: Add Environment Variables to Vercel (3 min)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your project → **Settings** → **Environment Variables**
3. Add these three variables:

```bash
# Name: VITE_GOOGLE_CLIENT_ID
# Value: <your-google-client-id-from-step-1>

# Name: VITE_SUPABASE_URL
# Value: <your-supabase-url-from-step-2>

# Name: VITE_SUPABASE_ANON_KEY
# Value: <your-supabase-anon-key-from-step-2>
```

4. Select **Production**, **Preview**, and **Development**
5. Click **Save**

### Step 5: Redeploy

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment → **Redeploy**
3. Wait ~2 minutes
4. Google Sign-In button will now appear!

---

## Option 3: Make It Optional (Recommended)

Keep the code but hide it gracefully if not configured:

Edit `packages/frontend/src/components/LandingPage.tsx`:

```tsx
{/* Google Sign-In - Only show if configured */}
{import.meta.env.VITE_GOOGLE_CLIENT_ID && (
  <div className="space-y-3">
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
)}
```

**Result**: Google login only shows when credentials are configured

---

## My Recommendation

For a quick launch, I recommend **Option 1: Remove Google Sign-In** because:

1. ✅ **Faster launch** - No setup needed
2. ✅ **Simpler UX** - One less thing for users to think about
3. ✅ **Works immediately** - No environment variables needed
4. ✅ **Anonymous chat** - Fits the Omegle concept better
5. ✅ **Can add later** - Easy to add back when you need premium features

You already have device-based authentication working, which is perfect for anonymous video chat!

---

## Quick Fix: Remove Google Sign-In

Want me to remove it for you? I can:
1. Remove the Google Sign-In section from LandingPage
2. Keep the authentication working (device-based)
3. Push the changes
4. Auto-deploy in 2 minutes

Let me know if you want me to do this! 🚀

---

## Cost Comparison

**Without Google Sign-In**:
- Free ✅
- Works immediately ✅

**With Google Sign-In**:
- Google OAuth: Free ✅
- Supabase: Free tier (50K users) ✅
- Setup time: 15 minutes ⏱️

Both are free, just depends on if you want the extra setup!

