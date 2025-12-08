#!/bin/bash
set -e

echo "🚀 PairCam Production Setup Script"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ -f "packages/backend/.env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production already exists. Skipping creation.${NC}"
    echo "If you want to recreate it, delete it first."
else
    echo -e "${BLUE}1. Creating .env.production template${NC}"
    
    # Create a template for user to fill in
    cat > packages/backend/.env.production << 'ENVEOF'
# ===============================================
# PRODUCTION ENVIRONMENT VARIABLES
# Fill in the values below from your Supabase project
# ===============================================

# Server Configuration
NODE_ENV=production
PORT=3333
LOG_LEVEL=info

# DATABASE - Get from Supabase Dashboard → Settings → Database
# Copy the "Connection String" (URI format)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOURPROJECT.supabase.co:5432/postgres?sslmode=require

# SECURITY - Generate with: openssl rand -base64 64
JWT_SECRET=GENERATE_WITH_openssl_rand_-base64_64

# SECURITY - Generate with: openssl rand -base64 32
TURN_SHARED_SECRET=GENERATE_WITH_openssl_rand_-base64_32

# CORS - Your production domain
CORS_ORIGINS=https://paircam.live,https://www.paircam.live

# REDIS - Get from Upstash (upstash.com)
REDIS_URL=redis://:password@host:port

# TURN SERVER - Your domain/IP
TURN_HOST=turn.paircam.live
TURN_PORT=3478
TURN_REALM=paircam.live

# STRIPE - Get from stripe.com dashboard (PRODUCTION keys only!)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_ID_WEEKLY=price_xxxxx
STRIPE_PRICE_ID_MONTHLY=price_xxxxx

# FRONTEND
FRONTEND_URL=https://paircam.live
ENVEOF

    echo -e "${GREEN}✓ Created .env.production template${NC}"
    echo -e "${YELLOW}  📝 Open packages/backend/.env.production and fill in your values${NC}"
    echo ""
fi

echo ""
echo -e "${BLUE}2. Checking Backend Build${NC}"
cd packages/backend
npm run build
echo -e "${GREEN}✓ Build successful${NC}"

echo ""
echo -e "${BLUE}3. Build Summary${NC}"
echo "  - Backend: ✓ Compiled"
echo "  - TypeScript: ✓ No errors"
echo "  - Database: Supabase PostgreSQL ready"
echo "  - Cache: Redis ready (needs URL in .env)"
echo ""

echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "  1. Open packages/backend/.env.production"
echo "  2. Fill in these values:"
echo "     - DATABASE_URL (from Supabase)"
echo "     - JWT_SECRET (run: openssl rand -base64 64)"
echo "     - TURN_SHARED_SECRET (run: openssl rand -base64 32)"
echo "     - REDIS_URL (from Upstash or Supabase)"
echo "     - STRIPE keys (from Stripe dashboard)"
echo ""
echo "  3. Deploy to Railway:"
echo "     railway login"
echo "     railway up"
echo ""
echo "  4. Test endpoints:"
echo "     curl https://api.paircam.live/health"
echo "     npx wscat -c wss://api.paircam.live/signaling"
echo ""

