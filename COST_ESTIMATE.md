# Infrastructure Cost Estimate

## Overview

This document provides monthly cost estimates for three deployment scenarios across AWS, GCP, and Azure.

---

## Development (100 concurrent sessions)

### Components & Sizing

| Component | Instance Type | Count | vCPU | Memory | Storage |
|-----------|---------------|-------|------|--------|---------|
| Signaling | t3.small / e2-small | 1 | 0.2 | 0.5 GB | 10 GB |
| Redis | t3.micro / e2-micro | 1 | 0.25 | 0.25 GB | 5 GB |
| Coturn | t3.micro / e2-micro | 1 | 0.25 | 0.25 GB | 5 GB |
| Frontend (Static) | CDN Edge | N/A | N/A | N/A | 100 MB |
| Monitoring | t3.micro / e2-micro | 1 | 0.25 | 0.5 GB | 10 GB |
| **Total** | | | **1.0 CPU** | **1.5 GB** | **30 GB** |

### AWS Pricing (us-east-1)

```
EC2 (On-Demand):
- 1x t3.small  (0.2 CPU, 0.5GB): $0.023/hr × 730 hrs = $16.79
- 3x t3.micro  (0.25 CPU, 0.25GB): $0.0116/hr × 730 = $25.40
  Subtotal: $42.19

EBS Storage:
- 30 GB @ $0.10/GB/mo = $3.00

Data Transfer:
- 10 GB egress @ $0.09/GB = $0.90

RDS (optional, Postgres t3.micro):
- $0.019/hr × 730 = $13.87 (if needed)

Total (without RDS): **$46.09/month**
Total (with RDS): **$59.96/month**
```

### GCP Pricing (us-central1)

```
Compute Engine (E2 VMs, committed discount not applied for dev):
- 1x e2-small: $0.025/hr × 730 = $18.25
- 3x e2-micro: $0.011/hr × 730 = $24.09
  Subtotal: $42.34

Persistent Disk Storage:
- 30 GB @ $0.051/GB/mo = $1.53

Network Egress:
- 10 GB @ $0.12/GB = $1.20

Cloud SQL (optional, db-f1-micro Postgres):
- $0.0175/hr × 730 = $12.78

Total (without Cloud SQL): **$45.07/month**
Total (with Cloud SQL): **$57.85/month**
```

### Azure Pricing (East US)

```
Virtual Machines (Pay-as-you-go):
- 1x Standard_B1s: $0.012/hr × 730 = $8.76
- 3x Standard_B1ls: $0.0058/hr × 730 = $12.70
  Subtotal: $21.46

Managed Disks:
- 30 GB Premium SSD: $1.15/GB/mo = $34.50
- 30 GB Standard SSD: $0.175/GB/mo = $5.25

Data Transfer:
- 10 GB egress @ $0.087/GB = $0.87

Database for PostgreSQL (optional, Basic tier):
- 1 vCore, 50 GB: $35-50/mo

Total (without DB): **$59.48-63.85/month**
Total (with DB): **$94.48-113.85/month**
```

**Recommendation for Dev**: Use AWS or GCP (~$45-60/mo). Set environment to non-production (disable some monitoring for cost savings).

---

## Small Production (500 concurrent sessions)

### Components & Sizing

| Component | Instance Type | Count | vCPU | Memory | Storage |
|-----------|---------------|-------|------|--------|---------|
| Signaling | t3.medium / e2-standard-2 | 3 | 1.5 | 3 GB | 30 GB |
| Redis Cluster | r5.large / m5-large | 3 | 3 | 6 GB | 60 GB |
| Coturn | t3.medium / e2-standard-2 | 2 | 1 | 2 GB | 20 GB |
| Frontend (S3/GCS) | CDN Edge | N/A | N/A | N/A | 500 MB |
| Monitoring | t3.small / e2-small | 1 | 0.2 | 0.5 GB | 20 GB |
| Postgres (Reports) | t3.medium / e2-standard-2 | 1 | 0.5 | 1 GB | 50 GB |
| **Total** | | | **6.7 CPU** | **12.5 GB** | **180 GB** |

