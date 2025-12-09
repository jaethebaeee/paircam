#!/bin/bash

echo "🚀 Quick Test Setup for Video Chat App"
echo "======================================"
echo ""

# Check if Redis is running
echo "1️⃣ Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is already running"
else
    echo "❌ Redis is not running. Starting Redis..."
    echo "   Run in a new terminal: redis-server --port 6379"
    echo ""
fi

# Check if backend dependencies are installed
echo ""
echo "2️⃣ Checking Backend..."
if [ -d "packages/backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
    echo "   To start: cd packages/backend && npm run dev"
else
    echo "❌ Backend dependencies missing"
    echo "   Run: cd packages/backend && npm install"
fi

# Check if frontend dependencies are installed
echo ""
echo "3️⃣ Checking Frontend..."
if [ -d "packages/frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
    echo "   To start: cd packages/frontend && npm run dev"
else
    echo "❌ Frontend dependencies missing"
    echo "   Run: cd packages/frontend && npm install"
fi

echo ""
echo "======================================"
echo "🎯 TESTING INSTRUCTIONS"
echo "======================================"
echo ""
echo "Step 1: Start services in separate terminals:"
echo "  Terminal 1: redis-server --port 6379"
echo "  Terminal 2: cd packages/backend && npm run dev"
echo "  Terminal 3: cd packages/frontend && npm run dev"
echo ""
echo "Step 2: Open TWO browser windows:"
echo "  Window 1: http://localhost:5173 (Chrome)"
echo "  Window 2: http://localhost:5173 (Firefox or Incognito)"
echo ""
echo "Step 3: In BOTH windows:"
echo "  - Enter name (e.g., 'Alice' and 'Bob')"
echo "  - Enter age (e.g., '25')"
echo "  - Check 'I'm 18+'"
echo "  - Click 'Start Video Chat'"
echo "  - Allow camera/mic permissions"
echo ""
echo "Step 4: Test features:"
echo "  ✓ Camera toggle (on/off)"
echo "  ✓ Microphone toggle (mute/unmute)"
echo "  ✓ Chat messages"
echo "  ✓ Skip button (find new match)"
echo "  ✓ End call button"
echo ""
echo "Expected: You'll match within 2-3 seconds!"
echo ""
echo "======================================"
echo "📊 Monitoring Commands:"
echo "======================================"
echo ""
echo "Check Redis queue:"
echo "  redis-cli llen matchmaking:queue"
echo ""
echo "Check backend health:"
echo "  curl http://localhost:3333/health"
echo ""
echo "Check metrics:"
echo "  curl http://localhost:3333/metrics | grep video_chat"
echo ""
echo "======================================"
echo "Happy Testing! 🎉"
echo "======================================"
