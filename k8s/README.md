# Kubernetes Deployment

## Security Setup

**IMPORTANT**: Secrets are NOT stored in this repository for security reasons.

### To deploy:

1. Copy the secrets template:
   ```bash
   cp secrets.template.yaml secrets.yaml
   ```

2. Edit `secrets.yaml` with your actual credentials:
   - JWT_SECRET
   - REDIS_URL (Upstash)
   - TURN credentials

3. Apply secrets to your cluster:
   ```bash
   kubectl apply -f secrets.yaml
   ```

4. Apply the backend deployment:
   ```bash
   kubectl apply -f backend.yaml
   kubectl apply -f backend-ingress.yaml
   ```

**Note**: `secrets.yaml` is gitignored and will never be committed to the repository.

