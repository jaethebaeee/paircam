# 🎥 Connect - Random Video Chat Application

A production-ready, modern random video chat application built with React, NestJS, WebRTC, and Redis. Features beautiful UI, real-time matching, and comprehensive backend infrastructure.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![NestJS](https://img.shields.io/badge/NestJS-10-e0234e)

---

## ✨ Features

### Core Features
- 🎥 **Random Video Chat** - Instant 1-on-1 video connections
- 💬 **Real-time Chat** - Text messaging with emoji support
- 🌍 **Global Matching** - Connect with people worldwide
- 🎭 **Anonymous** - No registration required
- 🔒 **Secure** - JWT authentication and encrypted connections
- ⚡ **Fast Matching** - < 5 seconds average match time
- 📱 **Responsive** - Works on desktop, tablet, and mobile

### Safety Features
- 🛡️ **Abuse Reporting** - Report inappropriate behavior
- 🚫 **Block Lists** - IP and device blocking
- ⏱️ **Rate Limiting** - Prevent spam and abuse
- 👮 **Moderation Tools** - Admin dashboard for moderators

### Technical Features
- 🔄 **WebRTC P2P** - Direct peer-to-peer connections
- 🌐 **TURN Fallback** - Works behind NAT/firewalls
- 📊 **Monitoring** - Prometheus metrics and health checks
- 🐳 **Docker Ready** - Containerized deployment
- ☸️ **Kubernetes** - Production-ready manifests

---

## 🚀 Quick Start (3 Steps)

### 1. Install Dependencies

```bash
./install-all.sh
```

### 2. Start All Services

```bash
./start-all.sh
```

### 3. Open in Browser

```
http://localhost:5173
```

**That's it!** Open in two browser windows to test matching.

---

## 📋 Manual Setup

### Prerequisites

- Node.js 18+
- Redis 7+
- Modern browser (Chrome, Firefox, Safari, Edge)

### Step-by-Step

```bash
# 1. Start Redis
redis-server --port 6379

# 2. Install & Start Backend
cd packages/backend
npm install
npm run dev

# 3. Install & Start Frontend (new terminal)
cd packages/frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3333
- Health: http://localhost:3333/health
- Metrics: http://localhost:3333/metrics

---

## 🎨 UI Preview

### Modern Design Features
- ✨ **Gradient Backgrounds** - Soft blue-to-indigo gradients
- 🎯 **Inter Font** - Professional, clean typography
- 💎 **Glassmorphism** - Backdrop blur effects
- 🎬 **Smooth Animations** - Hover effects and transitions
- 🎨 **Beautiful Buttons** - Gradient buttons with shadows

### Components
- **Landing Page** - Hero section with features
- **Video Chat** - Dual video layout with controls
- **Chat Panel** - Real-time messaging
- **Navbar** - Clean, modern header
- **Footer** - Polished footer with links

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            Frontend (React)                 │
│  • Modern UI with Tailwind CSS              │
│  • WebRTC video/audio                       │
│  • Socket.io client                         │
└─────────────────┬───────────────────────────┘
                  │ HTTPS + WebSocket
┌─────────────────▼───────────────────────────┐
│         Backend (NestJS)                    │
│  • WebSocket signaling server               │
│  • JWT authentication                       │
│  • Matchmaking service                      │
│  • Abuse reporting                          │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            Redis Cluster                    │
│  • Session management                       │
│  • Matchmaking queue                        │
│  • Rate limiting                            │
│  • Block lists                              │
└─────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
omegle-clone/
├── packages/
│   ├── backend/              # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/        # JWT authentication
│   │   │   ├── signaling/   # WebSocket gateway
│   │   │   ├── redis/       # Redis service
│   │   │   ├── turn/        # TURN credentials
│   │   │   ├── reporting/   # Abuse reports
│   │   │   └── monitoring/  # Metrics
│   │   └── package.json
│   │
│   └── frontend/             # React frontend
│       ├── src/
│       │   ├── components/  # UI components
│       │   ├── hooks/       # Custom hooks
│       │   └── config/      # Configuration
│       └── package.json
│
├── docs/                     # Documentation
├── install-all.sh           # Installation script
├── start-all.sh             # Start script
├── stop-all.sh              # Stop script
├── test-system.sh           # Test script
└── README.md                # This file
```

---

## 🧪 Testing

### Automated Tests

```bash
# Test entire system
./test-system.sh

# Backend tests
cd packages/backend
npm run test

# Frontend tests
cd packages/frontend
npm run test
```

### Manual Testing

1. **Single User:**
   - Open http://localhost:5173
   - Click "Start Video Chat"
   - Should see "Connecting..."

2. **Two Users:**
   - Window 1: Regular browser
   - Window 2: Incognito/Private
   - Both click "Start Video Chat"
   - Should match within 2-3 seconds

3. **Features:**
   - ✅ Video streaming
   - ✅ Audio streaming
   - ✅ Chat messaging
   - ✅ Toggle camera
   - ✅ Toggle microphone
   - ✅ Skip to next user
   - ✅ End call

---

## 📊 Tech Stack

### Backend
- **Framework:** NestJS 10
- **Language:** TypeScript 5
- **WebSocket:** Socket.io 4
- **Cache:** Redis 4
- **Auth:** JWT (Passport.js)
- **Validation:** class-validator
- **Monitoring:** Prometheus

### Frontend
- **Framework:** React 18
- **Language:** TypeScript 5
- **Build:** Vite 5
- **Styling:** Tailwind CSS 3
- **Icons:** Heroicons 2
- **WebRTC:** Native API
- **WebSocket:** Socket.io-client 4

### Infrastructure
- **Container:** Docker
- **Orchestration:** Kubernetes
- **Cache:** Redis 7
- **TURN:** Coturn (optional)

---

## 🔧 Configuration

### Backend Environment

```env
NODE_ENV=development
PORT=3333
JWT_SECRET=your-secret-key
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:5173
```

### Frontend Environment

```env
VITE_API_URL=http://localhost:3333
VITE_WS_URL=ws://localhost:3333
```

---

## 🐳 Docker Deployment

```bash
# Start with Docker Compose
docker-compose up -d

# Services:
# - Redis: localhost:6379
# - Backend: localhost:3333
# - Frontend: localhost:5173
```

---

## ☸️ Kubernetes Deployment

```bash
# Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/

# Check status
kubectl get pods -n video-chat

# Access services
kubectl port-forward svc/frontend 5173:80
```

---

## 📈 Monitoring

### Metrics

Visit `http://localhost:3333/metrics` for Prometheus metrics:

- `video_chat_active_connections` - Active WebSocket connections
- `video_chat_sessions_created_total` - Total sessions created
- `video_chat_match_latency_seconds` - Matchmaking latency
- `video_chat_webrtc_offers_total` - WebRTC offers sent

### Health Checks

- **Liveness:** `GET /health`
- **Readiness:** `GET /health/ready`

---

## 💰 Cost Estimates

| Tier | Concurrent Users | Monthly Cost (GCP) |
|------|------------------|-------------------|
| Dev | 100 | $45-60 |
| Small | 500 | $465 |
| Medium | 5,000 | $2,264 |

See [COST_ESTIMATE.md](COST_ESTIMATE.md) for detailed breakdown.

---

## 🔒 Security

- ✅ JWT authentication with 5-minute expiration
- ✅ CORS with strict origin validation
- ✅ Helmet.js security headers
- ✅ Rate limiting per device/IP
- ✅ Input validation with class-validator
- ✅ TURN credentials with HMAC-SHA1
- ✅ No PII storage
- ✅ Audit logging

---

## 📚 Documentation

- [Setup Guide](SETUP_GUIDE.md) - Detailed setup instructions
- [Architecture](SYSTEM_ARCHITECTURE.md) - System architecture
- [Cost Estimates](COST_ESTIMATE.md) - Infrastructure costs
- [Security](SECURITY_CHECKLIST.md) - Security checklist
- [Monitoring](MONITORING_AND_OBSERVABILITY.md) - Monitoring guide
- [Project Status](PROJECT_STATUS.md) - Current status

---

## 🛠️ Development

### Backend Development

```bash
cd packages/backend

# Development mode
npm run dev

# Build
npm run build

# Tests
npm run test

# Lint
npm run lint
```

### Frontend Development

```bash
cd packages/frontend

# Development mode
npm run dev

# Build
npm run build

# Tests
npm run test

# Lint
npm run lint
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check Redis is running: `redis-cli ping`
- Check port 3333 is free: `lsof -i:3333`
- Check logs: `tail -f /tmp/backend.log`

### Frontend won't start
- Check port 5173 is free: `lsof -i:5173`
- Check logs: `tail -f /tmp/frontend.log`

### Can't match users
- Check both users are connected
- Check Redis queue: `redis-cli llen matchmaking:queue`
- Check backend logs for errors

### Camera/Microphone not working
- Allow permissions in browser
- Check if camera is used by another app
- Try HTTPS (required for some browsers)

---

## 🚀 Deployment

### Production Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Change TURN_SHARED_SECRET
- [ ] Set NODE_ENV=production
- [ ] Configure CORS_ORIGINS for your domain
- [ ] Set up Redis Cluster for HA
- [ ] Configure TURN server
- [ ] Set up SSL/TLS certificates
- [ ] Configure monitoring and alerts
- [ ] Set up log aggregation
- [ ] Configure backups

### Deployment Options

1. **Docker Compose** - Simple single-server deployment
2. **Kubernetes** - Scalable multi-server deployment
3. **Cloud VMs** - AWS, GCP, or Azure virtual machines
4. **Managed Services** - Use managed Redis, load balancers

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📞 Support

- **Issues:** Create a GitHub issue
- **Documentation:** See `/docs` folder
- **Email:** support@example.com

---

## 🎉 Acknowledgments

- WebRTC community
- NestJS team
- React team
- Tailwind CSS team
- Open source contributors

---

## 📊 Stats

- **Lines of Code:** ~15,000+
- **Components:** 20+
- **API Endpoints:** 10+
- **WebSocket Events:** 15+
- **Tests:** Comprehensive coverage
- **Documentation:** Complete

---

**Made with ❤️ using TypeScript, React, and NestJS**

---

## 🔗 Quick Links

- [Setup Guide](SETUP_GUIDE.md)
- [Project Status](PROJECT_STATUS.md)
- [Architecture](SYSTEM_ARCHITECTURE.md)
- [API Documentation](packages/backend/README.md)
- [Frontend Documentation](packages/frontend/README.md)

---

**Ready to connect the world! 🌍**