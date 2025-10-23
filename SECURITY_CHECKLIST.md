# Security Checklist: OWASP & Production Hardening

## A1: Broken Authentication

### ✅ Implementation

**JWT Tokens (Short-Lived)**
- Token expiration: 5 minutes (configurable)
- Refresh token rotation: Backend maintains stateless validation
- No sensitive data in JWT payload
- Signed with HS256 (symmetric) or RS256 (asymmetric with public key rotation)

```typescript
// Backend: auth.service.ts
export async function generateToken(userId: string, expiresIn = '5m') {
  return await this.jwtService.signAsync(
    { sub: userId, iat: Date.now() },
    { expiresIn, algorithm: 'HS256' }
  );
}
```

**Device Fingerprinting**
- Generate consistent device ID from user-agent + accept-language + screen resolution
- Used for rate limiting and abuse detection
- Not PII, but helps identify repeat offenders

**Rate Limiting**
- Token bucket algorithm (configurable: 10 requests/min per IP, 20 per device)
- CAPTCHA triggering at abuse thresholds
- Exponential backoff for repeated failures

```typescript
// Backend: rate-limit.guard.ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  const identifier = `${request.ip}:${request.deviceId}`;
  
  const count = await this.redis.incr(`ratelimit:${identifier}`);
  if (count === 1) await this.redis.expire(`ratelimit:${identifier}`, 60);
  
  if (count > THRESHOLD) {
    this.metrics.recordRateLimitHit(identifier);
    throw new HttpException('Rate limited', 429);
  }
  return true;
}
```

### ✅ Configuration

- **Secret rotation**: Quarterly or on compromise
- **Token storage**: Client uses httpOnly cookies (no XSS access)
- **HTTPS-only**: All auth endpoints on TLS 1.3
- **No auth header in logs**: Redact Authorization headers in middleware

---

## A02: Cryptographic Failures

### ✅ Implementation

**TLS 1.3 Everywhere**
- All HTTP endpoints redirect to HTTPS
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Certificate pinning for mobile apps (PWA uses browser cert validation)

```typescript
// Backend: security.middleware.ts
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Upgrade-Insecure-Requests', '1');
  next();
});
```

**TURN Credentials (HMAC-Based)**
- Long-term secret stored securely (in Kubernetes Secret)
- Ephemeral credentials: username = `timestamp:userID`, password = HMAC-SHA1
- Credentials expire after 1 hour
- No credential reuse across sessions

```typescript
// Backend: turn.service.ts
generateCredentials(): TurnCredentials {
  const expiryTime = Math.floor(Date.now() / 1000) + 3600;
  const username = `${expiryTime}:user`;
  const hmac = createHmac('sha1', env.TURN_SHARED_SECRET);
  hmac.update(username);
  return {
    username,
    credential: hmac.digest('base64'),
    urls: process.env.TURN_SERVERS.split(','),
    ttl: 3600
  };
}
```

**Data at Rest**
- Redis: Optional persistence disabled in prod (use Redis cluster for HA)
- Postgres: Encrypted at rest (AWS RDS encryption, GCP Cloud SQL encryption)
- Session data TTL: All data expires (offers/answers in 30s, candidates in 60s)

**Encryption for PII (If Stored)**
- Report metadata encrypted: AES-256-GCM
- Database field-level encryption for IP addresses (tokenized)

---

## A03: Injection

### ✅ Implementation

**Input Validation**
- Class-validator on all DTOs
- Whitelist validation (no blacklist)
- Max lengths enforced: message < 500 chars, reason < 200 chars

```typescript
// Backend: dto/message.dto.ts
export class SendMessageDto {
  @IsString()
  @MaxLength(500)
  @MinLength(1)
  text: string;

  @IsUUID()
  peerId: string;
}
```

**Socket.io Message Validation**
- Events validated before processing
- Object schema checked (no recursive/nested injection)
- Profanity filter on text messages (optional)

**Query Sanitization**
- Redis: No raw user input in keys (always prefix + hash)
- SQL (if used): Parameterized queries only
- No eval() or function() constructors

