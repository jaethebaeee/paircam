#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  Starting Video Chat Application"
echo "=========================================="
echo ""

# Check if Redis is running
echo -e "${YELLOW}Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is already running${NC}"
else
    echo -e "${YELLOW}Starting Redis...${NC}"
    redis-server --port 6379 --daemonize yes
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis started${NC}"
    else
        echo -e "${RED}✗ Failed to start Redis${NC}"
        exit 1
    fi
fi
echo ""

# Start Backend
echo -e "${YELLOW}Starting Backend...${NC}"
cd /tmp/omegle-clone/packages/backend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
fi

# Start backend in background
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3333/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
        break
    fi
    sleep 1
done

if ! curl -s http://localhost:3333/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend failed to start${NC}"
    echo "Check logs: tail -f /tmp/backend.log"
    exit 1
fi
echo ""

# Start Frontend
echo -e "${YELLOW}Starting Frontend...${NC}"
cd /tmp/omegle-clone/packages/frontend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend in background
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/frontend.pid

# Wait for frontend to start
echo "Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
        break
    fi
    sleep 1
done

if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${RED}✗ Frontend failed to start${NC}"
    echo "Check logs: tail -f /tmp/frontend.log"
    exit 1
fi
echo ""

# Summary
echo "=========================================="
echo "  Application Started Successfully!"
echo "=========================================="
echo ""
echo "Services:"
echo "  • Redis:    localhost:6379"
echo "  • Backend:  http://localhost:3333"
echo "  • Frontend: http://localhost:5173"
echo ""
echo "Logs:"
echo "  • Backend:  tail -f /tmp/backend.log"
echo "  • Frontend: tail -f /tmp/frontend.log"
echo ""
echo "To stop all services:"
echo "  ./stop-all.sh"
echo ""
echo -e "${GREEN}Open http://localhost:5173 in your browser!${NC}"
echo ""
