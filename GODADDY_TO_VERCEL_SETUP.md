# 🌐 Connect GoDaddy Domain to Vercel

## Current Situation

- ✅ Domain purchased: **paircam.live** (GoDaddy)
- ✅ App deployed: **Vercel**  
- ❌ Domain not connecting properly → White page

---

## 🔧 Fix: Connect GoDaddy → Vercel

### Step 1: Add Domain in Vercel (5 min)

1. Go to: https://vercel.com/jaes-projects-a9f69fea/frontend/settings/domains

2. Click **"Add Domain"**

3. Enter: `paircam.live`

4. Click **"Add"**

5. Vercel will show you DNS records to add

---

### Step 2: Configure DNS in GoDaddy (10 min)

1. **Go to GoDaddy**: https://dcc.godaddy.com/domains

2. **Find your domain**: `paircam.live`

3. **Click** "DNS" or "Manage DNS"

4. **Add these records:**

#### A Record (for paircam.live)
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600 seconds
```

#### A Record (for www.paircam.live)
```
Type: A  
Name: www
Value: 76.76.21.21
TTL: 600 seconds
```

#### OR use CNAME (Alternative - Recommended)

**For root domain (paircam.live):**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 600
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600
```

5. **Delete old records** pointing to other IPs

6. **Save changes**

---

### Step 3: Wait for DNS Propagation (5-30 min)

DNS changes take time to spread worldwide:
- **Fast**: 5-10 minutes
- **Normal**: 30-60 minutes  
- **Max**: Up to 48 hours (rare)

**Check status:**
```bash
# Check if DNS updated
nslookup paircam.live

# Or use online tool
https://www.whatsmydns.net/#A/paircam.live
```

---

### Step 4: Verify in Vercel

1. Go back to Vercel Domains page
2. Wait for green checkmark ✅ 
3. Vercel will automatically provision SSL certificate
4. Site should be live at https://paircam.live

---

## 🎯 Exact Steps (Copy-Paste)

### In Vercel Dashboard:

1. **Project**: jaes-projects-a9f69fea/frontend
2. **Settings** → **Domains**
3. **Add**: `paircam.live`
4. **Add**: `www.paircam.live`

### In GoDaddy DNS Management:

**DELETE these (if they exist):**
- Any A records pointing elsewhere
- Any CNAME records for @ or www
- Parked domain records

**ADD these:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 76.76.21.21 | 600 |
| CNAME | www | cname.vercel-dns.com | 600 |

---

## 🐛 Troubleshooting

### Issue: "Domain is not configured correctly"

**Fix:**
```bash
# Check current DNS
dig paircam.live

# Should show:
# paircam.live.  IN  A  76.76.21.21
```

If not, wait longer or check GoDaddy DNS settings again.

---

### Issue: "SSL Certificate Pending"

This is normal! Vercel needs DNS to be working first.

**Steps:**
1. Wait for DNS to propagate
2. Vercel auto-provisions SSL (Let's Encrypt)
3. Takes 5-10 minutes after DNS is correct

---

### Issue: Still seeing white page

**After DNS is connected, you still need to:**

1. **Clear Vercel cache:**
   ```bash
   cd /tmp/omegle-clone/packages/frontend
   vercel --prod --force
   ```

2. **Check environment variables** in Vercel:
   - Go to: Settings → Environment Variables
   - Verify `VITE_API_URL` and `VITE_WS_URL` are set

3. **Hard refresh** browser (Cmd+Shift+R)

---

## 📊 Verification Checklist

After setup, verify:

- [ ] `paircam.live` resolves to 76.76.21.21
- [ ] `www.paircam.live` resolves to Vercel
- [ ] Vercel shows green checkmark on both domains
- [ ] HTTPS works (green padlock)
- [ ] Site loads (not white page)
- [ ] Hard refresh shows new design

---

## 🚀 Alternative: Use Vercel Nameservers (Easier)

If you want Vercel to fully manage DNS:

### In GoDaddy:

1. Go to Domain Settings
2. Find "Nameservers"
3. Change to "Custom"
4. Enter Vercel's nameservers:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

### In Vercel:

1. Go to Domains
2. Add `paircam.live`
3. Vercel handles everything automatically

**Pros:** Easier, more reliable
**Cons:** Moves DNS control from GoDaddy to Vercel

---

## 📝 Current vs Correct Setup

### ❌ Current (Not Working):
```
GoDaddy DNS → ??? → White page
```

### ✅ Correct Setup:
```
GoDaddy DNS → Vercel Servers → Your App
paircam.live A record 76.76.21.21
www.paircam.live CNAME cname.vercel-dns.com
```

---

## 🎯 Quick Test

After DNS is set up, test with:

```bash
# Test DNS
curl -I https://paircam.live

# Should show:
# HTTP/2 200
# server: Vercel
```

If you see Vercel headers, DNS is working!

---

## ⏱️ Timeline

- **Now**: Add domain in Vercel (2 min)
- **+2 min**: Update GoDaddy DNS (5 min)
- **+7 min**: Wait for DNS propagation (10-30 min)
- **+37 min**: SSL auto-provisions (5 min)
- **+42 min**: ✅ Site is live!

---

## 💡 Pro Tips

1. **Use www redirect**: In Vercel, set `www.paircam.live` → `paircam.live`
2. **Enable HSTS**: In Vercel settings (force HTTPS)
3. **Set up staging**: Use `staging.paircam.live` for testing
4. **Monitor**: Use Vercel Analytics (free)

---

## 📞 Need Help?

**Vercel Docs**: https://vercel.com/docs/custom-domains
**GoDaddy DNS**: https://www.godaddy.com/help/manage-dns-680

---

## ✅ Final Steps After Domain Works

Once `paircam.live` loads correctly:

1. **Test all features:**
   - Landing page
   - Start video chat
   - Animations
   - Network indicator
   - Skip button

2. **Share your app:**
   ```
   🎉 Check out PairCam!
   https://paircam.live
   
   - Random video chat
   - No signup required
   - Mobile-optimized
   ```

3. **Monitor traffic** in Vercel Analytics

---

**Let's get your domain working!** 🚀

Start with Step 1: Add domain in Vercel dashboard

