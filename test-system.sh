#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  Video Chat System Test Suite"
echo "=========================================="
echo ""

# Test 1: Check Redis
echo -e "${YELLOW}Test 1: Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    echo "  Start Redis with: redis-server --port 6379"
    exit 1
fi
echo ""

# Test 2: Check Backend Health
echo -e "${YELLOW}Test 2: Checking Backend...${NC}"
if curl -s http://localhost:3333/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
    echo "  Response:"
    curl -s http://localhost:3333/health | jq '.' 2>/dev/null || curl -s http://localhost:3333/health
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "  Start backend with: cd packages/backend && npm run dev"
    exit 1
fi
echo ""

# Test 3: Test JWT Token Generation
echo -e "${YELLOW}Test 3: Testing JWT Token Generation...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3333/auth/token \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test-device-'$(date +%s)'"}')

if echo "$TOKEN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ JWT token generated successfully${NC}"
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)
    echo "  Token: ${ACCESS_TOKEN:0:50}..."
else
    echo -e "${RED}✗ Failed to generate JWT token${NC}"
    echo "  Response: $TOKEN_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Test TURN Credentials
echo -e "${YELLOW}Test 4: Testing TURN Credentials...${NC}"
TURN_RESPONSE=$(curl -s -X POST http://localhost:3333/turn/credentials \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$TURN_RESPONSE" | grep -q "urls"; then
    echo -e "${GREEN}✓ TURN credentials generated successfully${NC}"
    echo "  Response:"
    echo "$TURN_RESPONSE" | jq '.' 2>/dev/null || echo "$TURN_RESPONSE"
else
    echo -e "${RED}✗ Failed to generate TURN credentials${NC}"
    echo "  Response: $TURN_RESPONSE"
fi
echo ""

# Test 5: Check Frontend
echo -e "${YELLOW}Test 5: Checking Frontend...${NC}"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
    echo "  URL: http://localhost:5173"
else
    echo -e "${RED}✗ Frontend is not running${NC}"
    echo "  Start frontend with: cd packages/frontend && npm run dev"
    exit 1
fi
echo ""

# Test 6: Check Prometheus Metrics
echo -e "${YELLOW}Test 6: Checking Prometheus Metrics...${NC}"
METRICS=$(curl -s http://localhost:3333/metrics)
if echo "$METRICS" | grep -q "video_chat"; then
    echo -e "${GREEN}✓ Metrics endpoint is working${NC}"
    echo "  Available metrics:"
    echo "$METRICS" | grep "^# HELP video_chat" | head -5
else
    echo -e "${RED}✗ Metrics endpoint not working${NC}"
fi
echo ""

# Test 7: Check Redis Queue
echo -e "${YELLOW}Test 7: Checking Redis Connection...${NC}"
REDIS_INFO=$(redis-cli info server 2>/dev/null | grep redis_version)
if [ ! -z "$REDIS_INFO" ]; then
    echo -e "${GREEN}✓ Redis connection successful${NC}"
    echo "  $REDIS_INFO"
else
    echo -e "${RED}✗ Cannot connect to Redis${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo -e "${GREEN}✓ All critical tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173 in two browser windows"
echo "2. Click 'Start Video Chat' in both windows"
echo "3. Allow camera/microphone permissions"
echo "4. You should be matched within 2-3 seconds"
echo ""
echo "Monitoring:"
echo "- Health: http://localhost:3333/health"
echo "- Metrics: http://localhost:3333/metrics"
echo "- Frontend: http://localhost:5173"
echo ""
