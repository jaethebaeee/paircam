# Monitoring & Observability: Dashboards, Metrics, and SLOs

## A. Prometheus Configuration

### prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'video-chat'
    env: 'production'

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:9090']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'backend-${REPLICA:-1}'

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'kubernetes'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### Prometheus Queries (PromQL)

**Active Connections (Real-Time)**
```promql
rate(connections_total[1m])
```

**Signaling Latency (p95)**
```promql
histogram_quantile(0.95, rate(signaling_latency_ms_bucket[5m]))
```

**Matching Latency (p99)**
```promql
histogram_quantile(0.99, rate(matching_latency_ms_bucket[5m]))
```

**ICE Connection Success Rate**
```promql
rate(ice_connected_total[5m]) / rate(ice_attempted_total[5m])
```

**TURN Usage %**
```promql
rate(turn_relay_total[5m]) / rate(connections_completed_total[5m])
```

**Error Rate**
```promql
rate(errors_total[5m])
```

**Pod Availability**
```promql
up{job="backend"}
```

---

## B. Grafana Dashboards

### Dashboard 1: Overview

**Panels:**
1. **Active Sessions** (Gauge)
   - Query: `connections_total` (current value)
   - Threshold: 100, 500, 1000

2. **Calls/Minute** (Graph)
   - Query: `rate(sessions_created_total[1m])`

3. **Match Latency (p95)** (Graph)
   - Query: `histogram_quantile(0.95, rate(matching_latency_ms_bucket[5m]))`
   - Alert: > 5s (red), > 3s (yellow)

4. **Connection Status** (Pie Chart)
   - Queries:
     - Connected: `up{job="backend"}`
     - Disconnected: `down{job="backend"}`

5. **Pod Resource Usage** (Stacked Graph)
   - Memory: `container_memory_usage_bytes`
   - CPU: `rate(container_cpu_usage_seconds_total[5m])`

### Dashboard 2: Performance

**Panels:**
1. **Signaling Latency Histogram** (Heatmap)
   - Query: `rate(signaling_latency_ms_bucket[5m])`
   - Shows p50, p95, p99

2. **ICE Connection Success** (Graph)
   - Query: `rate(ice_connected_total[5m]) / rate(ice_attempted_total[5m])`
   - Alert: < 95% (yellow), < 90% (red)

3. **TURN Usage % (Line)**
   - Query: `rate(turn_relay_total[5m]) / rate(connections_completed_total[5m])`
   - Target: < 15%

4. **Average Session Duration** (Stat)
   - Query: `avg(session_duration_seconds_bucket)`

5. **WebRTC Candidate Count** (Graph)
   - Query: `rate(ice_candidate_total[5m])`

### Dashboard 3: Errors & Issues

**Panels:**
1. **Error Rate** (Graph)
   - Query: `rate(errors_total[5m]) by (type)`
   - Types: auth_failed, connection_timeout, ice_failed, offer_expired

2. **Rate Limit Hits** (Counter)
   - Query: `rate(ratelimit_hits_total[1m])`

3. **CAPTCHA Challenges** (Graph)
   - Query: `rate(captcha_challenge_total[5m])`

4. **Failed Matches** (Graph)
   - Query: `rate(matching_failed_total[5m])`

5. **Pod Restarts** (Graph)
   - Query: `rate(container_last_seen{container_name!="POD"}[5m])`

### Dashboard 4: Moderation

**Panels:**
1. **Reports/Hour** (Graph)
   - Query: `rate(reports_submitted_total[1h])`

2. **Report Queue Size** (Gauge)
   - Query: `reports_pending_total`

3. **Accepted vs Rejected** (Pie)
   - Queries:
     - Accepted: `increase(reports_accepted_total[24h])`
     - Rejected: `increase(reports_rejected_total[24h])`

4. **Most Common Reasons** (Bar)
   - Query: `topk(5, reports_by_reason_total)`

5. **Blocked Users Count** (Stat)
   - Query: `blocklist_size_total`

---

## C. Alert Rules (Prometheus AlertManager)

### alerting-rules.yaml

