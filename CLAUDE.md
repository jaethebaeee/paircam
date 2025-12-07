# CLAUDE.md - AI Assistant Guide for PairCam

## Project Overview

PairCam is a production-ready random video chat application built with React, NestJS, WebRTC, and Redis. It enables anonymous 1-on-1 video connections with real-time messaging, intelligent matchmaking, and comprehensive backend infrastructure.

**Key characteristics:**
- Monorepo with two packages: `backend` (NestJS) and `frontend` (React + Vite)
- TypeScript throughout (version 5.2)
- WebRTC for peer-to-peer video/audio
- Redis for session management, matchmaking queue, and rate limiting
- JWT authentication with 5-minute token expiration

## Tech Stack

### Backend (packages/backend)
- **Framework:** NestJS 10.2
- **WebSocket:** Socket.io 4.7
- **Auth:** JWT + Passport.js
- **Database:** TypeORM with PostgreSQL (optional)
- **Cache:** Redis 4.6
- **Monitoring:** Prometheus (prom-client), Winston logging
- **Payments:** Stripe 19.1

### Frontend (packages/frontend)
- **Framework:** React 18.2 with React Router 6
- **Build:** Vite 5.0
- **Styling:** Tailwind CSS 3.3
- **State:** Zustand 4.4 + React Context
- **Animations:** Framer Motion 11
- **UI:** Heroicons, Flowbite, Headless UI
- **Notifications:** Sonner (toast)

## Project Structure

```
paircam/
├── packages/
│   ├── backend/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/              # JWT authentication
│   │   │   ├── signaling/         # WebSocket gateway & matchmaking
│   │   │   ├── redis/             # Redis client & pub/sub
│   │   │   ├── turn/              # TURN server credentials
│   │   │   ├── reporting/         # Abuse reporting
│   │   │   ├── monitoring/        # Prometheus metrics
│   │   │   ├── analytics/         # Match quality tracking
│   │   │   ├── payments/          # Stripe integration
│   │   │   ├── subscriptions/     # Premium features
│   │   │   ├── users/             # User entity & service
│   │   │   ├── health/            # Health checks
│   │   │   ├── app.module.ts      # Root module
│   │   │   ├── main.ts            # Bootstrap entry
│   │   │   └── env.ts             # Environment config
│   │   └── package.json
│   │
│   └── frontend/                   # React frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── VideoChat/     # Main video chat UI
│       │   │   ├── ui/            # Reusable components
│       │   │   └── legal/         # Terms, Privacy pages
│       │   ├── hooks/             # useWebRTC, useSignaling, useAuth
│       │   ├── contexts/          # AuthContext
│       │   ├── utils/             # Helpers & security
│       │   ├── config/            # App configuration
│       │   ├── App.tsx            # Root component
│       │   └── main.tsx           # Entry point
│       └── package.json
│
├── docker-compose.yml              # Local dev (Redis, Coturn, Backend)
├── docker-compose.prod.yml         # Production deployment
├── k8s/                            # Kubernetes manifests
├── scripts/                        # Deployment scripts
├── install-all.sh                  # Setup script
├── start-all.sh                    # Start all services
└── stop-all.sh                     # Stop all services
```

## Development Commands

### Backend (from packages/backend)
```bash
npm run dev          # Start with hot-reload (ts-node)
npm run build        # Compile TypeScript
npm run start        # Run compiled JS
npm run test         # Run Jest tests
npm run test:watch   # Watch mode
npm run test:cov     # Coverage report
npm run lint         # ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier formatting
npm run typecheck    # Type checking only
```

### Frontend (from packages/frontend)
```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run Vitest
npm run test:ui      # Vitest UI dashboard
npm run test:cov     # Coverage report
npm run lint         # ESLint
npm run format       # Prettier formatting
npm run generate:sitemap  # Generate sitemap
```

### Root-level scripts
```bash
./install-all.sh     # Install all dependencies
./start-all.sh       # Start Redis, Backend, Frontend
./stop-all.sh        # Stop all services
./test-system.sh     # Full system test
```

### Docker
```bash
docker-compose up -d       # Start local stack
docker-compose logs -f     # View logs
docker-compose down        # Stop services
```

## Code Conventions

### Backend (NestJS)
- **Module-based architecture:** Each feature has its own module (AuthModule, SignalingModule, etc.)
- **Dependency injection:** Use constructor injection
- **Naming:** `*.service.ts`, `*.controller.ts`, `*.module.ts`, `*.gateway.ts`
- **DTOs:** Use class-validator decorators for validation
- **Guards:** JwtAuthGuard for protected routes
- **Tests:** Place in `__tests__/` directories, use `*.spec.ts` or `*.test.ts`

```typescript
// Service pattern example
@Injectable()
export class ExampleService {
  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService
  ) {}
}
```

