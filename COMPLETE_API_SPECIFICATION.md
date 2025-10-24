# Complete API Specification - Omegle Clone

**Last Updated:** October 24, 2025  
**Backend Base URL:** `http://localhost:3333` (dev) / Your production URL  
**WebSocket URL:** `ws://localhost:3333` (dev) / Your production WS URL

---

## 📋 Table of Contents

1. [REST API Endpoints](#rest-api-endpoints)
2. [WebSocket Events (Signaling)](#websocket-events-signaling)
3. [Authentication Flow](#authentication-flow)
4. [External APIs Needed](#external-apis-needed)
5. [Environment Variables](#environment-variables)

---

## 🔌 REST API Endpoints

### 1. Authentication (`/auth`)

#### `POST /auth/token`
**Purpose:** Generate JWT token for device-based authentication  
**Auth:** ❌ Public  
**Request:**
```json
{
  "deviceId": "uuid-v4-device-id"
}
```
**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-string"
}
```

#### `POST /auth/refresh`
**Purpose:** Refresh expired access token  
**Auth:** ✅ JWT Required  
**Headers:** `Authorization: Bearer <token>`  
**Response:**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token"
}
```

#### `GET /auth/verify`
**Purpose:** Verify token validity  
**Auth:** ✅ JWT Required  
**Response:**
```json
{
  "valid": true,
  "deviceId": "device-uuid"
}
```

---

### 2. Users (`/users`)

#### `GET /users/me`
**Purpose:** Get current user profile with premium status  
**Auth:** ✅ JWT Required  
**Response:**
```json
{
  "id": "user-id",
  "deviceId": "device-uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "gender": "male",
  "age": 25,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "isPremium": true
}
```

#### `PUT /users/me`
**Purpose:** Update user profile  
**Auth:** ✅ JWT Required  
**Request:**
```json
{
  "email": "newemail@example.com",
  "name": "New Name",
  "gender": "female",
  "age": 26
}
```
**Response:** Same as GET /users/me

#### `GET /users/premium-status`
**Purpose:** Check if user has premium subscription  
**Auth:** ✅ JWT Required  
**Response:**
```json
{
  "isPremium": true
}
```

#### `POST /users/sync`
**Purpose:** Sync Google OAuth user data with backend  
**Auth:** ✅ JWT Required  
**Request:**
```json
{
  "supabaseUserId": "supabase-user-id",
  "email": "user@example.com",
  "name": "John Doe"
}
```
**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "isPremium": false
  }
}
```

---

### 3. TURN/STUN (`/turn`)

#### `POST /turn/credentials`
**Purpose:** Get TURN server credentials for WebRTC NAT traversal  
**Auth:** ✅ JWT Required  
**Response:**
```json
{
  "urls": [
    "turn:turnserver.example.com:3478",
    "turn:turnserver.example.com:3478?transport=tcp"
  ],
  "username": "temporary-username",
  "credential": "temporary-password",
  "ttl": 86400
}
```

---

### 4. Reporting (`/reports`)

#### `POST /reports`
**Purpose:** Submit user report for inappropriate behavior  
**Auth:** ✅ JWT Required  
**Request:**
```json
{
  "reportedPeerId": "device-id-of-reported-user",
  "sessionId": "session-uuid",
  "reason": "harassment",
  "comment": "Optional description"
}
```
**Valid Reasons:** `harassment`, `inappropriate_content`, `spam`, `underage`, `other`  
**Response:**
```json
{
  "reportId": "report-uuid"
}
```

#### `GET /reports/next` (Moderator Only)
**Purpose:** Get next pending report for moderation  
**Auth:** ✅ JWT Required + Moderator Role  
**Response:**
```json
{
  "reportId": "report-uuid",
  "reporterId": "reporter-device-id",
  "reportedPeerId": "reported-device-id",
  "reason": "harassment",
  "timestamp": 1234567890
}
```

#### `GET /reports`
**Purpose:** Get all reports (Moderator Only)  
**Auth:** ✅ JWT Required + Moderator Role  
**Query Params:** `limit` (optional, default 50)  
**Response:** Array of reports

#### `POST /reports/moderate`
**Purpose:** Make moderation decision on report  
**Auth:** ✅ JWT Required + Moderator Role  
**Request:**
```json
{
  "reportId": "report-uuid",
  "decision": "ban" // or "dismiss" or "warn"
}
```

#### `GET /reports/stats`
**Purpose:** Get reporting statistics  
**Auth:** ✅ JWT Required + Moderator Role  
**Response:**
```json
{
  "totalReports": 1234,
  "pendingReports": 56,
  "resolvedReports": 1178
}
```

---

### 5. Payments (`/payments`)

#### `POST /payments/create-checkout`
**Purpose:** Create Stripe checkout session for premium subscription  
**Auth:** ✅ JWT Required  
**Request:**
```json
{
  "plan": "monthly" // or "yearly"
}
```
**Response:**
```json
{
  "sessionId": "stripe-checkout-session-id",
  "url": "https://checkout.stripe.com/..."
}
```

#### `POST /payments/webhook`
**Purpose:** Stripe webhook endpoint for payment events  
**Auth:** ❌ Public (Stripe signature validation)  
**Headers:** `stripe-signature: webhook-signature`  
**Note:** Handles raw body buffer for signature verification

#### `POST /payments/cancel-subscription`
**Purpose:** Cancel premium subscription  
**Auth:** ✅ JWT Required  
**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled"
}
```

#### `GET /payments/verify`
**Purpose:** Verify Stripe checkout session completion  
**Auth:** ✅ JWT Required  
**Query Params:** `session_id` (required)  
**Response:**
```json
{
  "success": true,
  "isPremium": true
}
```

---

### 6. Subscriptions (`/subscriptions`)

#### `GET /subscriptions/my`
**Purpose:** Get all user subscriptions  
**Auth:** ✅ JWT Required  
**Response:**
```json
{
  "subscriptions": [
    {
      "id": "sub-id",
      "plan": "monthly",
      "status": "active",
      "currentPeriodStart": "2025-01-01T00:00:00.000Z",
      "currentPeriodEnd": "2025-02-01T00:00:00.000Z"
    }
  ]
}
```

#### `GET /subscriptions/active`
**Purpose:** Get active subscription  
**Auth:** ✅ JWT Required  
**Response:**
```json
{
  "subscription": {
    "id": "sub-id",
    "plan": "monthly",
    "status": "active"
  }
}
```

---

### 7. Health Check (`/health`)

#### `GET /health`
**Purpose:** Basic health check  
**Auth:** ❌ Public  
**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

#### `GET /health/ready`
**Purpose:** Readiness check (includes Redis, DB)  
**Auth:** ❌ Public  
**Response:**
```json
{
  "status": "ready",
  "redis": "connected",
  "database": "connected"
}
```

---

### 8. Metrics (`/metrics`)

#### `GET /metrics`
**Purpose:** Prometheus metrics endpoint  
**Auth:** ❌ Public (should be firewalled in production)  
**Response:** Prometheus text format

---

## 🔌 WebSocket Events (Signaling)

**Namespace:** `/signaling`  
**Connection URL:** `ws://localhost:3333/signaling`  
**Authentication:** JWT token passed in:
- `auth.token` field (Socket.IO client)
- OR `Authorization` header

### Client → Server Events

#### `join-queue`
**Purpose:** Enter matchmaking queue  
**Payload:**
```json
{
  "region": "global",
  "language": "en",
  "gender": "male",
  "genderPreference": "female", // or "any", "male"
  "preferences": {}
}
```

#### `leave-queue`
**Purpose:** Leave matchmaking queue  
**Payload:** None

#### `send-offer`
**Purpose:** Send WebRTC offer to matched peer  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "type": "offer",
  "data": {
    "type": "offer",
    "sdp": "webrtc-sdp-string"
  }
}
```

#### `send-answer`
**Purpose:** Send WebRTC answer to peer  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "type": "answer",
  "data": {
    "type": "answer",
    "sdp": "webrtc-sdp-string"
  }
}
```

#### `send-candidate`
**Purpose:** Send ICE candidate to peer  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "type": "candidate",
  "data": {
    "candidate": "ice-candidate-string",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  }
}
```

#### `send-message`
**Purpose:** Send text chat message  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "message": "Hello!",
  "sender": "John",
  "timestamp": 1234567890
}
```

