# System Architecture: Production-Ready Video Chat Service

## A. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INTERNET / CLIENTS                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  Browser 1   │    │  Browser 2   │    │   Mobile    │              │
│  │ (React/Vite) │    │ (React/Vite) │    │   (PWA/Web) │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│        ▲                    ▲                    ▲                       │
│        │ HTTPS+WSS          │ HTTPS+WSS          │ HTTPS+WSS            │
│        └────────────────────┼────────────────────┘                       │
│                             │                                             │
├─────────────────────────────┼─────────────────────────────────────────┤
│                    EDGE / CDN LAYER (Optional)                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  CloudFlare / Akamai (DDoS protection, geo-routing)           │  │
│  └─────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────┬─────────────────────────────────────────┤
│                             │                                         │
│                      Ingress (TLS)                                    │
│                    Load Balancer (L7)                                │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    KUBERNETES CLUSTER                          │ │
│  │                                                                │ │
│  │  ┌──────────────────────────────────────────────────────────┐ │ │
│  │  │         SIGNALING TIER (Horizontally Scalable)           │ │ │
│  │  │  ┌─────────────────┐   ┌─────────────────┐              │ │ │
│  │  │  │   NestJS Pod 1  │   │   NestJS Pod 2  │ ◄─ HPA       │ │ │
│  │  │  │  (Socket.io)    │   │  (Socket.io)    │              │ │ │
│  │  │  └─────────────────┘   └─────────────────┘              │ │ │
│  │  │  ┌─────────────────┐   ┌─────────────────┐              │ │ │
│  │  │  │   NestJS Pod N  │   │  Service Mesh   │              │ │ │
│  │  │  │  (Socket.io)    │   │   (Optional)    │              │ │ │
│  │  │  └─────────────────┘   └─────────────────┘              │ │ │
│  │  └──────────────────────────────────────────────────────────┘ │ │
│  │                          │ │                                     │ │
│  │  ┌──────────────────────┴─┴───────────────────────────────────┐ │ │
│  │  │                  DATA TIER                                 │ │ │
│  │  │  ┌──────────────────────┐  ┌──────────────────────────────┐ │ │
│  │  │  │  Redis Cluster       │  │  Postgres (Optional)         │ │ │
│  │  │  │  - Session Queue     │  │  - Reports                   │ │ │
│  │  │  │  - Block Lists       │  │  - User Metadata             │ │ │
│  │  │  │  - Rate Limit Buckets│  │  - Analytics                 │ │ │
│  │  │  │  - Offer/Answer TTL  │  │  - Appeal History            │ │ │
│  │  │  └──────────────────────┘  └──────────────────────────────┘ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │         COTURN CLUSTER (TURN/STUN Servers)                  │ │ │
│  │  │  ┌─────────────────┐   ┌─────────────────┐                 │ │ │
│  │  │  │ TURN Pod 1      │   │ TURN Pod 2      │ ◄─ HPA          │ │ │
│  │  │  │ (coturn)        │   │ (coturn)        │                 │ │ │
│  │  │  └─────────────────┘   └─────────────────┘                 │ │ │
│  │  │  Exposed on UDP:3478, TCP:5349 (TLS)                       │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │         ADMIN UI TIER                                        │ │ │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  │  React Admin Dashboard (NextJS/React)                  │ │ │
│  │  │  │  - Session monitoring                                  │ │ │
│  │  │  │  - Report queue                                        │ │ │
│  │  │  │  - Block list management                               │ │ │
│  │  │  │  - Moderation actions                                  │ │ │
│  │  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │         OBSERVABILITY TIER                                  │ │ │
│  │  │  ┌────────────────┐  ┌─────────────┐  ┌──────────────────┐ │ │
│  │  │  │  Prometheus    │  │   Grafana   │  │ OpenTelemetry    │ │ │
│  │  │  │  (Metrics)     │  │ (Dashboards)│  │ (Tracing)        │ │ │
│  │  │  └────────────────┘  └─────────────┘  └──────────────────┘ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘

          ▲ Peer-to-Peer WebRTC (Direct Media)
          │ Falls back to TURN if NAT prevents P2P
          │
     ┌────┴────┐
     │          │
  Browser 1  Browser 2
