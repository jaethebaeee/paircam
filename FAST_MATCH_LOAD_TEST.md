# FastMatch Load Testing Guide

## Overview

Load test script to verify FastMatch performance under concurrent user load.

---

## Test Scenarios

### Test 1: Basic Match Performance
**Goal**: Measure time to match 2 users
**Load**: 100 concurrent users
**Expected**: All matches within 5 seconds

```bash
npm run test:load -- --scenario=basic --users=100
```

### Test 2: Queue Saturation
**Goal**: Verify queue handles 1000+ users
**Load**: 1500 concurrent joins
**Expected**: First 1000 matched, rest rejected gracefully

```bash
npm run test:load -- --scenario=saturation --users=1500
```

### Test 3: Rate Limiting
**Goal**: Verify rate limit prevents spam
**Load**: 1 device, 20 joins in 5 seconds
**Expected**: First 10 accepted, rest rejected

```bash
npm run test:load -- --scenario=ratelimit --users=1 --spam=20
```

### Test 4: Concurrent Matches
**Goal**: Test matching performance at scale
**Load**: 1000 rapid joins
**Expected**: 500 matches in < 1 second

```bash
npm run test:load -- --scenario=concurrent --users=1000
```

### Test 5: Memory Limits
**Goal**: Verify memory doesn't grow unbounded
**Load**: 100k join/leave cycles
**Expected**: Memory stays < 100MB

```bash
npm run test:load -- --scenario=memory --cycles=100000
```

---

## Manual Load Test Script

```bash
#!/bin/bash
# fast-match-load-test.sh

HOST="http://localhost:3333"
USERS=100
CONCURRENT=10

echo "🚀 FastMatch Load Test"
echo "Users: $USERS"
echo "Concurrent: $CONCURRENT"
echo ""

# Get auth token
TOKEN=$(curl -s "$HOST/auth/token" | jq -r '.accessToken')

# Function to join fast queue
join_queue() {
  local device_id="device-$1"
  curl -s -X POST "$HOST/signaling" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"deviceId\":\"$device_id\"}" \
    -w "\n"
}

# Spawn concurrent users
echo "Spawning $USERS users..."
for i in $(seq 1 $USERS); do
  (
    for j in $(seq 1 $((i % CONCURRENT + 1))); do
      join_queue "$i" &
      sleep 0.01
    done
    wait
  ) &
done

wait

echo "✅ All users joined"
```

---

## Metrics to Monitor

### Performance Metrics
- **Match Latency**: Time from join to matched event
  - Goal: < 100ms
  - Expected: 50-80ms

- **Throughput**: Matches per second
  - Goal: 100+ matches/sec
  - Expected: 200-500 matches/sec

- **Queue Operations**: LPOP/RPUSH/LREM timing
  - Goal: < 1ms per operation
  - Expected: 0.1-0.5ms

### Resource Metrics
- **Memory Usage**:
  - Goal: < 1MB per 1000 users
  - Expected: 500KB-750KB

- **Redis Memory**:
  - 1000 users ≈ 500KB
  - 10000 users ≈ 5MB

- **CPU Usage**:
  - Goal: < 10% at 1000 concurrent
  - Expected: 5-8%

### Reliability Metrics
- **Success Rate**: % of matches completed
  - Goal: 99%+
  - Expected: 99.9%+

- **Error Rate**: % of failed joins
  - Goal: < 1%
  - Expected: 0.01%

- **Race Conditions**: None!
  - Goal: 0
  - Expected: 0

---

## Benchmark Results (Expected)

### Baseline (100 users)
```
Matches: 50
Avg Latency: 45ms
Min: 12ms
Max: 198ms
P95: 85ms
P99: 156ms
Memory: 50KB
✓ PASS
```

### Medium Load (1000 users)
```
Matches: 500
Avg Latency: 67ms
Min: 8ms
Max: 432ms
P95: 120ms
P99: 298ms
Memory: 500KB
✓ PASS
```