#### `send-reaction`
**Purpose:** Send emoji reaction  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "emoji": "👋",
  "timestamp": 1234567890
}
```

#### `end-call`
**Purpose:** End current video chat session  
**Payload:**
```json
{
  "sessionId": "session-uuid"
}
```

---

### Server → Client Events

#### `connected`
**When:** On successful WebSocket connection  
**Payload:**
```json
{
  "deviceId": "device-uuid",
  "timestamp": 1234567890
}
```

#### `queue-joined`
**When:** Successfully joined matchmaking queue  
**Payload:**
```json
{
  "position": 5,
  "timestamp": 1234567890,
  "isPremium": true
}
```

#### `queue-left`
**When:** Successfully left queue  
**Payload:**
```json
{
  "timestamp": 1234567890
}
```

#### `matched`
**When:** Found a match  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "peerId": "peer-device-id",
  "timestamp": 1234567890
}
```

#### `offer`
**When:** Received WebRTC offer from peer  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "offer": {
    "type": "offer",
    "sdp": "webrtc-sdp-string"
  },
  "from": "peer-device-id"
}
```

#### `answer`
**When:** Received WebRTC answer from peer  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "answer": {
    "type": "answer",
    "sdp": "webrtc-sdp-string"
  },
  "from": "peer-device-id"
}
```

#### `candidate`
**When:** Received ICE candidate from peer  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "candidate": {
    "candidate": "ice-candidate-string",
    "sdpMLineIndex": 0
  },
  "from": "peer-device-id"
}
```

#### `message`
**When:** Received chat message from peer  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "message": "Hello!",
  "from": "peer-device-id",
  "sender": "Jane",
  "timestamp": 1234567890
}
```

