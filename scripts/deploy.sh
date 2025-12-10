#!/bin/bash

# Production Deployment Script for Video Chat App
# This script helps deploy the application to production

set -e

echo "🚀 Video Chat App - Production Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production file not found!${NC}"
    echo ""
    echo "Please create .env.production from .env.production.example:"
    echo "  cp .env.production.example .env.production"
    echo "  nano .env.production  # Edit with your values"
    echo ""
    exit 1
fi

# Load environment variables
echo "📋 Loading environment variables..."
export $(cat .env.production | grep -v '^#' | xargs)

# Security checks
echo ""
echo "🔒 Running security checks..."

INSECURE=0

if [[ "$JWT_SECRET" == *"CHANGE"* ]] || [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ JWT_SECRET is not secure (must be 32+ characters)${NC}"
    INSECURE=1
fi

if [[ "$TURN_SHARED_SECRET" == *"CHANGE"* ]] || [ ${#TURN_SHARED_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ TURN_SHARED_SECRET is not secure${NC}"
    INSECURE=1
fi

if [[ "$REDIS_PASSWORD" == *"CHANGE"* ]] || [ ${#REDIS_PASSWORD} -lt 16 ]; then
    echo -e "${RED}❌ REDIS_PASSWORD is not secure${NC}"
    INSECURE=1
fi

if [[ "$CORS_ORIGINS" == *"yourdomain.com"* ]]; then
    echo -e "${YELLOW}⚠️  Warning: CORS_ORIGINS still contains default domain${NC}"
fi

if [ $INSECURE -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Security check failed! Please update your .env.production file.${NC}"
    echo ""
    echo "Generate secure secrets with:"
    echo "  openssl rand -base64 32"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Security checks passed${NC}"

# Check Docker is installed
echo ""
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is ready${NC}"

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo ""
echo -e "${GREEN}✅ Images built successfully${NC}"

# Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || true

# Start services
echo ""
echo "🚀 Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "🏥 Checking service health..."

HEALTHY=1

# Check Redis
if docker exec video-chat-redis-prod redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}❌ Redis is not responding${NC}"
    HEALTHY=0
fi

# Check Backend
BACKEND_HEALTH=$(curl -sf http://localhost:3333/health || echo "FAILED")
if [ "$BACKEND_HEALTH" != "FAILED" ]; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend is not responding${NC}"
    HEALTHY=0
fi

# Check Frontend
FRONTEND_HEALTH=$(curl -sf http://localhost/health || echo "FAILED")
if [ "$FRONTEND_HEALTH" != "FAILED" ]; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend is not responding${NC}"
    HEALTHY=0
fi

echo ""
if [ $HEALTHY -eq 1 ]; then
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""
    echo "Your application is now running:"
    echo "  • Frontend: http://localhost"
    echo "  • Backend API: http://localhost:3333"
    echo "  • Backend Health: http://localhost:3333/health"
    echo "  • Backend Metrics: http://localhost:3333/metrics"
    echo ""
    echo "View logs with:"
    echo "  docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo "Stop services with:"
    echo "  docker-compose -f docker-compose.prod.yml down"
else
    echo -e "${RED}❌ Deployment completed with errors${NC}"
    echo ""
    echo "Check logs with:"
    echo "  docker-compose -f docker-compose.prod.yml logs"
    exit 1
fi

