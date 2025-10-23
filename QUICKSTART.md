# ⚡ Quick Start Guide

Get your video chat app running in **3 minutes**!

---

## 🎯 Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- Redis 7+ ([Install](https://redis.io/docs/getting-started/installation/))

---

## 🚀 3-Step Launch

### Step 1: Install Dependencies (1 min)

```bash
cd /tmp/omegle-clone
./install-all.sh
```

This will:
- ✅ Install backend dependencies
- ✅ Install frontend dependencies
- ✅ Create environment files
- ✅ Check Redis installation

### Step 2: Start Services (1 min)

```bash
./start-all.sh
```

This will:
- ✅ Start Redis (if not running)
- ✅ Start Backend (port 3333)
- ✅ Start Frontend (port 5173)

### Step 3: Test It! (1 min)

```bash
# Open in your browser
open http://localhost:5173

# Or manually:
# 1. Open http://localhost:5173 in Chrome
# 2. Open http://localhost:5173 in Firefox (or incognito)
# 3. Click "Start Video Chat" in both windows
# 4. Allow camera/microphone permissions
# 5. You should match within 2-3 seconds!
```

---

## ✅ Verify Everything Works

```bash
./test-system.sh
```

Expected output:
```
✓ Redis is running
✓ Backend is running
✓ JWT token generated successfully
✓ TURN credentials generated successfully
✓ Frontend is running
✓ Metrics endpoint is working
✓ Redis connection successful
✓ All critical tests passed!
```

---

## 🎮 Try These Features

Once matched with another user:

1. **Video/Audio** - See and hear each other
2. **Chat** - Click chat icon, send messages
3. **Toggle Camera** - Click camera icon
4. **Toggle Mic** - Click microphone icon
5. **Skip** - Click next icon to find new partner
6. **Report** - Click flag icon to report abuse
7. **End Call** - Click end call button

---

## 🛑 Stop Services

```bash
./stop-all.sh
```

---

## 🐛 Troubleshooting

### Redis Not Running?
```bash
redis-server --port 6379
```

### Backend Won't Start?
```bash
cd packages/backend
npm install
npm run dev
```

### Frontend Won't Start?
```bash
cd packages/frontend
npm install
npm run dev
```

### Port Already in Use?
```bash
# Check what's using the port
lsof -i:3333  # Backend
lsof -i:5173  # Frontend
lsof -i:6379  # Redis

# Kill the process
kill -9 <PID>
```

### Camera/Mic Not Working?
- Allow permissions in browser
- Try HTTPS (some browsers require it)
- Check if camera is used by another app

---

## 📊 Check Status

### Backend Health
```bash
curl http://localhost:3333/health
```

### Backend Metrics
```bash
curl http://localhost:3333/metrics
```

### Redis Status
```bash
redis-cli ping
# Should return: PONG
```

### Check Logs
```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

---

## 🎨 Customize

### Change Backend Port

Edit `packages/backend/.env`:
```env
PORT=4000
```

### Change Frontend API URL

Edit `packages/frontend/.env`:
```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

---

## 📚 Next Steps

- **Read Full Docs:** [README.md](README.md)
- **Deploy to Production:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Run Tests:** [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Understand Architecture:** [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)

---

## 💡 Tips

### Development Mode

```bash
# Backend with hot reload
cd packages/backend
npm run dev

# Frontend with hot reload
cd packages/frontend
npm run dev
```

### Production Build

```bash
# Build backend
cd packages/backend
npm run build

# Build frontend
cd packages/frontend
npm run build
```

### Docker Deployment

```bash
docker-compose up -d
```

---

## ✨ That's It!

You now have a fully functional video chat application running locally!

**Open http://localhost:5173 and start connecting!** 🎉

---

## 🆘 Need Help?

- Check [README.md](README.md) for detailed documentation
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Check logs in `/tmp/backend.log` and `/tmp/frontend.log`

---

**Made with ❤️ - Happy Chatting!**