```typescript
// Redis safe pattern
const sessionKey = `session:${hash(sessionId)}`; // NOT `session:${sessionId}`
```

**CORS & CSP**
- Strict CORS: Only approved origins
- Content-Security-Policy headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

```typescript
app.use(
  cors({
    origin: ['https://video-chat.example.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

---

## A04: Insecure Design

### ✅ Implementation

**Threat Modeling**
- Abuse vectors identified: spam calls, harassment, grooming, CSAM
- Mitigations: rate limiting, reporting, blocklisting, temporal analysis

**Ephemeral Design**
- No persistent user profiles (no PII)
- Sessions end → data deleted (30s TTL)
- No video/audio storage (P2P only)
- Reports stored with anonymization

**Abuse Prevention**
- Rapid matching detection: flag users who skip >50% of calls
- IP-based filtering: block known VPN/proxy providers (optional)
- Repeated reporter de-duplication: same report from X users → auto-action
- Appeal process: users can dispute blocks

---

## A05: Broken Access Control

### ✅ Implementation

**Admin Authentication**
- Only authenticated users can access /admin/* endpoints
- Admin role verified via JWT `role` claim
- Session affinity not required (stateless)

```typescript
// Backend: jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  validate(payload: any) {
    if (!payload.role || payload.role !== 'admin') {
      throw new UnauthorizedException();
    }
    return { userId: payload.sub, role: payload.role };
  }
}
```

**API Scoping**
- `/api/auth/*` - public
- `/api/signal` - authenticated (WebSocket)
- `/api/turn/credentials` - authenticated (JWT required)
- `/api/reports` - authenticated
- `/api/admin/*` - admin-only

**Device Isolation**
- No cross-device session sharing
- Device ID tied to browser fingerprint
- Token invalidation on detected anomaly

---

## A06: Vulnerable & Outdated Components

### ✅ Implementation

**Dependency Management**
- npm audit weekly
- Automated patches: semantic versioning only
- Critical patches: deployed within 24 hours
- Quarterly major updates
- Security scanning in CI/CD (npm audit, Snyk, Dependabot)

```yaml
# CI pipeline
- name: Security Scan
  run: npm audit --audit-level=moderate
```

**Image Scanning**
- Docker images scanned with Trivy
- Base images updated weekly
- Alpine Linux used for minimal attack surface

---

## A07: Identification & Authentication Failures

### ✅ Implementation

**Session Management**
- JWT tokens stored in httpOnly, Secure, SameSite cookies
- No JWT in localStorage (XSS-safe)
- Token binding: token includes device fingerprint + IP subnet

```typescript
// Frontend: api.ts
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Device-Id'] = getDeviceId();
```

**Session Invalidation**
- Logout → token blacklist (Redis cache)
- User disconnect → session cleanup (WebSocket close)
- Admin deactivation → immediate revocation (Redis INVALIDATE key)

---

## A08: Software & Data Integrity Failures

### ✅ Implementation

**Code Signing & Integrity**
- Docker images signed (Cosign or Docker Content Trust)
- Kubernetes admission controller validates signatures
- Source code signed (git tag GPG signatures)

**Supply Chain**
- Minimal dependencies: direct dependencies only
- Vendored deps scanned
- Lock file (package-lock.json) committed

---

## A09: Logging & Monitoring Failures

### ✅ Implementation

**Structured Logging**
- JSON logs with timestamp, level, requestId, message, context
- No sensitive data: tokens, passwords, credit cards
- Centralized to ELK or Cloud Logging (immutable)

```typescript
// Backend: logger.service.ts
log(message: string, context?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    requestId: context?.requestId,
    // context sanitized: no secrets
  }));
}
```

**Alerting**
- Authentication failures > 10/min → alert
- Unusual IP access patterns → alert
- Failed deployment → alert
- Pod CrashLoopBackOff → page

**Audit Trail**
- All moderation actions logged: who, what, when
- Report acceptance/rejection logged
- Block list modifications logged
- Retention: 90 days (immutable)

---

## A10: Server-Side Request Forgery (SSRF)

### ✅ Implementation

**External Requests**
- No external API calls in signal path (fast path only)
- All external URLs validated (whitelist pattern)
- Timeouts enforced (5s max)
- No DNS rebinding (fixed DNS names only)

**TURN Servers**
- TURN URLs hardcoded (no dynamic resolution)
- STUN servers vetted (coturn or similar)
- Credential validation prevents abuse

---

## Additional: GDPR & Privacy

### ✅ Implementation

**Data Minimization**
- Collect only: device ID, session length, report metadata
- No PII: no names, emails, phone numbers
- No geolocation: use region (broad geographic area)

**Right to Erasure**
- User can request data deletion (API endpoint)
- All reports & sessions deleted within 30 days
- Redis TTL handles automatic expiration

**Data Processing Agreement**
- Backend processes user data (video offers/answers) in-memory
- No persistent user profiles
- Data processor (Redis/Postgres) has DPA

**Consent & Opt-Outs**
- Opt-in for analytics (optional pixel)
- Users can disable profanity filtering
- Privacy policy linked in UI

---

## Deployment Security Checklist

### ✅ Pre-Deployment

- [ ] Secrets (JWT, TURN) generated & stored in vault (AWS Secrets Manager, GCP Secret Manager, Vault)
- [ ] TLS certificates issued (Let's Encrypt via cert-manager)
- [ ] Database encrypted at rest
- [ ] Redis passwords set (if persistence enabled)
- [ ] Admin credentials changed from defaults
- [ ] Firewall rules: only necessary ports open
- [ ] VPC/network isolation: backend in private subnet
- [ ] Load balancer with DDoS protection

### ✅ Runtime

- [ ] Secrets injected from vault (not in code/config)
- [ ] RBAC configured (Kubernetes RBAC)
- [ ] Network policies: pod-to-pod rules
- [ ] Pod security policies: no privileged pods
- [ ] Runtime scanning enabled (Falco or similar)
- [ ] Log aggregation configured
- [ ] Monitoring & alerting active
- [ ] Incident response plan documented

---

## Incident Response Playbook

### Potential Incidents

1. **Compromised JWT Secret**
   - Action: Rotate secret immediately (dual-key transition)
   - Impact: Invalidate all existing tokens (Redis blacklist)
   - Recovery: 1-2 hours

2. **TURN Server Compromise**
   - Action: Revoke credentials, deploy new TURN pods
   - Impact: New calls fail to relay (fallback to P2P)
   - Recovery: 10-15 minutes

3. **DDoS Attack**
   - Mitigation: CloudFlare/Akamai activates challenge
   - Automatic rate limiting triggers
   - Pod scaling (HPA max out)
   - Recovery: Monitor attack duration, assess revenue impact

4. **Data Breach (Redis)**
   - Action: Snapshot data, isolate cluster
   - Impact: Session data leaked (non-sensitive, TTL-based)
   - Recovery: Recreate Redis, restart backend

---

## Security Testing

### Manual Tests

1. **Authentication**:
   - Expired token rejected ✓
   - Token reuse across devices blocked ✓
   - Invalid JWT rejected ✓

2. **Injection**:
   - XSS in message: HTML/JS stripped ✓
   - SQL injection (if DB): parameterized queries ✓
   - Command injection: no shell execution ✓

3. **Access Control**:
   - Admin endpoint without auth token rejected ✓
   - User can only access own session ✓

### Automated Tests

```bash
# OWASP ZAP scan
docker run -t owasp/zap2docker-stable \
  zap-baseline.py -t http://backend:3333

# Dependency check
npm audit --audit-level=moderate

# Docker image scan
trivy image video-chat-backend:v1.0.0
```

---

## Continuous Security

- **Quarterly penetration test**: External firm
- **Monthly dependency updates**: GitHub Dependabot
- **Weekly security scans**: npm audit + Docker scanning
- **Daily log review**: alerts for anomalies
- **Annual security training**: for team