### Frontend (React)
- **Functional components:** Use hooks, no class components
- **Custom hooks:** Extract reusable logic to `hooks/` directory
- **State management:** Zustand for global, Context for auth, useState for local
- **Styling:** Tailwind CSS utility classes
- **Naming:** PascalCase for components, camelCase for hooks
- **Tests:** Vitest with React Testing Library

```typescript
// Hook pattern example
export function useExample() {
  const [state, setState] = useState<Type>(initial);
  // Logic here
  return { state, actions };
}
```

### TypeScript
- Strict mode enabled
- Use interfaces for object shapes
- Avoid `any`, prefer `unknown` when type is uncertain
- Use type guards for narrowing

## Key Files Reference

### Backend
| File | Purpose |
|------|---------|
| `src/main.ts` | Server bootstrap, security middleware |
| `src/app.module.ts` | Root module, imports all features |
| `src/env.ts` | Environment configuration |
| `src/signaling/signaling.gateway.ts` | WebSocket event handling |
| `src/signaling/matchmaking.service.ts` | User matching algorithm |
| `src/redis/redis.service.ts` | Redis client wrapper |
| `src/auth/auth.service.ts` | JWT token handling |

### Frontend
| File | Purpose |
|------|---------|
| `src/main.tsx` | Entry point, security checks |
| `src/App.tsx` | Root component, routing |
| `src/hooks/useWebRTC.ts` | WebRTC peer connection |
| `src/hooks/useSignaling.ts` | Socket.io signaling |
| `src/contexts/AuthContext.tsx` | Auth state management |
| `src/components/VideoChat/index.tsx` | Main video chat UI |

## Architecture Decisions

1. **WebRTC P2P with TURN fallback:** Direct peer connections reduce server load; Coturn handles NAT traversal
2. **Redis for matchmaking:** O(n log n) queue-based matching with region/language awareness
3. **Stateless backend:** All state in Redis enables horizontal scaling
4. **Short-lived JWT (5 min):** Security without server-side session storage
5. **Monorepo structure:** Shared tooling and simplified deployment
6. **Pre-rendering (react-snap):** SEO optimization for static pages

## Environment Configuration

### Backend (.env)
```env
NODE_ENV=development
PORT=3333
JWT_SECRET=your-secret-key
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ORIGINS=http://localhost:5173
TURN_SERVER_URL=turn:your-server:3478
TURN_SHARED_SECRET=your-turn-secret
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3333
VITE_WS_URL=ws://localhost:3333
```

## Common Tasks

### Adding a new API endpoint (Backend)
1. Create/update service in appropriate module (`src/[feature]/[feature].service.ts`)
2. Add controller method (`src/[feature]/[feature].controller.ts`)
3. Create DTO with validation decorators if needed
4. Add to module providers/controllers if new files
5. Run tests: `npm run test`

### Adding a new WebSocket event (Backend)
1. Add handler in `src/signaling/signaling.gateway.ts`
2. Use `@SubscribeMessage('event-name')` decorator
3. Add corresponding client-side handler in `useSignaling.ts`

### Adding a new React component (Frontend)
1. Create component in `src/components/`
2. Use TypeScript interfaces for props
3. Style with Tailwind classes
4. Add to parent component or route
5. Write tests in `__tests__/` directory

### Adding a new custom hook (Frontend)
1. Create hook in `src/hooks/`
2. Follow naming convention: `use[Name].ts`
3. Return object with state and actions
4. Export from hooks index if applicable

## Testing

### Backend
- **Framework:** Jest with ts-jest
- **Location:** `__tests__/` directories
- **Run:** `npm run test` or `npm run test:watch`
- **Coverage:** `npm run test:cov`

### Frontend
- **Framework:** Vitest with React Testing Library
- **Location:** `__tests__/` directories
- **Run:** `npm run test` or `npm run test:ui`
- **Coverage:** `npm run test:cov`

## Service Endpoints

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3333
- **Health check:** http://localhost:3333/health
- **Metrics:** http://localhost:3333/metrics
- **WebSocket:** ws://localhost:3333

## Important Notes

1. **Security:** Never commit secrets. Use environment variables for JWT_SECRET, TURN credentials, Stripe keys
2. **CORS:** Update `CORS_ORIGINS` for production domains
3. **HTTPS:** Required in production for WebRTC media access
4. **Redis:** Required for the application to function (matchmaking, sessions, rate limiting)
5. **Node version:** Requires Node.js 18.18.0+ and npm 9+

## Debugging Tips

- **Backend logs:** Check console output or Winston logs
- **Frontend:** Browser DevTools console and Network tab
- **WebSocket issues:** Check signaling gateway logs and socket.io events
- **Redis:** Use `redis-cli` to inspect keys (`KEYS *`, `LLEN matchmaking:queue`)
- **WebRTC:** Check browser's `chrome://webrtc-internals/` for connection stats
