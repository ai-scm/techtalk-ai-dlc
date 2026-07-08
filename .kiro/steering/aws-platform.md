# AWS Platform Steering

## Purpose

This document defines the architectural standards for deploying applications on AWS.

---

# Architecture Overview

The cloud architecture mirrors the local development topology (Garden + Minikube) on managed AWS services:

| Local | Cloud |
|---|---|
| Minikube | Amazon EKS (Fargate) |
| Docker local builds | Kaniko in-cluster + Amazon ECR |
| NGINX Ingress | AWS Load Balancer Controller + ALB |
| PostgreSQL Helm | PostgreSQL Helm (in-cluster) |
| localhost | ALB endpoint |
| `garden deploy` | CodePipeline → `garden deploy --env test` |

---

# Infrastructure Technology Stack

| Component | Technology |
|---|---|
| Infrastructure as Code | AWS CDK v2 (TypeScript) |
| Source Control | GitHub |
| Source Integration | AWS CodeConnections |
| CI/CD Orchestration | AWS CodePipeline |
| Build | AWS CodeBuild |
| Container Registry | Amazon ECR |
| Container Build (cloud) | Kaniko (in-cluster) |
| Kubernetes | Amazon EKS |
| Compute | AWS Fargate (no EC2) |
| Load Balancer | ALB (via AWS LB Controller) |
| Secrets | AWS SSM Parameter Store |
| Monitoring | CloudWatch Logs |
| Database | PostgreSQL via Helm (in-cluster) |
| Application Deploy | Garden.io |

---

# What We Do NOT Use

These services were considered and explicitly rejected:

| Service | Reason |
|---|---|
| AWS Lambda | EKS Fargate provides container-native compute with same topology as local |
| API Gateway | ALB is cheaper and native to K8s via Ingress |
| S3 + CloudFront | Frontend runs as container in EKS (same as local) |
| Amazon RDS | PostgreSQL runs in-cluster for POC (configurable for production) |
| Amazon Cognito | Custom auth (bcrypt + JWT) for simplicity |
| DynamoDB | PostgreSQL is the single data store |

---

# EKS Cluster Configuration

| Property | Value |
|---|---|
| Compute | Fargate only (no EC2 node groups) |
| Kubernetes Version | 1.31 (or latest standard support) |
| Endpoint Access | Public + Private |
| OIDC Provider | Enabled (for IRSA) |
| kubectl Layer | `@aws-cdk/lambda-layer-kubectl-v31` |

## Fargate Profiles

| Profile | Namespace | Purpose |
|---|---|---|
| App | `dog-keeper-{env}` | Application pods (backend, bff, frontend, db) |
| System | `kube-system` | CoreDNS, ALB Controller |

## Key Concept: Each Pod = One Fargate Node

Fargate creates a micro-VM per pod. There are no shared nodes. Expect node count = pod count.

---

# Networking

- VPC and subnets **already exist** — imported by CDK, never created
- Pods run in **private subnets**
- ALB lives in **public subnets**
- Security groups: EKS SG (internal traffic) + ALB SG (HTTP/HTTPS from internet)

---

# Load Balancer (ALB)

Created automatically by the **AWS Load Balancer Controller** from Kubernetes Ingress annotations:

```yaml
metadata:
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/subnets: subnet-xxx,subnet-yyy
```

Routing:
- `/` → frontend:3000
- `/api` → bff:8001

The ALB controller runs as pods in `kube-system` namespace via Helm chart installed by CDK.

---

# Database Strategy

## Test/POC Environment
- PostgreSQL runs **inside the cluster** via Bitnami Helm chart
- No persistence (Fargate doesn't support EBS PVC)
- Data is ephemeral — use seed scripts for test data
- Service name: `db` (DNS: `db.dog-keeper-test.svc.cluster.local`)

## Future Production
- Configurable to use **Amazon RDS PostgreSQL**
- Switch via `database.type: 'rds'` in CDK config
- No application code changes needed (same connection string pattern)

---

# Secrets Management

- **AWS SSM Parameter Store** (SecureString)
- Path convention: `/dog-keeper/{env}/{param-name}`
- CDK creates parameters with placeholder values
- Sensitive values updated manually once after first deploy
- Pods access via IRSA (service account → IAM role → SSM read)

---

# Container Registry (ECR)

- Repository naming: `dog-keeper-{env}/{service}` (e.g., `dog-keeper-test/backend`)
- The slash format is required by Garden's `deploymentRegistry.namespace`
- MUTABLE tags for POC (allows pipeline re-runs)
- Scan on push enabled
- Lifecycle policy: max 10 images per repo

---

# Docker Base Images

Use **ECR Public Gallery** mirrors to avoid Docker Hub rate limiting in CodeBuild:

- Python: `public.ecr.aws/docker/library/python:3.11-slim`
- Node.js: `public.ecr.aws/docker/library/node:20-alpine`

Never use `docker.io` directly in CI/CD — will hit 429 errors.

---

# IAM Strategy

- Least privilege — no wildcards
- Dedicated roles per service:
  - EKS Cluster Role
  - Fargate Pod Execution Role
  - ALB Controller Role (IRSA)
  - App Pod Role (IRSA — SSM + CloudWatch)
  - CodeBuild Build Role (ECR push)
  - CodeBuild Test Role (EKS + ECR)
  - CodeBuild Deploy Role (EKS + ECR + SSM)

---

# Monitoring

- CloudWatch Log Groups per service (`/dog-keeper/{env}/{service}`)
- 7-day retention for POC
- Container Insights optional (additional cost)
- No alarms for POC — manual log review

---

# Naming Convention

| Resource | Pattern |
|---|---|
| EKS Cluster | `dog-keeper-{env}-eks` |
| ECR Repos | `dog-keeper-{env}/{service}` |
| Security Groups | `dog-keeper-{env}-{purpose}-sg` |
| Log Groups | `/dog-keeper/{env}/{service}` |
| SSM Parameters | `/dog-keeper/{env}/{param}` |
| CodePipeline | `dog-keeper-{env}-pipeline` |
| CodeBuild | `dog-keeper-{env}-{purpose}` |
| IAM Roles | `dog-keeper-{env}-{purpose}-role` |
| K8s Namespace | `dog-keeper-{env}` |

---

# Cost (Test Environment)

| Service | Monthly |
|---|---|
| EKS Control Plane | ~$73 |
| Fargate (~8-10 pods) | ~$20-30 |
| ALB | ~$16 |
| ECR | ~$1 |
| CloudWatch | ~$1-3 |
| SSM | Free |
| CodePipeline | ~$1 |
| CodeBuild | Pay per use |
| **Total** | **~$115-125/month** |

---

# Non Goals

This platform does NOT use:
- EC2 instances or node groups
- Lambda functions
- API Gateway
- S3 for hosting
- CloudFront
- RDS (for POC)
- Cognito
- DynamoDB
- Terraform / CloudFormation templates
- Manual console configuration
