# Deployment Strategy Steering

## Purpose

This document defines how software moves from a developer workstation into the cloud.

---

# Deployment Philosophy

- Same topology everywhere (local = cloud)
- Garden.io is the single deployment tool for all environments
- CDK manages infrastructure, Garden manages applications
- Containers are the deployment unit
- No environment-specific builds — same Dockerfiles everywhere

---

# Environments

| Environment | Purpose | Infrastructure | Deploy Method |
|---|---|---|---|
| `local` | Developer workstation | Minikube + Garden | `garden dev` / `garden deploy` |
| `test` | Cloud validation | EKS Fargate + ALB | CodePipeline → `garden deploy --env test` |
| `production` | Future | EKS Fargate + ALB | CodePipeline → `garden deploy --env production` |

---

# Local Development Flow

```
Developer → garden dev → Minikube → Hot Reload → Fast Feedback
```

1. `minikube start --addons=ingress`
2. `eval $(minikube -p minikube docker-env)`
3. `garden dev`
4. Access via `http://dog-keeper.local.app.garden` or `localhost:3000`

- Images built with local Docker daemon (no registry push)
- NGINX Ingress for routing
- PostgreSQL with persistence (PVC in Minikube)
- File sync for hot-reload (no rebuild needed)

---

# Cloud Deployment Flow

```
Git Push → CodePipeline → Build (ECR) → Test (Garden) → Approve → Deploy (Garden)
```

1. Developer pushes to GitHub branch
2. CodePipeline triggers automatically
3. CodeBuild builds Docker images, pushes to ECR
4. CodeBuild runs `garden test --env test` (unit tests as ephemeral pods)
5. Manual approval gate
6. CodeBuild runs `garden deploy --env test --yes`
7. Garden applies K8s manifests, Kaniko builds if needed
8. ALB Controller creates/updates load balancer

---

# What Garden Does in Each Environment

| Action | Local | Cloud (test) |
|---|---|---|
| Build mode | `local-docker` (Minikube daemon) | `kaniko` (in-cluster) |
| Registry | None (local images) | ECR (`dog-keeper-test/{service}`) |
| Ingress class | `nginx` | `alb` |
| DB persistence | PVC (Minikube) | Disabled (ephemeral) |
| Deploy command | `garden deploy` | `garden deploy --env test --yes` |
| Test command | `garden test` | `garden test --env test --force` |

---

# Garden Project Configuration

```yaml
environments:
  - name: local
    defaultNamespace: dog-keeper-${kebabCase(local.username)}
  - name: test
    defaultNamespace: dog-keeper-test

providers:
  - name: local-kubernetes
    environments: [local]
    buildMode: local-docker
    context: minikube
  - name: kubernetes
    environments: [test]
    buildMode: kaniko
    context: arn:aws:eks:REGION:ACCOUNT:cluster/CLUSTER
    deploymentRegistry:
      hostname: ACCOUNT.dkr.ecr.REGION.amazonaws.com
      namespace: dog-keeper-test
    imagePullSecrets:
      - name: ecr-registry-credentials
```

---

# Deployment Order (Garden DAG)

```
deploy.db → deploy.backend → deploy.bff → deploy.frontend
```

Each service declares its dependencies. Garden resolves the order automatically.

---

# Ingress Strategy

The base `ingress.yml` has NO `ingressClassName`. Garden patches it per environment:

- **Local**: `kubernetes.io/ingress.class: nginx` + host-based routing
- **Test**: `kubernetes.io/ingress.class: alb` + ALB annotations (scheme, target-type, subnets)

The ALB is created automatically by the AWS Load Balancer Controller from annotations.

---

# Container Build Strategy

## Local
- Docker daemon on Minikube (no push to registry)
- Fast rebuilds with layer caching
- Multi-stage Dockerfiles with `development` stage for hot-reload

## Cloud
- **Build stage** (CodeBuild): Docker build + push to ECR with commit hash tag
- **Deploy stage** (Garden/Kaniko): Kaniko builds in-cluster if image not in ECR
- ECR Public Gallery for base images (avoids Docker Hub rate limits)

---

# Database Strategy

| Environment | Type | Persistence | Data |
|---|---|---|---|
| Local | Helm PostgreSQL | PVC (survives restarts) | Seed script |
| Test | Helm PostgreSQL | Disabled (Fargate limitation) | Ephemeral |
| Production (future) | Amazon RDS | Managed | Persistent |

Configurable via Garden variable: `persistence.enabled: "${environment.name == 'local' ? true : false}"`

---

# Rollback Strategy

- Rollback = re-deploy previous image tag
- ECR retains last 10 images (lifecycle policy)
- `garden deploy --env test --yes` with previous commit hash
- No infrastructure changes needed for rollback

---

# Secrets Strategy

- **SSM Parameter Store** for cloud secrets
- **Environment variables** in Garden for local development
- Pods access SSM via IRSA (IAM Role for Service Account)
- CDK creates parameters with placeholder values
- Sensitive values updated manually once after first deploy

---

# Scaling Strategy

- Fargate scales by adding pods (each pod = new node)
- Horizontal Pod Autoscaler (HPA) for future auto-scaling
- Current POC: 1 replica per service (sufficient for <50 users)

---

# Monitoring Strategy

- CloudWatch Log Groups per service (7-day retention)
- `kubectl logs` for real-time debugging
- No alarms for POC — manual log review
- Future: Container Insights, X-Ray tracing

---

# Platform Responsibilities

| Responsibility | Tool |
|---|---|
| Source Control | GitHub |
| Repository Integration | AWS CodeConnections |
| CI/CD Orchestration | AWS CodePipeline |
| Build | AWS CodeBuild (Docker) |
| Infrastructure | AWS CDK |
| Container Registry | Amazon ECR |
| Kubernetes Runtime | Amazon EKS (Fargate) |
| Application Deployment | Garden.io |
| Local Development | Garden Dev + Minikube |
| Secrets | AWS SSM Parameter Store |
| Monitoring | CloudWatch Logs |
| Load Balancing | ALB (AWS LB Controller) |

---

# Critical Rules

1. **Fargate doesn't support PVC with EBS** — disable persistence for PostgreSQL in cloud
2. **Docker Hub rate limits** — always use ECR Public Gallery for base images
3. **Garden needs git** — `git init` in CodeBuild before any Garden command
4. **ECR auth for Kaniko** — create K8s docker-registry secret before Garden deploy
5. **SSO roles in aws-auth** — use ARN WITHOUT path (`/aws-reserved/sso.amazonaws.com/`)
6. **ALB Controller needs DescribeRouteTables** — without it, subnet discovery fails silently
7. **Vite allowedHosts** — set to `true` when behind ALB (dynamic hostnames)
8. **MUTABLE ECR tags for POC** — allows pipeline re-runs without manual cleanup

---

# Non Goals

- Manual deployments to cloud
- Deployments from developer machines to cloud
- Infrastructure managed by Garden
- Applications deployed by CDK
- Environment-specific Docker builds
- Production hotfixes outside the pipeline