### AWS Pricing (us-east-1, Multi-AZ)

```
EC2 (On-Demand):
- 3x t3.medium  (0.5 CPU, 1 GB): $0.0464/hr × 730 = $33.88
- 2x t3.medium  (0.5 CPU, 1 GB): $0.0464/hr × 730 = $33.88
- 1x t3.small   (0.2 CPU, 0.5 GB): $0.023/hr × 730 = $16.79
  Subtotal: $84.55

RDS (Postgres, db.t3.medium, Multi-AZ):
- $0.327/hr × 730 × 2 (multi-az) = $477.42

ElastiCache (Redis, cache.r5.large, 3 nodes):
- $0.344/hr × 730 × 3 = $754.32

EBS + RDS Storage:
- 180 GB @ $0.10/GB = $18.00
- RDS Backup (100 GB) @ $0.023/GB = $2.30

Load Balancer (ELB):
- $0.016/hr × 730 = $11.68

Data Transfer:
- 50 GB egress @ $0.09/GB = $4.50

Total: **$1,353.77/month** (~$1,400/mo with misc)
```

### GCP Pricing (us-central1, Multi-Region)

```
Compute Engine (3-year commitment discount ~30%):
- 3x e2-standard-2: $0.0845/hr × 730 = $184.80 × 0.7 = $129.36
- 2x e2-standard-2: $0.0845/hr × 730 = $123.24
- 1x e2-small: $0.025/hr × 730 = $18.25
  Subtotal (discounted): $270.85

Cloud Memorystore (Redis, 5GB, 3-node HA):
- $0.35/GB/mo × 5 = $1.75/node × 3 = $17.50

Cloud SQL (Postgres, db-custom-2-7680, HA):
- $0.0825/hr × 730 × 2 (HA) = $120.65

Persistent Disks:
- 180 GB SSD @ $0.17/GB = $30.60

Cloud Load Balancing:
- $0.025/hr × 730 = $18.25

Network Egress:
- 50 GB @ $0.12/GB = $6.00

Total: **$464.85/month** (with commitments)
Total (no commitments): **$664/mo**
```

### Azure Pricing (East US)

```
Virtual Machines (Pay-as-you-go):
- 3x Standard_D2s_v3 (2 vCore, 8GB): $0.096/hr × 730 × 3 = $705.36
- 2x Standard_D2s_v3: $0.096/hr × 730 × 2 = $140.35 (wait, recalc: $0.096 × 730 × 2 = $140.35) 
  Actually: $0.096 × 730 = $70.08 per VM-month
  So 2x: $140.16
  And 1x small: $0.044/hr × 730 = $32.12
  Subtotal: $877.63

Azure Database for PostgreSQL (Flexible Server):
- vCore pricing: 2 vCore HA = $0.35/hr × 730 × 2 = $511.00
- Storage: 64 GB @ $0.123/GB = $7.87

Azure Cache for Redis:
- Premium tier, 3 GB: $0.359/hr × 730 = $262.07

Managed Disks:
- 180 GB Premium SSD P10: ~$150/month

Load Balancer:
- $0.025/hr × 730 = $18.25

Outbound Data Transfer:
- 50 GB @ $0.087/GB = $4.35

Total: **$1,831.17/month** (expensive option)
Total (Standard tier, less HA): **$1,200-1,400/month**
```

**Recommendation for Small Prod**: Use GCP with 3-year commitment (~$465/mo). AWS is mid-range ($1,354/mo). Avoid Azure for this tier.

---

## Medium Production (5000 concurrent sessions)

### Components & Sizing