```yaml
groups:
  - name: video_chat_alerts
    interval: 15s
    rules:
      # SLO: Signaling latency p95 < 200ms
      - alert: HighSignalingLatency
        expr: histogram_quantile(0.95, rate(signaling_latency_ms_bucket[5m])) > 500
        for: 5m
        annotations:
          severity: critical
          summary: "Signaling latency high: {{ $value }}ms"
          action: "Check backend logs, scale up if CPU > 80%"

      # SLO: ICE success >= 95%
      - alert: LowICESuccessRate
        expr: rate(ice_connected_total[5m]) / rate(ice_attempted_total[5m]) < 0.90
        for: 5m
        annotations:
          severity: warning
          summary: "ICE success rate: {{ $value }}%"
          action: "Check TURN connectivity, verify credentials"

      # SLO: Matching latency p95 < 5s
      - alert: HighMatchingLatency
        expr: histogram_quantile(0.95, rate(matching_latency_ms_bucket[5m])) > 5000
        for: 5m
        annotations:
          severity: warning
          summary: "Matching latency: {{ $value }}ms"
          action: "Check Redis performance, increase backend replicas"

      # Pod Crash Loop
      - alert: PodCrashLoop
        expr: increase(container_last_seen{container_name!="POD"}[5m]) > 5
        for: 1m
        annotations:
          severity: critical
          summary: "Pod {{ $labels.pod_name }} crash looping"
          action: "Check logs: kubectl logs <pod>"

      # High Error Rate
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.01  # >1%
        for: 5m
        annotations:
          severity: warning
          summary: "Error rate: {{ $value }}"
          action: "Check application logs for error patterns"

      # TURN Unavailable
      - alert: TURNUnavailable
        expr: up{job="coturn"} == 0
        for: 2m
        annotations:
          severity: critical
          summary: "TURN server down"
          action: "Restart TURN pod: kubectl rollout restart deployment/coturn"

      # Redis Lag (if using replication)
      - alert: RedisSyncLag
        expr: redis_replication_backlog_size_bytes > 1073741824  # 1GB
        for: 5m
        annotations:
          severity: warning
          summary: "Redis sync lag high"
          action: "Check Redis cluster health, verify network"

      # Disk Space (if logging to disk)
      - alert: HighDiskUsage
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 10m
        annotations:
          severity: warning
          summary: "Disk usage > 90%"
          action: "Clean up old logs, expand storage"

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: container_memory_working_set_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        annotations:
          severity: warning
          summary: "Memory usage: {{ $value }}%"
          action: "Scale up memory or debug memory leak"
```

---

## D. OpenTelemetry Integration

### Distributed Tracing Setup

```typescript
// Backend: otel.service.ts
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-trace-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';

export function initializeTracing() {
  const jaegerExporter = new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces',
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'video-chat-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VERSION,
    }),
    tracing: {
      spanProcessor: new BatchSpanProcessor(jaegerExporter),
    },
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown();
  });
}
```

### Trace Context Propagation

```typescript
// Per WebSocket event
@SubscribeMessage('send-offer')
async handleOffer(client: Socket, data: any) {
  const { context } = data;
  const parentSpan = trace.getSpan(context.extractedContext);

  const span = tracer.startSpan('handleOffer', { parent: parentSpan });
  try {
    // Process offer
  } finally {
    span.end();
  }
}
```

---

## E. SLOs (Service Level Objectives)

### Primary SLOs

| Objective | Target | Alerting Threshold | Notes |
|-----------|--------|-------------------|-------|
| Signaling Latency (p95) | < 200ms | > 500ms for 5m | WebSocket RTT |
| Match Latency (p95) | < 5s | > 10s for 5m | Queue → Match |
| ICE Success Rate | ≥ 95% | < 90% for 5m | P2P connection |
| TURN Fallback | < 15% | > 20% for 10m | Relay usage |
| Pod Availability | ≥ 99.9% | any downtime | 3-9s/day max |
| Error Rate | < 0.1% | > 1% for 5m | Any error |
| TURN Availability | ≥ 99% | down > 2m | Escalates to critical |

### Error Budget

```
Availability Target: 99.9%
Error Budget: 0.1% = 8.64 seconds downtime/day, 43.2 minutes/month

Current Actual Availability: 99.95% (3.6 minutes/month buffer)
Buffer: 39.6 minutes remaining in 30-day window
```

---

## F. Operational Runbook

### Issue: High Signaling Latency

**Symptoms**: p95 latency > 500ms

**Investigation**:
1. Check CPU: `kubectl top pods -n video-chat --sort-by=memory`
2. Check Redis: `redis-cli --latency` (should be < 1ms)
3. Check network: Pod-to-Pod latency

