#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "  Installing Video Chat Application"
echo "=========================================="
echo ""

# Check Node.js
echo -e "${YELLOW}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo ""

# Check Redis
echo -e "${YELLOW}Checking Redis...${NC}"
if command -v redis-server &> /dev/null; then
    REDIS_VERSION=$(redis-server --version | awk '{print $3}')
    echo -e "${GREEN}✓ Redis $REDIS_VERSION installed${NC}"
else
    echo -e "${YELLOW}⚠ Redis not found. Installing...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install redis
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y redis-server
    fi
fi
echo ""

# Install Backend
echo -e "${YELLOW}Installing Backend Dependencies...${NC}"
cd /tmp/omegle-clone/packages/backend
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Backend package.json not found${NC}"
    exit 1
fi

npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Backend installation failed${NC}"
    exit 1
fi
echo ""

# Install Frontend
echo -e "${YELLOW}Installing Frontend Dependencies...${NC}"
cd /tmp/omegle-clone/packages/frontend
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Frontend package.json not found${NC}"
    exit 1
fi

npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ Frontend installation failed${NC}"
    exit 1
fi
echo ""

# Create .env files if they don't exist
echo -e "${YELLOW}Setting up environment files...${NC}"

# Backend .env
if [ ! -f "/tmp/omegle-clone/packages/backend/.env" ]; then
    cat > /tmp/omegle-clone/packages/backend/.env << 'EOF'
NODE_ENV=development
PORT=3333
LOG_LEVEL=debug

JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRATION=5m

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

TURN_SHARED_SECRET=dev-turn-secret
TURN_REALM=video-chat.local
TURN_HOST=localhost
TURN_PORT=3478
TURN_TLS_PORT=5349

CORS_ORIGINS=http://localhost:5173,http://localhost:3000

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

OTEL_ENABLED=false
PROMETHEUS_PORT=9090

ABUSE_DETECTION_ENABLED=true
MAX_CALLS_PER_MINUTE=10
MAX_SKIPS_PER_SESSION=5
EOF
    echo -e "${GREEN}✓ Backend .env created${NC}"
else
    echo -e "${GREEN}✓ Backend .env already exists${NC}"
fi

# Frontend .env
if [ ! -f "/tmp/omegle-clone/packages/frontend/.env" ]; then
    cat > /tmp/omegle-clone/packages/frontend/.env << 'EOF'
VITE_API_URL=http://localhost:3333
VITE_WS_URL=ws://localhost:3333
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_CHAT=true
EOF
    echo -e "${GREEN}✓ Frontend .env created${NC}"
else
    echo -e "${GREEN}✓ Frontend .env already exists${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "  Installation Complete!"
echo "=========================================="
echo ""
echo "To start the application:"
echo ""
echo "1. Start Redis:"
echo "   redis-server --port 6379"
echo ""
echo "2. Start Backend (in new terminal):"
echo "   cd /tmp/omegle-clone/packages/backend"
echo "   npm run dev"
echo ""
echo "3. Start Frontend (in new terminal):"
echo "   cd /tmp/omegle-clone/packages/frontend"
echo "   npm run dev"
echo ""
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "Or use the start script:"
echo "   ./start-all.sh"
echo ""
