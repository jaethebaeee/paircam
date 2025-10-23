# 🌊 Deploy to DigitalOcean

Complete guide to deploy your video chat app on DigitalOcean Droplet.

## 💰 Cost

- **Basic Droplet:** $6/month (1GB RAM)
- **Recommended:** $12/month (2GB RAM)
- **Production:** $24/month (4GB RAM)

---

## 📋 Prerequisites

- DigitalOcean account ([Get $200 credit](https://m.do.co/c/your-referral))
- Domain name (optional but recommended)
- SSH key or password

---

## 🚀 Step-by-Step Deployment

### Step 1: Create Droplet

1. **Go to DigitalOcean Dashboard**
   - Click **"Create"** → **"Droplets"**

2. **Choose Image:**
   - **OS:** Ubuntu 22.04 LTS

3. **Choose Size:**
   - **Basic Plan**
   - **2 GB RAM / 1 CPU** ($12/mo) - Recommended
   - Or **4 GB RAM / 2 CPU** ($24/mo) - Production

4. **Choose Region:**
   - Select closest to your users
   - e.g., New York, San Francisco, London

5. **Authentication:**
   - Add SSH Key (recommended)
   - Or use Password

6. **Finalize:**
   - Hostname: `video-chat-app`
   - Click **"Create Droplet"**

7. **Wait 60 seconds** for droplet to be created

### Step 2: Connect via SSH

```bash
# Copy your droplet's IP address from dashboard
ssh root@YOUR_DROPLET_IP

# If using SSH key, it will connect automatically
# If using password, enter the one sent to your email
```

### Step 3: Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Git
apt install git -y

# Verify installations
docker --version
docker-compose --version
git --version
```

### Step 4: Clone Repository

```bash
# Clone your repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Or upload files via SCP
# scp -r /local/path root@YOUR_DROPLET_IP:/root/
```

### Step 5: Configure Environment

```bash
# Create production environment file
cp env.production.template .env.production

# Edit with nano or vim
nano .env.production
```

**Update these values:**

```env
# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
TURN_SHARED_SECRET=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 24)
TURN_PASSWORD=$(openssl rand -base64 24)

# Set your domain (or use IP temporarily)
DOMAIN=yourdomain.com
API_URL=https://api.yourdomain.com
WS_URL=wss://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Or for testing with IP:
# API_URL=http://YOUR_DROPLET_IP:3333
# WS_URL=ws://YOUR_DROPLET_IP:3333
# CORS_ORIGINS=http://YOUR_DROPLET_IP

# TURN server
EXTERNAL_IP=YOUR_DROPLET_IP
```

**Save file:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS, and TURN
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3478/udp  # TURN
ufw allow 3478/tcp  # TURN
ufw allow 5349/tcp  # TURN TLS

# Enable firewall
ufw --force enable

# Check status
ufw status
```

### Step 7: Deploy with Docker

```bash
# Run deployment script
chmod +x deploy.sh
./deploy.sh

# Or manually:
docker-compose -f docker-compose.prod.yml up -d --build
```

### Step 8: Verify Deployment

```bash
# Check running containers
docker ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test backend
curl http://localhost:3333/health

# Test frontend
curl http://localhost/health
```

---

## 🌐 Setup Domain & SSL

### Step 1: Point Domain to Droplet

Add these DNS records at your domain registrar:

```
Type    Name    Value               TTL
A       @       YOUR_DROPLET_IP     3600
A       www     YOUR_DROPLET_IP     3600
A       api     YOUR_DROPLET_IP     3600
A       turn    YOUR_DROPLET_IP     3600
```

### Step 2: Install Certbot for SSL

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Stop frontend container temporarily
docker stop video-chat-frontend-prod

# Get SSL certificate
certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  --agree-tos \
  --email your@email.com \
  --non-interactive

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/
```

### Step 3: Configure Nginx with SSL

Create nginx config:

```bash
nano /root/nginx.conf
```

```nginx
events {
    worker_connections 1024;
}

http {
    # Frontend
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://localhost:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # Backend API
    server {
        listen 80;
        server_name api.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            proxy_pass http://localhost:3333;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 4: Run Nginx

```bash
# Update docker-compose to add nginx
docker run -d \
  --name nginx-proxy \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /root/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  nginx:alpine

# Or add to docker-compose.prod.yml
```

### Step 5: Update Environment for HTTPS

```bash
# Update .env.production
nano .env.production
```

```env
DOMAIN=yourdomain.com
API_URL=https://api.yourdomain.com
WS_URL=wss://api.yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

```bash
# Rebuild frontend with new URLs
docker-compose -f docker-compose.prod.yml up -d --build frontend

# Restart backend with new CORS
docker-compose -f docker-compose.prod.yml restart backend
```

### Step 6: Test!

Visit `https://yourdomain.com` - You should see your app with SSL! 🎉

---

## 🔄 Updates & Maintenance

### Pull Latest Changes

```bash
cd /root/your-repo
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs video-chat-backend-prod -f
```

### Restart Services

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Backup Redis Data

```bash
# Create backup
docker exec video-chat-redis-prod redis-cli --no-auth-warning -a "$REDIS_PASSWORD" save
docker cp video-chat-redis-prod:/data/dump.rdb ./backup-$(date +%Y%m%d).rdb

# Upload to DigitalOcean Spaces or S3
```

---

## 📊 Monitoring

### Install Monitoring Tools

```bash
# Add to docker-compose.prod.yml or use DigitalOcean Monitoring
```

### Check Resource Usage

```bash
# System resources
htop

# Docker stats
docker stats

# Disk usage
df -h
```

### Set Up Alerts

Use DigitalOcean Monitoring:
1. Go to droplet page
2. Click "Monitoring" tab
3. Enable monitoring
4. Set up alerts for CPU, Memory, Disk

---

## 💰 Cost Optimization

### Resize Droplet

Start small, scale up as needed:
- Start: $12/mo (2GB RAM)
- Moderate traffic: $24/mo (4GB RAM)
- High traffic: $48/mo (8GB RAM)

### Add CDN

Use DigitalOcean Spaces + CDN for static assets.

### Use Managed Redis

Consider DigitalOcean Managed Redis for $15/mo (high availability).

---

## 🐛 Troubleshooting

### Can't connect via SSH

```bash
# Check firewall
ufw status

# Ensure port 22 is open
ufw allow 22/tcp
```

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Clean up Docker
docker system prune -a
```

### Out of memory

```bash
# Add swap space
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## ✅ Production Checklist

- [ ] Droplet created and configured
- [ ] Docker installed
- [ ] Application deployed
- [ ] Environment variables set
- [ ] Firewall configured
- [ ] Domain pointed to droplet
- [ ] SSL certificates installed
- [ ] HTTPS working
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Auto-updates scheduled

---

## 🚀 You're Live!

Your app is now running on DigitalOcean! 🎉

**Access your app:**
- Frontend: https://yourdomain.com
- Backend: https://api.yourdomain.com
- Health: https://api.yourdomain.com/health

---

**Questions? Check logs or DigitalOcean community tutorials!**