| Component | Instance Type | Count | vCPU | Memory | Storage |
|-----------|---------------|-------|------|--------|---------|
| Signaling | t3.xlarge / e2-standard-4 | 10 | 10 | 20 GB | 100 GB |
| Redis Cluster | r5.xlarge / m5-xlarge | 5 | 10 | 20 GB | 150 GB |
| Coturn | t3.large / e2-standard-4 | 5 | 5 | 10 GB | 50 GB |
| Frontend (CloudFront/CDN) | Edge | N/A | N/A | N/A | 1 GB |
| Monitoring | t3.large / e2-standard-4 | 2 | 2 | 4 GB | 50 GB |
| Postgres (Reports) | db.r5.2xlarge / e2-highmem-4 | 2 | 8 | 16 GB | 200 GB |
| **Total** | | | **35 CPU** | **70 GB** | **550 GB** |

### AWS Pricing (us-east-1, Multi-AZ + CloudFront)

```
EC2 (On-Demand):
- 10x t3.xlarge (2 CPU, 4 GB): $0.1856/hr × 730 = $135.49 × 10 = $1,354.90
- 5x t3.large (1 CPU, 2 GB): $0.0928/hr × 730 = $67.74 × 5 = $338.70
- 2x t3.large: $67.74 × 2 = $135.48
  Subtotal: $1,829.08

RDS (Postgres, db.r5.2xlarge, Multi-AZ, read replica):
- $1.44/hr × 730 × 2 × 2 (master + read replica, both multi-az) = $4,204.80

ElastiCache (Redis, cache.r5.xlarge, 5-node cluster):
- $0.688/hr × 730 × 5 = $2,511.20

CloudFront CDN:
- 100 GB/mo data @ $0.085/GB = $8.50
- 10M requests @ $0.0075/10K = $7.50

EBS Storage (560 GB):
- $0.10/GB × 560 = $56.00

RDS Backup:
- Multi-AZ daily backup: ~$50/mo

Network Load Balancer (NLB):
- $0.006/hr × 730 × 2 = $8.76

Data Transfer (Inter-region, if needed):
- 100 GB egress @ $0.09/GB = $9.00

NAT Gateway (if applicable):
- $0.032/hr × 730 × 2 = $46.72

Total: **$8,671.56/month** (~$8,700/mo)
```

### GCP Pricing (us-central1, Multi-Region with Commitments)

```
Compute Engine (3-year commitment, ~30% discount):
- 10x e2-standard-4: $0.1688/hr × 730 × 10 × 0.7 = $859.02
- 5x e2-standard-4: $0.1688/hr × 730 × 5 × 0.7 = $429.51
- 2x e2-standard-4: $0.1688/hr × 730 × 2 × 0.7 = $171.80
  Subtotal: $1,460.33

Cloud Memorystore (Redis, 50GB, 5-node):
- $0.35/GB/mo × 50 = $17.50 × 5 = $87.50

Cloud SQL (Postgres, db-custom-4-26GB, HA + read replica):
- $0.195/hr × 730 × 2 × 2 = $570.60

Cloud CDN:
- 100 GB @ $0.085/GB = $8.50
- 10M requests @ free tier (first 1TB/mo free after)

Persistent Disks (560 GB SSD):
- $0.17/GB × 560 = $95.20

Cloud Load Balancing:
- $0.025/hr × 730 = $18.25 (internal + external)

Network Egress:
- 200 GB @ $0.12/GB = $24.00

Total: **$2,264.38/month** (with commitments & multi-region)
Total (no commitments): **$3,200-3,400/month**
```

### Azure Pricing (East US Multi-Region)