#### `reaction`
**When:** Received emoji reaction from peer  
**Payload:**
```json
{
  "sessionId": "session-uuid",
  "emoji": "😊",
  "from": "peer-device-id",
  "timestamp": 1234567890
}
```

#### `peer-disconnected`
**When:** Matched peer disconnected or ended call  
**Payload:**
```json
{
  "sessionId": "session-uuid"
}
```

#### `call-ended`
**When:** Call successfully ended  
**Payload:**
```json
{
  "sessionId": "session-uuid"
}
```

#### `error`
**When:** Error occurred  
**Payload:**
```json
{
  "message": "Error description"
}
```

---

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Backend
    participant Redis
    
    Client->>Client: Generate/Get Device ID (UUID)
    Client->>Backend: POST /auth/token {deviceId}
    Backend->>Backend: Generate JWT
    Backend-->>Client: {accessToken, refreshToken}
    Client->>Client: Store tokens in localStorage
    
    Note over Client,Backend: All subsequent requests
    Client->>Backend: API Call (Authorization: Bearer <token>)
    Backend->>Backend: Verify JWT
    Backend-->>Client: Response
```

---

## 🌐 External APIs Needed

### 1. **Stripe API** (Required for Payments)
- **Purpose:** Premium subscription billing
- **Endpoints Used:**
  - Create Checkout Session
  - Handle Webhooks
  - Cancel Subscription
  - Retrieve Session
- **Setup:** Get API keys from [Stripe Dashboard](https://dashboard.stripe.com/)
- **Environment Variable:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### 2. **Google OAuth API** (Optional - for Google Sign-In)
- **Purpose:** Social authentication
- **Setup:** Create OAuth 2.0 credentials at [Google Cloud Console](https://console.cloud.google.com/)
- **Environment Variable:** `VITE_GOOGLE_CLIENT_ID` (frontend)

### 3. **Supabase** (Optional - if using Supabase Auth)
- **Purpose:** Alternative authentication provider
- **Setup:** Create project at [Supabase](https://supabase.com/)
- **Environment Variables:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 4. **TURN Server** (Required for Production)
- **Purpose:** WebRTC NAT traversal for peer connections
- **Options:**
  - **Self-hosted:** Use Coturn ([https://github.com/coturn/coturn](https://github.com/coturn/coturn))
  - **Cloud:** Use services like Twilio TURN, Xirsys, or Metered
- **Free Tier Options:**
  - Metered.ca: 50GB/month free
  - Xirsys: Free tier available
- **Environment Variables:**
  - `TURN_SERVER_URL`
  - `TURN_USERNAME`
  - `TURN_PASSWORD`
  - `TURN_SECRET` (for generating credentials)

### 5. **Redis** (Required)
- **Purpose:** Session management, matchmaking queue, rate limiting
- **Setup:**
  - **Local:** Install Redis locally
  - **Cloud:** Use Redis Labs, AWS ElastiCache, or DigitalOcean Managed Redis
- **Environment Variable:** `REDIS_URL` (e.g., `redis://localhost:6379`)

### 6. **PostgreSQL** (Required - via Prisma)
- **Purpose:** User data, subscriptions, reports
- **Setup:**
  - **Local:** Install PostgreSQL
  - **Cloud:** Use Supabase, Neon, Railway, or any Postgres provider
- **Environment Variable:** `DATABASE_URL`

---

## 🔑 Environment Variables

### Backend (.env)

```bash
# Server
NODE_ENV=development
PORT=3333
LOG_LEVEL=debug

# CORS
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/omegle_clone

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

# TURN Server (Required for production)
TURN_SERVER_URL=turn:turnserver.example.com:3478
TURN_USERNAME=username
TURN_PASSWORD=password
TURN_SECRET=shared-secret-for-generating-credentials

# Optional - Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Frontend (.env)

```bash
# API
VITE_API_URL=http://localhost:3333
VITE_WS_URL=ws://localhost:3333

# Google OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Supabase (Optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Environment
VITE_ENV=development
```

---

## 🚀 Quick Start Checklist

### Required APIs:
- [x] Redis (local or cloud)
- [x] PostgreSQL (local or cloud)
- [ ] TURN Server (for production WebRTC)
- [ ] Stripe (if enabling premium features)

### Optional APIs:
- [ ] Google OAuth (for social login)
- [ ] Supabase (alternative auth)

### Minimum Setup to Run:
1. ✅ PostgreSQL database
2. ✅ Redis instance
3. ✅ Environment variables configured
4. ⚠️ TURN server (can use free STUN servers for testing, but TURN needed for production)

---

## 📞 Rate Limits

- **join-queue:** 10 calls/minute per device
- **Reports:** Enforced at application level (pending implementation)
- **Authentication:** No hard limit (consider adding)

---

## 🔒 Security Notes

1. **HTTPS Required in Production** - WebRTC requires secure contexts
2. **TURN Credentials:** Expire after TTL (default 24h)
3. **JWT Tokens:** 7-day expiry, refresh before expiration
4. **Rate Limiting:** Prevents queue spam, needs expansion
5. **Report System:** Available for user safety
6. **Device Blocking:** Redis-based blocking system

---

**Generated:** October 24, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete and Verified

