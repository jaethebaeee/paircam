# 🚀 Deployment Guide

Complete guide for deploying the Video Chat application to production.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Cloud Deployments](#cloud-deployments)
6. [Post-Deployment](#post-deployment)

---

## Pre-Deployment Checklist

### Security

- [ ] Change `JWT_SECRET` to a strong random value (32+ characters)
- [ ] Change `TURN_SHARED_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins (no wildcards)
- [ ] Enable HTTPS/TLS for all services
- [ ] Set up firewall rules
- [ ] Configure rate limiting
- [ ] Review security headers
- [ ] Enable audit logging

### Infrastructure

- [ ] Redis cluster configured for high availability
- [ ] TURN server deployed and tested
- [ ] Load balancer configured
- [ ] CDN configured for static assets
- [ ] SSL certificates obtained and installed
- [ ] DNS records configured
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] Backup strategy implemented

### Application

- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] Dependencies updated
- [ ] Build optimized for production
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Feature flags configured

---

## Environment Setup

### Production Environment Variables

#### Backend (.env)

```bash
# Application
NODE_ENV=production
PORT=3333
LOG_LEVEL=info

# JWT
JWT_SECRET=<STRONG_RANDOM_SECRET_32_CHARS>
JWT_EXPIRATION=5m

# Redis
REDIS_HOST=redis-cluster.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<REDIS_PASSWORD>
REDIS_DB=0
REDIS_TLS=true

# TURN Server
TURN_SHARED_SECRET=<STRONG_RANDOM_SECRET>
TURN_REALM=video-chat.example.com
TURN_HOST=turn.example.com
TURN_PORT=3478
TURN_TLS_PORT=5349

# CORS
CORS_ORIGINS=https://example.com,https://www.example.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
OTEL_ENABLED=true
PROMETHEUS_PORT=9090

# Abuse Detection
ABUSE_DETECTION_ENABLED=true
MAX_CALLS_PER_MINUTE=10
MAX_SKIPS_PER_SESSION=5
```

#### Frontend (.env.production)

```bash
VITE_API_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_CHAT=true
```

### Generate Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate TURN secret
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 24
```

---

## Docker Deployment

### Build Images

```bash
# Build backend
cd packages/backend
docker build -t video-chat-backend:latest .

# Build frontend
cd packages/frontend
docker build -t video-chat-frontend:latest .

# Tag for registry
docker tag video-chat-backend:latest registry.example.com/video-chat-backend:latest
docker tag video-chat-frontend:latest registry.example.com/video-chat-frontend:latest

# Push to registry
docker push registry.example.com/video-chat-backend:latest
docker push registry.example.com/video-chat-frontend:latest
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    restart: always
    networks:
      - backend

  backend:
    image: registry.example.com/video-chat-backend:latest
    env_file: .env.production
    depends_on:
      - redis
    restart: always
    networks:
      - backend
      - frontend
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M

  frontend:
    image: registry.example.com/video-chat-frontend:latest
    env_file: .env.production
    restart: always
    networks:
      - frontend
    deploy:
      replicas: 2

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: always
    networks:
      - frontend

  coturn:
    image: coturn/coturn:latest
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf:ro
    restart: always

volumes:
  redis-data:

networks:
  backend:
  frontend:
```

### Deploy with Docker Compose

```bash
# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=5

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Configure kubectl
kubectl config use-context production
```

### Create Namespace

```bash
kubectl create namespace video-chat
kubectl config set-context --current --namespace=video-chat
```

### Deploy Redis

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis
spec:
  clusterIP: None
  ports:
  - port: 6379
  selector:
    app: redis
```

### Deploy Backend

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: registry.example.com/video-chat-backend:latest
        ports:
        - containerPort: 3333
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3333
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3333
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: ClusterIP
  ports:
  - port: 3333
    targetPort: 3333
  selector:
    app: backend
```

### Deploy Frontend

```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: registry.example.com/video-chat-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: frontend
```

### Create Secrets

```bash
# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=turn-secret=$(openssl rand -base64 32) \
  --from-literal=redis-password=$(openssl rand -base64 24)
```

### Deploy Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: video-chat-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/websocket-services: backend
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - example.com
    - www.example.com
    secretName: tls-secret
  rules:
  - host: example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3333
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### Deploy All

```bash
# Apply all configurations
kubectl apply -f redis-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f ingress.yaml

# Check status
kubectl get pods
kubectl get services
kubectl get ingress

# View logs
kubectl logs -f deployment/backend
kubectl logs -f deployment/frontend
```

### Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=5

# Horizontal Pod Autoscaler
kubectl autoscale deployment backend \
  --cpu-percent=70 \
  --min=3 \
  --max=10
```

---

## Cloud Deployments

### AWS Deployment

#### Using ECS

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name video-chat-cluster

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster video-chat-cluster \
  --service-name backend \
  --task-definition backend:1 \
  --desired-count 3 \
  --launch-type FARGATE
```

#### Using EKS

```bash
# Create EKS cluster
eksctl create cluster \
  --name video-chat \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 10

# Deploy application
kubectl apply -f k8s/
```

### GCP Deployment

#### Using GKE

```bash
# Create GKE cluster
gcloud container clusters create video-chat \
  --num-nodes=3 \
  --machine-type=n1-standard-2 \
  --region=us-central1

# Get credentials
gcloud container clusters get-credentials video-chat --region=us-central1

# Deploy application
kubectl apply -f k8s/
```

### Azure Deployment

#### Using AKS

```bash
# Create AKS cluster
az aks create \
  --resource-group video-chat-rg \
  --name video-chat-cluster \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-addons monitoring

# Get credentials
az aks get-credentials \
  --resource-group video-chat-rg \
  --name video-chat-cluster

# Deploy application
kubectl apply -f k8s/
```

---

## Post-Deployment

### Verify Deployment

```bash
# Check health
curl https://api.example.com/health

# Check metrics
curl https://api.example.com/metrics

# Test authentication
curl -X POST https://api.example.com/auth/token \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "test"}'

# Test WebSocket
wscat -c wss://api.example.com
```

### Configure Monitoring

```bash
# Deploy Prometheus
kubectl apply -f monitoring/prometheus.yaml

# Deploy Grafana
kubectl apply -f monitoring/grafana.yaml

# Import dashboards
# - Video Chat Overview
# - Redis Metrics
# - Node Metrics
```

### Configure Alerts

```yaml
# alerts.yaml
groups:
- name: video-chat
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate detected"
  
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 5m
    annotations:
      summary: "High latency detected"
```

### Backup Strategy

```bash
# Backup Redis
redis-cli --rdb /backup/redis-$(date +%Y%m%d).rdb

# Backup configuration
kubectl get configmap -o yaml > backup/configmaps.yaml
kubectl get secret -o yaml > backup/secrets.yaml
```

### Rollback Plan

```bash
# Kubernetes rollback
kubectl rollout undo deployment/backend

# Docker Compose rollback
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## Maintenance

### Updates

```bash
# Update dependencies
npm update

# Rebuild images
docker build -t video-chat-backend:v2.0.0 .

# Rolling update
kubectl set image deployment/backend backend=video-chat-backend:v2.0.0
kubectl rollout status deployment/backend
```

### Database Migrations

```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback
```

---

**Deployment Complete! 🚀**