**Resolution**:
- If CPU high: `kubectl autoscale deployment video-chat-backend --max=20`
- If Redis slow: Restart Redis or scale cluster
- If network: Check node affinity, increase pod spread

**Expected Recovery**: 1-3 minutes

---

### Issue: Low ICE Connection Success

**Symptoms**: < 90% of P2P connections established

**Investigation**:
1. Check TURN availability: `kubectl get pods -l app=coturn`
2. Verify TURN credentials: Check credential rotation timestamps
3. Check firewall: Attempt `stunclient turn-server 3478`

**Resolution**:
- If TURN down: `kubectl rollout restart deployment/coturn`
- If credentials expired: Redeploy with fresh secrets
- If firewall: Open UDP 3478, TCP 5349 on load balancer

**Expected Recovery**: 5-15 minutes

---

### Issue: Pod Crash Loop

**Symptoms**: Pods restarting repeatedly

**Investigation**:
1. Check logs: `kubectl logs <pod-name> -c backend`
2. Check resources: `kubectl describe pod <pod-name>`
3. Check events: `kubectl get events -n video-chat --sort-by='.lastTimestamp'`

**Resolution**:
- If OOMKilled: Increase memory limits in deployment
- If config error: Fix env variables, redeploy
- If dependency missing: Ensure Redis/Postgres running

**Expected Recovery**: 2-5 minutes

---

### Issue: Redis Connection Pool Exhaustion

**Symptoms**: "READONLY You can't write against a read only replica" errors

**Investigation**:
1. Check Redis cluster: `redis-cli cluster info`
2. Check connections: `redis-cli client list | wc -l`
3. Check replication lag: `redis-cli info replication`

**Resolution**:
- Increase max connections in Redis config
- Restart backend pods (forces reconnection)
- Failover to new master if needed

**Expected Recovery**: 1-2 minutes

---

### Issue: Rapid Report Spam

**Symptoms**: 10+ reports/minute from single device

**Investigation**:
1. Check reporting rate: `prometheus query "rate(reports_submitted_total[1m])"`
2. Identify device ID: `kubectl logs deployment/backend | grep device`
3. Check existing blocks: `redis-cli smembers blocklist:device:*`

**Resolution**:
- Manually add device to blocklist: `redis-cli sadd blocklist:device:{deviceId} true`
- Increase rate limit threshold for new devices
- Flag account for human review

**Expected Recovery**: Immediate (manual block)

---

## G. Maintenance Tasks

### Daily
- [ ] Review error logs for patterns
- [ ] Check alert history (AlertManager)
- [ ] Monitor active session count

### Weekly
- [ ] Update Prometheus retention check
- [ ] Review Grafana dashboard for anomalies
- [ ] Update dependency security advisories

### Monthly
- [ ] Rotate JWT secrets (optional, but recommended)
- [ ] Review TURN credential generation
- [ ] Analyze metrics for capacity planning

### Quarterly
- [ ] Full security audit
- [ ] Load test (scale to 2x expected peak)
- [ ] Disaster recovery drill

---

## H. Metrics Exported by Backend

```typescript
// Automatic metrics from Prometheus client
# help connections_total Total connections
# type connections_total counter
connections_total{status="connected"} 342

# help signaling_latency_ms WebSocket round-trip latency
# type signaling_latency_ms histogram
signaling_latency_ms_bucket{le="50"} 100
signaling_latency_ms_bucket{le="100"} 250
signaling_latency_ms_bucket{le="200"} 500

# help sessions_created_total Sessions created
# type sessions_created_total counter
sessions_created_total 12500

# help ice_connected_total ICE connections established
# type ice_connected_total counter
ice_connected_total 11750

# help turn_relay_total TURN relay relayed
# type turn_relay_total counter
turn_relay_total 1500

# help reports_submitted_total Reports submitted
# type reports_submitted_total counter
reports_submitted_total 250

# help errors_total Errors encountered
# type errors_total counter
errors_total{type="offer_expired"} 10
errors_total{type="connection_timeout"} 5
```

---

## I. Alerting Integration

### PagerDuty / OpsGenie

```yaml
# AlertManager config
global:
  resolve_timeout: 5m

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true

receivers:
  - name: 'default'
    slack_configs:
      - api_url: ${SLACK_WEBHOOK}
        channel: '#alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: ${PAGERDUTY_SERVICE_KEY}
        severity: critical
```