```

## B. Component Responsibilities

### Frontend (React + Vite)
- **Landing Page**: "Start Call" CTA, settings access
- **Call Screen**: Real-time video/audio, text chat, emoji reactions
- **Control Panel**: Mute/camera toggle, "Next" button, "Report" button
- **Settings Modal**: Camera/mic selection, language preference, privacy options
- **Connection Modal**: Shows connection state (connecting, connected, failed)
- **Report Modal**: Report reason dropdown, optional comment submission

**Tech Stack**:
- React 18 with hooks
- Vite for fast HMR and optimized builds
- Tailwind CSS for styling
- Socket.io-client for signaling
- simple-peer or native WebRTC API for peer connections
- TailwindCSS + Headless UI for accessible components

### Backend (NestJS + Socket.io)
- **Signaling Server**:
  - Matchmaking queue logic (FIFO, region-aware, language filters)
  - Room creation and peer offer/answer relay
  - ICE candidate forwarding
  - Session lifecycle management
  - Rate limiting and abuse detection
  
- **REST API**:
  - JWT token generation/refresh (short-lived)
  - Report submission and retrieval (admin only)
  - Block list management
  - TURN credential generation (ephemeral HMAC tokens)
  - Analytics endpoints (metrics, heatmaps)
  
- **Services**:
  - Redis integration for session state and queues
  - JWT authentication middleware
  - Rate limiter (token bucket per IP/device)
  - Abuse detector (IP velocity, repeated reports)
  - Metrics exporter (Prometheus)

**Tech Stack**:
- NestJS 10+ for structured backend
- Socket.io 4+ for signaling
- Redis for state management
- Passport.js for JWT auth
- Prometheus client for metrics
- OpenTelemetry SDK for tracing

### Redis
- **Queues**:
  - `matchmaking:queue`: FIFO list of waiting users with region/language tags
  - `matchmaking:region:{region}`: Region-specific queues
  
- **Session State** (TTL-based):
  - `session:{sessionId}`: Active session metadata
  - `offer:{sessionId}`: Offer SDP (TTL 30s)
  - `answer:{sessionId}`: Answer SDP (TTL 30s)
  - `candidates:{sessionId}:{peerId}`: ICE candidates (TTL 60s)
  
- **Rate Limiting** (token bucket):
  - `ratelimit:ip:{ip}`: Requests per minute counter
  - `ratelimit:device:{deviceId}`: Device rate limit counter
  
- **Block Lists**:
  - `blocklist:user:{userId}`: Set of blocked user IDs
  - `blocklist:ip:{ip}`: Set of blocked IPs (abuse)
  
- **Reporting**:
  - `reports:queue`: Queue of pending reports
  - `reports:metadata:{reportId}`: Report details

### Coturn (TURN/STUN Server)
- Relay media when P2P fails (behind NAT/firewall)
- Generate ephemeral HMAC tokens (username:expiry, password=HMAC)
- TLS support on port 5349 for encrypted relay
- Clustering for load distribution

### Admin UI (React + Next.js)
- **Dashboard**:
  - Real-time session count, match latency heatmap
  - Active reports queue
  - Block list and appeals
  - User IP/device reputation
  
- **Moderation**:
  - View report details (no video, just metadata)
  - Accept/reject appeal, create new blocks
  - Bulk actions (IP ban, device ID ban)

### Monitoring Stack
- **Prometheus**: Scrapes metrics from signaling pods (connection count, signaling latency, ICE failures)
- **Grafana**: Dashboards (latency distribution, session duration, TURN usage %)
- **OpenTelemetry**: Traces signaling flow and socket events (optional, for debugging)

---

## C. Data Flow Diagrams

### Call Initiation Flow

```
User A                  Backend                  User B
  │                       │                        │
  ├─ Click "Start" ──────►│                        │
  │                       │ Add to queue           │
  │                       ├─ Get TURN creds       │
  │                       │                        │
  │                       │                        ◄── Click "Start"
  │                       │                        │
  │                       ├─ Match queue check ───►│
  │                       │                        │
  │◄─ Matched emit ───────┼─ Matched emit ────────►│
  │                       │                        │
  ├─ Create offer ───────►│                        │
  │ (SDP + ICE cands)     ├─ Store offer in Redis │
  │                       │                        │
  │                       ├─ Relay offer ────────►│
  │                       │                        │
  │                       │◄─ Create answer ──────┤
  │                       │ (SDP + ICE cands)     │
  │                       │                        │
  │◄─ Relay answer ───────┤                        │
  │                       │                        │
  ├─ Add ICE candidates ─►│                        │
  │ (as discovered)       ├─ Relay to peer ──────►│
  │                       │                        │
  │                       │◄─ ICE candidates ─────┤
  │◄─ Relay candidates ───┤                        │
  │                       │                        │
  ├─ P2P connection ─────────────────────────────►│ (Direct Media)
  │   (or via TURN)                               │
  │                       │                        │
  │◄─ Media stream ───────────────────────────────┤
  │                       │                        │
  │── Video/Audio/Chat ──────────────────────────►│
  │                       │                        │
