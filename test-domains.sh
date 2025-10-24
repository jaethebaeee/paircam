#!/bin/bash

echo "🧪 Complete Domain Test for PairCam"
echo "===================================="
echo ""

# DNS Check
echo "1️⃣ DNS Configuration:"
echo "   api.paircam.live → $(dig +short api.paircam.live | xargs)"
echo "   app.paircam.live → $(dig +short app.paircam.live | xargs)"
echo ""

# Expected
echo "   Expected:"
echo "   api.paircam.live → 161.35.253.148"
echo "   app.paircam.live → 76.76.21.21"
echo ""

# Backend Test
echo "2️⃣ Testing Backend (api.paircam.live):"
BACKEND_DIRECT=$(curl -s -o /dev/null -w "%{http_code}" http://146.190.198.234:3333/health)
echo "   Direct IP (146.190.198.234:3333): $BACKEND_DIRECT"

BACKEND_DOMAIN=$(curl -s -o /dev/null -w "%{http_code}" -k https://api.paircam.live/health 2>&1)
if [[ $BACKEND_DOMAIN == *"200"* ]]; then
    echo "   ✅ api.paircam.live: Working"
elif [[ $BACKEND_DOMAIN == *"000"* ]]; then
    echo "   ❌ api.paircam.live: SSL/Connection Error"
else
    echo "   ⚠️  api.paircam.live: Status $BACKEND_DOMAIN"
fi
echo ""

# Frontend Test
echo "3️⃣ Testing Frontend (app.paircam.live):"
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" https://app.paircam.live 2>&1)
if [[ $FRONTEND == *"200"* ]]; then
    echo "   ✅ app.paircam.live: Working"
elif [[ $FRONTEND == *"000"* ]]; then
    echo "   ❌ app.paircam.live: DNS not pointing to Vercel yet"
else
    echo "   ⚠️  app.paircam.live: Status $FRONTEND"
fi
echo ""

# Vercel Domain Status
echo "4️⃣ Vercel Domain Status:"
cd /tmp/omegle-clone/packages/frontend
vercel domains inspect app.paircam.live 2>&1 | grep -E "Name|A app.paircam.live|configured properly"
echo ""

# Final Status
echo "===================================="
API_DNS=$(dig +short api.paircam.live | head -1)
APP_DNS=$(dig +short app.paircam.live | head -1)

if [ "$API_DNS" == "161.35.253.148" ] && [ "$APP_DNS" == "76.76.21.21" ]; then
    echo "✅ DNS is configured correctly!"
    echo "   Wait 5-10 minutes for SSL and full propagation"
else
    echo "⚠️  DNS needs to be fixed in GoDaddy"
    echo "   1. api → Keep 161.35.253.148, Delete 76.76.21.21"
    echo "   2. app → Change to 76.76.21.21"
fi
echo ""

