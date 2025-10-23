# Monorepo Structure: Production-Ready Video Chat Service

```
omegle-clone/
├── README.md                                    # Quick start guide
├── SYSTEM_ARCHITECTURE.md                       # Architecture diagrams & design
├── SECURITY_CHECKLIST.md                        # Security implementation details
├── MONITORING.md                                # Observability setup & dashboards
├── RUNBOOK.md                                   # Operational runbook & troubleshooting
├── COST_ESTIMATE.md                             # Infrastructure cost analysis
│
├── .github/
│   └── workflows/
│       ├── ci.yml                               # Linting, testing, image build/push
│       ├── load-test.yml                        # Run load tests on schedule
│       └── security-scan.yml                    # SAST & vulnerability scanning
│
├── docker-compose.yml                           # Local dev environment (all services)
├── Dockerfile.backend                           # Backend (NestJS) image
├── Dockerfile.frontend                          # Frontend (React) image
├── Dockerfile.coturn                            # Coturn builder image
├── Dockerfile.admin                             # Admin UI image
│
├── packages/
│   │
│   ├── backend/                                 # NestJS signaling server
│   │   ├── package.json                         # Dependencies, scripts
│   │   ├── tsconfig.json                        # TypeScript config
│   │   ├── jest.config.js                       # Jest test config
│   │   ├── src/
│   │   │   ├── main.ts                          # Entry point
│   │   │   ├── app.module.ts                    # Root module
│   │   │   ├── env.ts                           # Environment config (validated)
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.service.ts          # JWT generation/validation
│   │   │   │   │   ├── jwt.strategy.ts          # Passport JWT strategy
│   │   │   │   │   ├── jwt-auth.guard.ts        # Auth guard
│   │   │   │   │   └── auth.controller.ts       # /auth/token endpoint
│   │   │   │   │
│   │   │   │   ├── signaling/
│   │   │   │   │   ├── signaling.module.ts
│   │   │   │   │   ├── signaling.gateway.ts     # Socket.io event handlers
│   │   │   │   │   ├── signaling.service.ts     # Core logic (matching, relay)
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── offer.dto.ts
│   │   │   │   │   │   ├── answer.dto.ts
│   │   │   │   │   │   └── candidate.dto.ts
│   │   │   │   │   └── tests/
│   │   │   │   │       ├── signaling.service.spec.ts
│   │   │   │   │       └── signaling.gateway.spec.ts
│   │   │   │   │
│   │   │   │   ├── matching/
│   │   │   │   │   ├── matching.module.ts
│   │   │   │   │   ├── matching.service.ts      # Queue logic & pair finding
│   │   │   │   │   └── matching.service.spec.ts
│   │   │   │   │
│   │   │   │   ├── reporting/
│   │   │   │   │   ├── reporting.module.ts
│   │   │   │   │   ├── reporting.service.ts     # Report submission & storage
│   │   │   │   │   ├── reporting.controller.ts  # POST /report
│   │   │   │   │   ├── report.entity.ts         # DB model
│   │   │   │   │   └── reporting.service.spec.ts
│   │   │   │   │
│   │   │   │   ├── moderation/
│   │   │   │   │   ├── moderation.module.ts
│   │   │   │   │   ├── moderation.service.ts    # Block list, abuse detection
│   │   │   │   │   ├── moderation.controller.ts # Admin endpoints
│   │   │   │   │   └── profanity-filter.ts      # Text filtering (optional ML)
│   │   │   │   │
│   │   │   │   ├── turn/
│   │   │   │   │   ├── turn.module.ts
│   │   │   │   │   ├── turn.service.ts          # Credential generation (HMAC)
│   │   │   │   │   ├── turn.controller.ts       # POST /turn/credentials
│   │   │   │   │   └── turn.service.spec.ts
│   │   │   │   │
│   │   │   │   ├── metrics/
│   │   │   │   │   ├── metrics.module.ts
│   │   │   │   │   ├── metrics.service.ts       # Prometheus metrics collection
│   │   │   │   │   └── metrics.controller.ts    # GET /metrics
│   │   │   │   │
│   │   │   │   └── health/
│   │   │   │       ├── health.controller.ts     # GET /health (k8s probes)
│   │   │   │       └── health.service.ts
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts # Global exception handling
│   │   │   │   ├── guards/
│   │   │   │   │   ├── rate-limit.guard.ts      # Token bucket rate limiter
│   │   │   │   │   └── captcha.guard.ts         # CAPTCHA on abuse
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── request-id.middleware.ts # Trace ID injection
│   │   │   │   │   └── security.middleware.ts   # CORS, headers, CSP
│   │   │   │   ├── decorators/
│   │   │   │   │   └── device-fingerprint.ts    # Extract device ID from request
│   │   │   │   └── constants/
│   │   │   │       └── app.constants.ts         # Magic numbers, TTLs
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── redis.service.ts             # Redis client wrapper
│   │   │   │   ├── logger.service.ts            # Structured logging
│   │   │   │   ├── metrics.service.ts           # Prometheus client
│   │   │   │   ├── otel.service.ts              # OpenTelemetry setup
│   │   │   │   └── database.service.ts          # Optional Postgres integration
│   │   │   │
│   │   │   └── config/
│   │   │       ├── database.config.ts
│   │   │       ├── redis.config.ts
│   │   │       ├── jwt.config.ts
│   │   │       └── otel.config.ts
│   │   │
│   │   ├── test/
│   │   │   ├── jest.setup.ts                    # Test environment
│   │   │   └── fixtures/
│   │   │       ├── mock-redis.ts
│   │   │       └── test-utils.ts
│   │   │
│   │   └── dist/                                # Compiled output
│   │
│   ├── frontend/                                # React + Vite app
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts                     # Unit test config
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   ├── index.html                           # Entry HTML
│   │   ├── src/
│   │   │   ├── main.tsx                         # React entry
│   │   │   ├── App.tsx                          # Root component
│   │   │   ├── vite-env.d.ts                    # Vite type defs
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useWebRTC.ts                 # Peer connection logic
│   │   │   │   ├── useSignaling.ts              # Socket.io integration
│   │   │   │   ├── useDeviceSelection.ts        # Camera/mic enumeration
│   │   │   │   ├── usePeerState.ts              # Connection state mgmt
│   │   │   │   └── useSessionStorage.ts         # Local session cache
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── Layout/
│   │   │   │   │   └── MainLayout.tsx
│   │   │   │   ├── Landing/
│   │   │   │   │   ├── LandingPage.tsx          # "Start Call" CTA
│   │   │   │   │   └── SettingsModal.tsx        # Camera, language, privacy
│   │   │   │   ├── Call/
│   │   │   │   │   ├── CallScreen.tsx           # Main call UI
│   │   │   │   │   ├── VideoContainer.tsx       # <video> elements
│   │   │   │   │   ├── ControlPanel.tsx         # Buttons (mute, camera, next)
│   │   │   │   │   ├── ChatOverlay.tsx          # Text chat & reactions
│   │   │   │   │   ├── ConnectionStatus.tsx     # Connection state modal
│   │   │   │   │   └── ReportModal.tsx          # Report flow
│   │   │   │   ├── Common/
│   │   │   │   │   ├── DeviceSelector.tsx       # Dropdown for camera/mic
│   │   │   │   │   ├── IconButton.tsx           # Reusable icon button
│   │   │   │   │   ├── Toast.tsx                # Notification UI
│   │   │   │   │   └── ErrorBoundary.tsx        # React error boundary
│   │   │   │   └── Accessibility/
│   │   │   │       ├── ScreenReaderAnnounce.tsx # Live region updates
│   │   │   │       └── KeyboardNav.tsx          # Keyboard event handler
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── api.ts                       # REST client (token refresh)
│   │   │   │   ├── webrtc.ts                    # WebRTC peer logic
│   │   │   │   ├── signal-client.ts             # Socket.io wrapper
│   │   │   │   ├── device-fingerprint.ts        # Generate consistent device ID
│   │   │   │   └── permissions.ts               # Check camera/mic perms
│   │   │   │
│   │   │   ├── store/
│   │   │   │   ├── useAppStore.ts               # Zustand or Context (global state)
│   │   │   │   ├── appSlice.ts                  # Settings, theme
│   │   │   │   └── sessionSlice.ts              # Session ID, peer ID
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── webrtc.ts                    # RTCIceCandidate, RTCSessionDescription
│   │   │   │   ├── signaling.ts                 # Socket event types
│   │   │   │   ├── api.ts                       # REST response types
│   │   │   │   └── ui.ts                        # Component prop types
│   │   │   │
│   │   │   ├── utils/
│   │   │   │   ├── analytics.ts                 # Event tracking (optional)
│   │   │   │   ├── logger.ts                    # Client-side logging
│   │   │   │   ├── constants.ts                 # Endpoints, timeouts
│   │   │   │   └── error-handler.ts             # Error parsing & reporting
│   │   │   │
│   │   │   ├── styles/
│   │   │   │   ├── globals.css                  # Tailwind + custom CSS
│   │   │   │   └── animations.css               # Micro-animations
│   │   │   │
│   │   │   └── __tests__/
│   │   │       ├── hooks/
│   │   │       │   ├── useWebRTC.spec.ts
│   │   │       │   └── useSignaling.spec.ts
│   │   │       ├── components/
│   │   │       │   ├── CallScreen.spec.tsx
│   │   │       │   └── ReportModal.spec.tsx
│   │   │       └── services/
│   │   │           └── webrtc.spec.ts
│   │   │
│   │   ├── dist/                                # Vite build output
│   │   └── coverage/                            # Test coverage report
│   │
│   ├── admin/                                   # React admin dashboard
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx                # Session overview
│   │   │   │   ├── Reports.tsx                  # Report queue & actions
│   │   │   │   ├── BlockList.tsx                # IP/device block management
│   │   │   │   ├── Analytics.tsx                # Call metrics
│   │   │   │   └── Appeals.tsx                  # User appeals
│   │   │   ├── components/
│   │   │   │   ├── SessionTable.tsx
│   │   │   │   ├── ReportViewer.tsx
│   │   │   │   └── ActionModal.tsx
│   │   │   ├── services/
│   │   │   │   └── admin-api.ts                 # Admin REST client
│   │   │   └── hooks/
│   │   │       └── useAdminData.ts              # Polling/WebSocket for real-time
│   │   └── dist/
│   │
│   └── shared/                                  # Shared TypeScript types & utils
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── types/
│       │   │   ├── events.ts                    # Socket.io event types
│       │   │   ├── models.ts                    # Session, Report, Block entities
│       │   │   └── api.ts                       # REST request/response DTOs
│       │   └── utils/
│       │       ├── validation.ts                # Input validation helpers
│       │       └── constants.ts                 # Shared constants
│       └── dist/
│
├── infrastructure/
│   ├── docker/
│   │   ├── coturn/
│   │   │   ├── Dockerfile                       # Coturn builder
│   │   │   ├── turnserver.conf.template         # Config template
│   │   │   └── credential-generator.sh          # HMAC cred script
│   │   │
│   │   ├── nginx/                               # Optional: Reverse proxy
│   │   │   ├── Dockerfile
│   │   │   └── nginx.conf
│   │   │
│   │   └── postgres/
│   │       ├── Dockerfile                       # Optional: Postgres base
│   │       └── init.sql                         # Schema for reports, blocks
│   │
│   ├── kubernetes/
│   │   ├── namespace.yaml                       # Create k8s namespace
│   │   ├── configmap.yaml                       # App config (non-secrets)
│   │   ├── secrets.yaml                         # Example secrets template
│   │   ├── redis/
│   │   │   ├── redis-deployment.yaml            # Redis cluster
│   │   │   └── redis-service.yaml
│   │   ├── backend/
│   │   │   ├── backend-deployment.yaml          # NestJS signaling
│   │   │   ├── backend-service.yaml             # ClusterIP service
│   │   │   ├── backend-hpa.yaml                 # Horizontal Pod Autoscaler
│   │   │   └── backend-pdb.yaml                 # Pod Disruption Budget
│   │   ├── frontend/
│   │   │   ├── frontend-deployment.yaml         # React app (static + CDN)
│   │   │   └── frontend-service.yaml
│   │   ├── coturn/
│   │   │   ├── coturn-deployment.yaml
│   │   │   ├── coturn-service.yaml              # LoadBalancer or NodePort
│   │   │   └── coturn-hpa.yaml
│   │   ├── admin/
│   │   │   ├── admin-deployment.yaml
│   │   │   └── admin-service.yaml
│   │   ├── monitoring/
│   │   │   ├── prometheus-deployment.yaml
│   │   │   ├── prometheus-configmap.yaml
│   │   │   ├── grafana-deployment.yaml
│   │   │   └── grafana-datasource.yaml
│   │   └── ingress/
│   │       ├── ingress.yaml                     # Main Ingress + TLS cert
│   │       └── cert-issuer.yaml                 # cert-manager issuer
│   │
│   ├── terraform/                               # (Optional) IaC
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── gcp/
│   │   │   └── gke-cluster.tf
│   │   └── aws/
│   │       └── eks-cluster.tf
│   │
│   └── scripts/
│       ├── local-setup.sh                       # Docker-compose helper
│       ├── deploy.sh                            # K8s deployment helper
│       ├── gen-turn-creds.sh                    # TURN credential generator
│       ├── load-test.sh                         # Run k6 load test
│       └── backup-reports.sh                    # Database backup script
│
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml                       # Prometheus config
│   ├── grafana/
│   │   ├── datasources/
│   │   │   └── prometheus-ds.yaml               # Prometheus data source
│   │   └── dashboards/
│   │       ├── overview.json                    # Session overview
│   │       ├── performance.json                 # Latency, ICE, TURN %
│   │       ├── errors.json                      # Error rates & types
│   │       └── moderation.json                  # Reports & blocks
│   │
│   ├── otel/
│   │   ├── otel-collector-config.yaml           # Collector config
│   │   └── jaeger-deployment.yaml               # (Optional) Jaeger backend
│   │
│   └── alerts/
│       └── alerting-rules.yaml                  # Prometheus alert rules
│
├── tests/
│   ├── e2e/
│   │   ├── call-flow.spec.ts                    # Playwright: full call scenario
│   │   ├── matching.spec.ts                     # Test queue matching
│   │   ├── reporting.spec.ts                    # Report submission & moderation
│   │   └── playwright.config.ts
│   ├── load/
│   │   ├── scenarios.js                         # k6 load test scenarios
│   │   ├── thresholds.js                        # SLO definitions
│   │   └── run.sh                               # Execute load test
│   └── integration/
│       ├── signaling.integration.spec.ts        # Backend signaling test
│       └── redis.integration.spec.ts            # Redis integration test
│
├── scripts/
│   ├── generate-env.sh                          # Create .env files
│   ├── validate-config.sh                       # Check config validity
│   ├── health-check.sh                          # Poll /health endpoints
│   └── rollback.sh                              # Rollback deployment
│
├── docs/
│   ├── API.md                                   # REST & Socket.io API spec
│   ├── DEVELOPER_GUIDE.md                       # Getting started for devs
│   ├── MODERATION_GUIDE.md                      # How to handle reports
│   ├── DEPLOYMENT_GUIDE.md                      # Step-by-step K8s deploy
│   ├── DISASTER_RECOVERY.md                     # DR procedures
│   └── FAQ.md                                   # Common questions
│
├── .env.example                                 # Example environment file
├── .dockerignore
├── .gitignore
├── .prettierrc
├── .eslintrc.json
├── package.json                                 # Root workspace (pnpm/yarn)
├── pnpm-workspace.yaml                          # or yarn/lerna config
├── turbo.json                                   # (Optional) Turborepo config
└── LICENSE                                      # MIT or similar

```

