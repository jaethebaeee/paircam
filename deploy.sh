#!/bin/bash

# PairCam Deployment Script for paircam.live
# Run this on your local machine with network access

set -e

echo "=========================================="
echo "  PairCam Deployment to paircam.live"
echo "=========================================="

# Step 1: Install dependencies
echo ""
echo "[1/4] Installing frontend dependencies..."
cd packages/frontend
npm install

# Step 2: Build frontend
echo ""
echo "[2/4] Building frontend..."
npm run build || (echo "Build with sitemap failed, trying direct build..." && npx tsc && npx vite build)

# Step 3: Deploy to Vercel
echo ""
echo "[3/4] Deploying to Vercel..."
npx vercel --prod

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "NEXT STEPS - Configure GoDaddy DNS:"
echo ""
echo "1. Go to Vercel Dashboard > Your Project > Settings > Domains"
echo "2. Add domains: paircam.live and www.paircam.live"
echo "3. In GoDaddy DNS, add these records:"
echo ""
echo "   Type    Name    Value                       TTL"
echo "   ----    ----    -----                       ---"
echo "   A       @       76.76.21.21                 600"
echo "   CNAME   www     cname.vercel-dns.com        600"
echo ""
echo "4. Wait 5-10 minutes for DNS propagation"
echo "5. Visit https://paircam.live"
echo ""
