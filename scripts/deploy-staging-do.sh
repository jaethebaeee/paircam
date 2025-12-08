#!/usr/bin/env bash
set -euo pipefail

# Deploys backend to a DigitalOcean Kubernetes cluster with NGINX Ingress and cert-manager.
# Prereqs: doctl, kubectl, helm installed and doctl authenticated (doctl auth init).

CLUSTER_NAME="paircam"
REGION="nyc1"
NODE_SIZE="s-2vcpu-4gb"
NODE_COUNT="2"
NAMESPACE="connect-video-chat"

# Domain config
API_HOST="api.paircam.live"
FRONTEND_ORIGIN="https://app.paircam.live"

# Secrets (fill these before running or export as env vars)
REDIS_URL="${REDIS_URL:-""}"
TURN_PROVIDER="managed"
TURN_URLS="${TURN_URLS:-"stun:stun.relay.metered.ca:80,turn:global.relay.metered.ca:80,turn:global.relay.metered.ca:80?transport=tcp,turn:global.relay.metered.ca:443,turns:global.relay.metered.ca:443?transport=tcp"}"
TURN_USERNAME="${TURN_USERNAME:-""}"
TURN_PASSWORD="${TURN_PASSWORD:-""}"
JWT_SECRET_VALUE="${JWT_SECRET_VALUE:-""}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1. Please install it." >&2; exit 1; }; }
need doctl; need kubectl; need helm

if [[ -z "$REDIS_URL" ]]; then
  echo "REDIS_URL env is required (Upstash rediss URL)." >&2
  exit 1
fi
if [[ -z "$TURN_USERNAME" || -z "$TURN_PASSWORD" ]]; then
  echo "TURN_USERNAME and TURN_PASSWORD envs are required (managed TURN creds)." >&2
  exit 1
fi
if [[ -z "$JWT_SECRET_VALUE" ]]; then
  echo "JWT_SECRET_VALUE not set; generating a random secret." >&2
  JWT_SECRET_VALUE=$(openssl rand -hex 32)
fi

echo "==> Creating/connecting to cluster: $CLUSTER_NAME ($REGION)"
if ! doctl kubernetes cluster get "$CLUSTER_NAME" >/dev/null 2>&1; then
  doctl kubernetes cluster create "$CLUSTER_NAME" --region "$REGION" --size "$NODE_SIZE" --count "$NODE_COUNT"
fi
doctl kubernetes cluster kubeconfig save "$CLUSTER_NAME"
kubectl get nodes

echo "==> Installing NGINX Ingress"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null
helm repo update >/dev/null
if ! kubectl get ns ingress-nginx >/dev/null 2>&1; then
  helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
fi

echo "==> Installing cert-manager"
helm repo add jetstack https://charts.jetstack.io >/dev/null
helm repo update >/dev/null
if ! kubectl get ns cert-manager >/dev/null 2>&1; then
  helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true
fi

echo "==> Applying namespace and ClusterIssuer"
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/cert-issuer.yaml

echo "==> Creating/updating Secrets"
kubectl -n "$NAMESPACE" create secret generic redis-secret \
  --from-literal=url="$REDIS_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NAMESPACE" create secret generic turn-managed \
  --from-literal=username="$TURN_USERNAME" \
  --from-literal=password="$TURN_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n "$NAMESPACE" create secret generic jwt-secret \
  --from-literal=secret="$JWT_SECRET_VALUE" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Applying backend deployment/service"
kubectl -n "$NAMESPACE" apply -f k8s/backend.yaml

echo "==> Applying backend ingress for $API_HOST"
kubectl -n "$NAMESPACE" apply -f k8s/backend-ingress.yaml

echo "==> Waiting for Ingress external address..."
for i in {1..30}; do
  IP=$(kubectl -n "$NAMESPACE" get ingress backend-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || true)
  HN=$(kubectl -n "$NAMESPACE" get ingress backend-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || true)
  if [[ -n "$IP" || -n "$HN" ]]; then
    break
  fi
  echo "  waiting (attempt $i)..."
  sleep 10
done

echo "\n==> Ingress address:"
echo "IP: ${IP:-"<none>"}"
echo "Hostname: ${HN:-"<none>"}"
echo "\nCreate DNS for api.paircam.live:"
if [[ -n "$IP" ]]; then
  echo "  A record → api.paircam.live → $IP (TTL 30m)"
else
  echo "  CNAME record → api.paircam.live → $HN (TTL 30m)"
fi

echo "\nAfter DNS propagates, verify: curl -I https://$API_HOST/health"
echo "Then set VITE_API_URL=https://$API_HOST for the frontend and deploy app.paircam.live."


