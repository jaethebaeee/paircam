# Module Dependencies Map

This document outlines the dependency relationships between all modules in the backend.

## Module Hierarchy

```
AppModule (Root)
├── ConfigModule (Global)
├── JwtModule (Global via AuthModule)
├── PassportModule (Global via AuthModule)
├── LoggerModule (Global)
├── RedisModule (Global)
├── AuthModule (Global)
│   ├── AuthService
│   ├── JwtStrategy
│   ├── JwtAuthGuard
│   └── AuthController
├── SignalingModule
│   ├── SignalingGateway (depends on: RedisService, MatchmakingService, AuthService)
│   ├── MatchmakingService (depends on: RedisService, SignalingGateway, LoggerService)
│   └── imports: AuthModule (forwardRef)
├── TurnModule
│   ├── TurnService (depends on: LoggerService)
│   ├── TurnController (depends on: TurnService, JwtAuthGuard)
│   └── imports: AuthModule
├── ReportingModule
│   ├── ReportingService (depends on: RedisService, LoggerService)
│   ├── ReportingController (depends on: ReportingService, JwtAuthGuard)
│   └── imports: AuthModule
├── MonitoringModule
│   ├── MetricsService (depends on: LoggerService)
│   └── MetricsController (depends on: MetricsService)
└── HealthController (depends on: Public decorator from AuthModule)
```

## Circular Dependencies Resolved

### SignalingGateway ↔ MatchmakingService

**Problem:** Both services depend on each other
- SignalingGateway needs MatchmakingService to add users to queue
- MatchmakingService needs SignalingGateway to notify matched users

**Solution:** Use `forwardRef()` in both constructors
```typescript
// In SignalingGateway
constructor(
  @Inject(forwardRef(() => MatchmakingService))
  private readonly matchmakingService: MatchmakingService,
)

// In MatchmakingService
constructor(
  @Inject(forwardRef(() => SignalingGateway))
  private readonly signalingGateway: SignalingGateway,
)
```

## Global Modules

These modules are marked as `@Global()` and are available throughout the application:

1. **LoggerModule** - Provides LoggerService
2. **RedisModule** - Provides RedisService
3. **AuthModule** - Provides AuthService, JwtAuthGuard, JwtStrategy

## Module Imports Summary

| Module | Imports | Exports |
|--------|---------|---------|
| AppModule | All modules | - |
| LoggerModule | - | LoggerService |
| RedisModule | - | RedisService |
| AuthModule | JwtModule, PassportModule | AuthService, JwtAuthGuard, JwtStrategy |
| SignalingModule | AuthModule (forwardRef) | SignalingGateway, MatchmakingService |
| TurnModule | AuthModule | TurnService |
| ReportingModule | AuthModule | ReportingService |
| MonitoringModule | - | MetricsService |

## Public Routes

Routes that don't require JWT authentication (using `@Public()` decorator):

- `POST /auth/token` - Generate JWT token
- `GET /health` - Health check
- `GET /health/ready` - Readiness check
- `GET /metrics` - Prometheus metrics

## Protected Routes

All other routes require JWT authentication via `JwtAuthGuard`:

- `POST /auth/refresh` - Refresh token
- `GET /auth/verify` - Verify token
- `POST /turn/credentials` - Get TURN credentials
- `POST /reports` - Submit report
- `GET /reports` - List reports
- `POST /reports/moderate` - Moderate report
- WebSocket connections at `/signaling` namespace

## Dependency Injection Flow

1. **Application Bootstrap**
   - NestFactory creates AppModule
   - Global modules (Logger, Redis, Auth) are initialized
   - All other modules can inject global services

2. **WebSocket Connection**
   - Client connects to SignalingGateway
   - Gateway injects AuthService to validate JWT
   - Gateway injects RedisService to check blocklist
   - Gateway injects MatchmakingService to add to queue

3. **Matchmaking Process**
   - MatchmakingService uses RedisService for queue operations
   - When match is found, calls SignalingGateway.notifyMatch()
   - SignalingGateway emits events to both clients

## Common Injection Patterns

### Injecting LoggerService
```typescript
constructor(private readonly logger: LoggerService) {}
```

### Injecting RedisService
```typescript
constructor(private readonly redisService: RedisService) {}
```

### Injecting AuthService
```typescript
constructor(private readonly authService: AuthService) {}
```

### Using JwtAuthGuard
```typescript
@UseGuards(JwtAuthGuard)
@Post('endpoint')
async protectedEndpoint(@Req() req: any) {
  const deviceId = req.user.deviceId;
  // ...
}
```

### Making Route Public
```typescript
@Public()
@Get('endpoint')
async publicEndpoint() {
  // No authentication required
}
```

## Troubleshooting

### "Cannot resolve dependency" errors
- Ensure the service is provided in a module
- Check that the module is imported in AppModule or the consuming module
- For circular dependencies, use `forwardRef()`

### "No provider for X" errors
- Check if the module exporting X is imported
- Verify the service is listed in the module's `providers` array
- Ensure the module exports the service

### WebSocket connection issues
- Verify JWT token is sent in Authorization header
- Check CORS configuration in SignalingGateway
- Ensure Redis is running and accessible