### High Load (5000 users)
```
Matches: 2500
Avg Latency: 145ms
Min: 15ms
Max: 1200ms
P95: 250ms
P99: 680ms
Memory: 2.5MB
✓ PASS
```

### Stress Test (10000 users)
```
Matches: 5000
Avg Latency: 287ms
Min: 20ms
Max: 2400ms
P95: 520ms
P99: 1200ms
Memory: 5MB
Queue Full Rejections: 0 (capped at 1000)
✓ PASS
```

---

## Load Test Implementation

### Using Apache Bench
```bash
# Simple sequential requests
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3333/signaling/join-fast-queue

# Results
Requests per second: 2500
Time per request: 4ms
Failed requests: 0
```

### Using Artillery
```yaml
# load-test.yml
config:
  target: "http://localhost:3333"
  phases:
    - duration: 60
      arrivalRate: 100
      name: "Ramp up"
    - duration: 120
      arrivalRate: 500
      name: "Peak load"
    - duration: 60
      arrivalRate: 100
      name: "Ramp down"

scenarios:
  - name: "Join Fast Queue"
    flow:
      - post:
          url: "/signaling/join-fast-queue"
          headers:
            Authorization: "Bearer {{token}}"
            Content-Type: "application/json"
          json:
            deviceId: "device-{{$uuid}}"
          expect:
            statusCode: 200
```

Run with:
```bash
artillery run load-test.yml
```

### Using K6
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '60s', target: 500 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const payload = JSON.stringify({
    deviceId: `device-${Math.random()}`,
  });

  const res = http.post('http://localhost:3333/signaling/join-fast-queue',
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'matched or queued': (r) => r.body.includes('matched') || r.body.includes('position'),
  });

  sleep(1);
}
```

Run with:
```bash
k6 run load-test.js
```

---

## Regression Testing

Run before each deployment:

```bash
# Unit tests
npm test -- fast-match.service.spec.ts

# Integration tests
npm test -- fast-match.integration.spec.ts

# Load test
npm run test:load -- --scenario=concurrent --users=1000

# Memory leak check
npm run test:load -- --scenario=memory --cycles=10000
```

---

## Troubleshooting

### High Latency (> 500ms)
- Check Redis latency: `redis-cli latency latest`
- Check Node.js event loop: `--max-old-space-size=4096`
- Profile with: `node --prof app.js`

### Memory Spike
- Check for connection leaks: Monitor `connectedClients` map
- Verify queue cleanup: `redis-cli LLEN fast-match:queue`
- Check session TTL: `redis-cli KEYS "fast-session:*"` should be empty after 5min

### Match Failures
- Check Redis connection: `redis-cli ping`
- Verify LPOP atomicity: Enable Redis monitor
- Check rate limiter: `redis-cli GET ratelimit:*`

### Race Conditions
- Enable Redis AOF: `appendonly yes`
- Monitor queue consistency: Sample LRANGE periodically
- Track duplicate matches: Log all session IDs

---

## Success Criteria

✅ **PASS** if:
- 99%+ of matches succeed
- 0 race conditions detected
- Latency P99 < 1000ms at 10k users
- Memory < 10MB for 10k users
- All edge cases handled gracefully

❌ **FAIL** if:
- Any race conditions detected
- > 1% failed matches
- Memory grows unbounded
- Latency P99 > 2000ms

---

## Continuous Monitoring

### Prometheus Metrics
```
fast_match_queue_size           # Current queue length
fast_match_match_latency        # Time to match
fast_match_session_count        # Active sessions
fast_match_error_rate           # Failed operations
redis_memory_usage              # Redis memory
```

### Alerting
```yaml
alerts:
  - name: QueueFull
    condition: fast_match_queue_size >= 1000
    severity: warning

  - name: HighLatency
    condition: fast_match_match_latency > 500ms
    severity: critical

  - name: MemoryLeak
    condition: redis_memory_usage > 100MB
    severity: critical
```

---

## See Also

- `FAST_MATCH_GUIDE.md` - Client integration guide
- `fast-match.service.spec.ts` - Unit test suite
- `fast-match.integration.spec.ts` - Integration test scenarios
