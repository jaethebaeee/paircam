# Deploy Frontend to Vercel

## Quick Deploy (5 minutes)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy from frontend directory
```bash
cd packages/frontend
VITE_API_URL=https://api.livecam.app VITE_WS_URL=wss://api.livecam.app vercel --prod
```

### Step 4: Set up custom domain
After deployment, go to Vercel dashboard:
1. Go to your project settings
2. Click "Domains"
3. Add `app.livecam.app`
4. Follow instructions to add DNS record

---

## Alternative: Deploy via Vercel Website

1. Go to https://vercel.com
2. Import your GitHub repo: `jaethebaeee/paircam`
3. Set Root Directory: `packages/frontend`
4. Set Environment Variables:
   - `VITE_API_URL` = `https://api.livecam.app`
   - `VITE_WS_URL` = `wss://api.livecam.app`
5. Deploy!
6. Add custom domain `app.livecam.app` in settings

---

## Testing Locally

```bash
cd packages/frontend
VITE_API_URL=https://api.livecam.app VITE_WS_URL=wss://api.livecam.app npm run dev
```

Open http://localhost:5173 to test!

