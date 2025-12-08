#!/bin/bash

echo "🧪 Complete Domain Test for PairCam"
echo "===================================="
echo ""

# DNS Check
echo "1️⃣ DNS Configuration:"
echo "   livecam.app     → $(dig +short livecam.app | xargs)"
echo "   www.livecam.app → $(dig +short www.livecam.app | xargs)"
echo "   app.livecam.app → $(dig +short app.livecam.app | xargs)"
echo "   api.livecam.app → $(dig +short api.livecam.app | xargs)"
echo ""

# Expected
echo "   Expected:"
echo "   livecam.app     → 76.76.21.21"
echo "   www.livecam.app → 76.76.21.21 (or CNAME to livecam.app)"
echo "   app.livecam.app → 76.76.21.21"
echo "   api.livecam.app → 161.35.253.148"
echo ""

# Backend Test
echo "2️⃣ Testing Backend (api.livecam.app):"
BACKEND_DIRECT=$(curl -s -o /dev/null -w "%{http_code}" http://146.190.198.234:3333/health)
echo "   Direct IP (146.190.198.234:3333): $BACKEND_DIRECT"

BACKEND_DOMAIN=$(curl -s -o /dev/null -w "%{http_code}" -k https://api.livecam.app/health 2>&1)
if [[ $BACKEND_DOMAIN == *"200"* ]]; then
    echo "   ✅ api.livecam.app: Working"
elif [[ $BACKEND_DOMAIN == *"000"* ]]; then
    echo "   ❌ api.livecam.app: SSL/Connection Error"
else
    echo "   ⚠️  api.livecam.app: Status $BACKEND_DOMAIN"
fi
echo ""

# Frontend Test
echo "3️⃣ Testing Frontend (app.livecam.app):"
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" https://app.livecam.app 2>&1)
if [[ $FRONTEND == *"200"* ]]; then
    echo "   ✅ app.livecam.app: Working"
elif [[ $FRONTEND == *"000"* ]]; then
    echo "   ❌ app.livecam.app: DNS not pointing to Vercel yet"
else
    echo "   ⚠️  app.livecam.app: Status $FRONTEND"
fi
echo ""

# Vercel Domain Status
echo "4️⃣ Vercel Domain Status:"
cd /tmp/omegle-clone/packages/frontend
vercel domains inspect app.livecam.app 2>&1 | grep -E "Name|A app.livecam.app|configured properly"
echo ""

# Final Status
echo "===================================="
API_DNS=$(dig +short api.livecam.app | head -1)
APP_DNS=$(dig +short app.livecam.app | head -1)

if [ "$API_DNS" == "161.35.253.148" ] && [ "$APP_DNS" == "76.76.21.21" ]; then
    echo "✅ DNS is configured correctly!"
    echo "   Wait 5-10 minutes for SSL and full propagation"
else
    echo "⚠️  DNS needs to be fixed in GoDaddy"
    echo "   1. api → Keep 161.35.253.148, Delete 76.76.21.21"
    echo "   2. app → Change to 76.76.21.21"
fi
echo ""

