#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Stopping Video Chat Application"
echo "=========================================="
echo ""

# Stop Backend
if [ -f /tmp/backend.pid ]; then
    BACKEND_PID=$(cat /tmp/backend.pid)
    echo -e "${YELLOW}Stopping Backend (PID: $BACKEND_PID)...${NC}"
    kill $BACKEND_PID 2>/dev/null
    rm /tmp/backend.pid
    echo -e "${GREEN}✓ Backend stopped${NC}"
else
    echo "Backend PID file not found, trying to find process..."
    pkill -f "nest start" 2>/dev/null
fi
echo ""

# Stop Frontend
if [ -f /tmp/frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/frontend.pid)
    echo -e "${YELLOW}Stopping Frontend (PID: $FRONTEND_PID)...${NC}"
    kill $FRONTEND_PID 2>/dev/null
    rm /tmp/frontend.pid
    echo -e "${GREEN}✓ Frontend stopped${NC}"
else
    echo "Frontend PID file not found, trying to find process..."
    pkill -f "vite" 2>/dev/null
fi
echo ""

# Stop Redis (optional)
echo -e "${YELLOW}Redis is still running (use 'redis-cli shutdown' to stop)${NC}"
echo ""

echo "=========================================="
echo "  All Services Stopped"
echo "=========================================="
echo ""