```
Virtual Machines (3-year reserved, ~40% discount):
- 10x Standard_D4s_v3 (4 vCore, 16GB): $0.192/hr = $140.16/mo × 10 × 0.6 = $841.00
- 5x Standard_D4s_v3: $140.16/mo × 5 × 0.6 = $420.50
- 2x Standard_D4s_v3: $140.16/mo × 2 × 0.6 = $168.20
  Subtotal: $1,429.70

Azure Database for PostgreSQL (Flexible Server):
- 4 vCore HA + read replica: $0.616/hr × 730 × 2 × 2 = $1,800.64

Azure Cache for Redis (Premium tier, 30 GB):
- $0.866/hr × 730 = $632.18

Managed Disks:
- 560 GB Premium SSD (P20): $0.82/GB × 560 = $459.20

Azure CDN:
- 100 GB @ $0.087/GB = $8.70

Application Gateway (Layer 7 LB):
- $0.25/hr × 730 = $182.50

Outbound Bandwidth:
- 200 GB @ $0.087/GB = $17.40

Total: **$4,530.32/month** (with reserved instances)
Total (pay-as-you-go): **$7,000-8,000/month**
```

**Recommendation for Medium Prod**: Use GCP with 3-year commitment (~$2,264/mo). AWS is expensive (~$8,671/mo). Azure is mid-range but complexity increases.

---

## Cost Optimization Strategies

### 1. Reserved Instances / Committed Use Discounts
- **AWS**: 1-year or 3-year commitments save 30-40%
- **GCP**: 1-year or 3-year commitments save 25-37%
- **Azure**: 1-year or 3-year reserved instances save 40-50%

### 2. Auto-Scaling
- Set HPA target CPU to 70% (not 100%)
- Scale down during off-peak (evenings, weekends)
- Average savings: 20-30%

### 3. Spot / Preemptible Instances
- GCP Preemptible VMs: 70% cheaper (but 24h max)
- AWS Spot Instances: 70% cheaper (but can be terminated)
- Use for stateless backend (not Redis!)
- Average savings: 50-70% on compute

### 4. Data Transfer Optimization
- Use regional endpoints (same-region data transfer is often free)
- CDN for static assets (frontend, dashboards)
- Compress logs before archiving
- Average savings: 10-20%

### 5. Storage Optimization
- Use cold storage for archived reports (10y retention)
- Redis persistence OFF (data is TTL'd anyway)
- RDS backup optimization (1 full backup + incremental)
- Average savings: 15-25%

### 6. Database Optimization
- Serverless databases (AWS Aurora Serverless, Azure Database)
- Read replicas (not always needed, costs 100% extra)
- Connection pooling (reduce overhead)

---

## Estimated Monthly Costs Summary

| Tier | AWS | GCP | Azure |
|------|-----|-----|-------|
| **Dev** | $46-60 | $45-60 | $59-114 |
| **Small Prod** | $1,354 | $465 | $1,200-1,831 |
| **Medium Prod** | $8,671 | $2,264 | $4,530 |
| **With Optimizations (-30%)** | $6,070 | $1,585 | $3,171 |

---

## Cost Breakdown by Category (Medium Prod, GCP)

```
Compute (35% of cost):        $791.45
- Backend pods: $1,460.33 (but includes discount)

Storage (20%):                $451.70
- Disks: $95.20
- Database: included above

Database (30%):               $678.10
- Cloud SQL: $570.60
- Redis: $87.50

Networking (10%):             $50.75
- Load balancing: $18.25
- CDN: $8.50
- Egress: $24.00

Ops & Backup (5%):            ~$113/mo
```

---

## Recommendation

| Scenario | Preferred Cloud | Cost/Month | Notes |
|----------|-----------------|-----------|-------|
| Personal/Hobby | AWS Free Tier | $0 | 1-100 concurrent |
| Startup/Prototype | GCP (Compute E2) | $45-100 | Small prod tier |
| Mid-Size Service | GCP (commitment) | $2,264 | Best value |
| Enterprise/Multi-Region | AWS (volume discount) | $15,000+ | Global scale |

For a **profitable video chat platform**:
- Target: 10,000+ concurrent (2x medium prod)
- Estimated cost: $5,000-12,000/month
- Revenue model: Ads ($0.50-2 CPM), Premium features, or B2B licensing