```

### Abuse Detection & Reporting Flow

```
User (Potential Abuser)          Backend                    Admin UI
           │                         │                          │
           ├─ Rapid calls (4/min) ──►│                          │
           │                         ├─ Rate limit exceeded     │
           │                         ├─ Add to watch list       │
           │                         │                          │
           ├─ Next, Next, Next ──────►│                          │
           │                         ├─ Pattern detection       │
           │◄─ CAPTCHA required ─────┤                          │
           │                         │                          │
    (Other User)                     │                          │
           │                         │                          │
           ├─ Click "Report" ───────►│                          │
           │                         ├─ Store report metadata   │
           │                         │  (timestamp, reason)     │
           │                         ├─ Add to reports:queue ──►│
           │                         │                          │
           │                         │                    Report appears
           │                         │                    in queue
           │                         │                          │
           │                         │                    Moderator views
           │                         │                          │
           │                         │◄─ Accept/Reject ────────┤
           │                         │                          │
           │◄─ User blocked ─────────┤                          │
           │  (IP + device ID)       │                          │
           │                         │                          │
           ├─ Next call attempt ────►│                          │
           │                         ├─ Check blocklist        │
           │◄─ Blocked ──────────────┤                          │
```

---

## D. Scalability Notes

### Horizontal Scaling: Signaling Tier
- Each NestJS pod is **stateless** (only Redis holds state)
- Load balancer distributes WebSocket upgrades across pods
- Session affinity not required
- Scale up/down based on CPU (target ~70%) and active connection count

### Redis Cluster
- Use Redis Cluster (3+ nodes) for HA
- TTL-based expiration for transient data (offers, answers, candidates)
- RDB snapshots for persistence
- Can be replaced with Redis Sentinel for master-slave replication

### Coturn Clustering
- Coturn supports clustering via shared SQL backend or memory
- Each TURN pod is independent
- Clients load-balance across TURN endpoints via DNS round-robin

### Database (Postgres) - Optional
- Used only for historical data (reports, analytics, user appeals)
- Not critical path for call signaling
- Can be scaled separately with read replicas

---

## E. Cost & Infrastructure Sizing

### Development Environment
- 1x Signaling Pod (small: 0.25 CPU, 512 MB RAM)
- 1x Redis (single-instance, 1 GB)
- 1x Coturn Pod (small)
- 1x Admin UI Pod
- **Total**: ~3 CPU, 4 GB RAM, minimal cost (<$150/mo on GCP/AWS)

### Small Production (100 concurrent sessions)
- 3x Signaling Pods (small: 0.5 CPU, 1 GB each) = 1.5 CPU, 3 GB
- 3x Redis Cluster nodes (1 CPU, 2 GB each) = 3 CPU, 6 GB
- 2x Coturn Pods (1 CPU, 2 GB each) = 2 CPU, 4 GB
- 1x Admin UI Pod = 0.5 CPU, 512 MB
- **Total**: ~7 CPU, 13.5 GB, ~$400–600/mo

### Medium Production (1000 concurrent sessions)
- 10x Signaling Pods (1 CPU, 2 GB each) = 10 CPU, 20 GB
- 5x Redis Cluster nodes (2 CPU, 4 GB each) = 10 CPU, 20 GB
- 5x Coturn Pods (2 CPU, 4 GB each) = 10 CPU, 20 GB
- 2x Admin UI Pods (1 CPU, 512 MB each) = 2 CPU, 1 GB
- **Total**: ~32 CPU, 61 GB, ~$2000–3000/mo

---

## F. Security Architecture

- **TLS 1.3 everywhere** (frontend, signaling, TURN, admin)
- **JWT tokens**: 5-minute expiration for session creation
- **CORS**: Strict origin validation
- **Rate limiting**: IP + device fingerprinting
- **TURN credentials**: HMAC-based, time-limited (1 hour default)
- **No PII storage**: Only device ID, IP, and session length
- **Audit logging**: All moderation actions logged to immutable store

See **SECURITY_CHECKLIST.md** for complete coverage.

---

## G. Observability SLOs

- **Signaling latency**: p95 < 200ms
- **ICE connection success**: >= 95%
- **TURN fallback rate**: < 15% (goal: 85% direct P2P)
- **Matchmaking latency**: p95 < 5s
- **Pod availability**: >= 99.9% (3-9s downtime/day)
- **Alert thresholds**:
  - Signaling latency p95 > 500ms
  - ICE success < 90%
  - Pod crash loop

See **MONITORING.md** for dashboards and runbook.