## File Descriptions

### Core Files

| File | Purpose |
|------|---------|
| `README.md` | Quick-start, local dev setup with docker-compose, K8s deploy steps |
| `SYSTEM_ARCHITECTURE.md` | Diagrams, component descriptions, data flows |
| `SECURITY_CHECKLIST.md` | OWASP mapping, security implementation |
| `MONITORING.md` | Prometheus/Grafana setup, dashboards, SLOs |
| `RUNBOOK.md` | Troubleshooting, incident response, rollback procedures |
| `COST_ESTIMATE.md` | Resource sizing & monthly cost estimates (dev/small/medium) |

### Backend (`packages/backend/`)

- **Core**: `main.ts`, `app.module.ts` (NestJS entry & configuration)
- **Modules**: Organized by feature (auth, signaling, matching, reporting, moderation, TURN, metrics)
- **Services**: Redis, logger, Prometheus, OpenTelemetry integrations
- **Tests**: Jest unit & integration tests with mock Redis

### Frontend (`packages/frontend/`)

- **Hooks**: WebRTC peer logic, Socket.io signaling, device selection
- **Components**: Landing, call screen, chat, reporting UI
- **Services**: API client, WebRTC utilities, device fingerprinting
- **Store**: Global state (Zustand or Context)
- **Tests**: Vitest unit & Playwright E2E tests

### Admin UI (`packages/admin/`)

- Dashboard with session monitoring & heatmaps
- Report queue with accept/reject actions
- Block list management with bulk operations
- Real-time updates via polling or WebSocket

### Infrastructure

- **Docker**: Dockerfiles for each service + docker-compose
- **Kubernetes**: Deployments, Services, HPA, Ingress, ConfigMaps, Secrets
- **Terraform**: (Optional) IaC for GCP GKE or AWS EKS
- **Scripts**: Helper scripts for deployment, health checks, load testing

### Monitoring

- **Prometheus**: Metrics scraping config
- **Grafana**: Pre-built dashboards (overview, performance, errors, moderation)
- **OpenTelemetry**: Tracing setup (optional)
- **Alerting**: Prometheus alert rules for SLO violations

### Testing

- **E2E**: Playwright tests for full call flow, matching, reporting
- **Load**: k6 scenarios with SLO thresholds
- **Integration**: Backend-only tests (Redis, socket events)

