#!/bin/bash

echo "🔍 Checking DNS Configuration for paircam.live"
echo "=============================================="
echo ""

echo "Backend API (api.paircam.live):"
API_IP=$(dig +short api.paircam.live | tail -1)
if [ "$API_IP" == "161.35.253.148" ]; then
    echo "  ✅ Correct: $API_IP"
else
    echo "  ❌ Wrong: $API_IP (should be 161.35.253.148)"
fi
echo ""

echo "Frontend (app.paircam.live):"
APP_IP=$(dig +short app.paircam.live | tail -1)
if [ "$APP_IP" == "76.76.21.21" ]; then
    echo "  ✅ Correct: $APP_IP"
else
    echo "  ❌ Wrong: $APP_IP (should be 76.76.21.21)"
fi
echo ""

echo "=============================================="
if [ "$API_IP" == "161.35.253.148" ] && [ "$APP_IP" == "76.76.21.21" ]; then
    echo "✅ DNS is configured correctly!"
    echo ""
    echo "Testing endpoints..."
    echo ""
    echo "Backend health check:"
    curl -s https://api.paircam.live/health | head -5 || echo "⚠️  Backend not responding yet"
    echo ""
    echo "Frontend:"
    curl -s -o /dev/null -w "Status: %{http_code}" https://app.paircam.live
    echo ""
else
    echo "⚠️  DNS not configured correctly yet. Wait 5-30 minutes after updating."
fi

