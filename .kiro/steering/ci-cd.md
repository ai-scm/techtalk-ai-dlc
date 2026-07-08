# CI/CD Steering

## Purpose

This document defines the CI/CD pipeline architecture.

These rules are mandatory for all pipeline configurations.

---

# Pipeline Architecture (5 Stages)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Source  │ →  │  Build   │ →  │   Test   │ →  │ Approve  │ →  │  Deploy  │
│          │    │          │    │          │    │          │    │          │
│ GitHub   │    │ Docker   │    │ Garden   │    │ Manual   │    │ Garden   │
│ pull     │    │ build +  │    │ test     │    │ approval │    │ deploy   │
│          │    │ push ECR │    │ (unit)   │    │          │    │ --env    │
│          │    │          │    │ in EKS   │    │          │    │ test     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

# Stage 1: Source

- Provider: **AWS CodeConnections** (GitHub)
- Trigger: Push to configured branch
- Output: Source artifact passed to all subsequent stages
- Connection ARN must exist beforehand (created once in AWS Console, confirmed via OAuth)

---

# Stage 2: Build

- Tool: **AWS CodeBuild** (privileged mode for Docker)
- Responsibilities:
  - Authenticate to ECR
  - Docker build all services (backend, bff, frontend)
  - Push images to ECR with commit hash as tag
  - Output `imagedefinitions.json` with IMAGE_TAG

### Critical Rules:
- Use **ECR Public Gallery** base images (avoids Docker Hub 429 rate limiting):
  - `public.ecr.aws/docker/library/python:3.11-slim`
  - `public.ecr.aws/docker/library/node:20-alpine`
- Tag images with short commit hash (7 chars)
- ECR repos use MUTABLE tags for POC (allows re-runs)

---

# Stage 3: Test

- Tool: **AWS CodeBuild** + **Garden** (running tests as ephemeral pods in EKS)
- Command: `garden test --env test --force`
- Garden creates ephemeral pods in EKS using the images just pushed to ECR
- Tests run inside the cluster, then pods are destroyed
- Does NOT require services to be deployed (only needs images + cluster access)

### Required Setup in CodeBuild:
1. Install kubectl + Garden + aws-iam-authenticator
2. Configure kubeconfig for EKS
3. Create ECR docker-registry secret in namespace
4. Initialize git repo (Garden requires git root)
5. Run `garden test`

---

# Stage 4: Approve

- Tool: **CodePipeline Manual Approval Action**
- Blocks until human approves
- Shows build + test results context
- Only after approval does code reach the cluster

---

# Stage 5: Deploy

- Tool: **AWS CodeBuild** + **Garden**
- Command: `garden deploy --env test --yes`
- Garden deploys all services to EKS using Kubernetes manifests
- Uses Kaniko for any in-cluster image builds needed
- ALB Ingress created automatically by AWS LB Controller

### Required Setup in CodeBuild:
1. Install kubectl + Helm + Garden + aws-iam-authenticator
2. Configure kubeconfig for EKS
3. Create ECR docker-registry secret in namespace
4. Initialize git repo
5. Map admin SSO role in aws-auth (idempotent)
6. Run `garden deploy --env test --yes`
7. Verify pods are ready

---

# CodeBuild — Critical Workarounds

## Git Init (MANDATORY)

CodePipeline passes source as a zip without `.git` directory. Garden requires a git root:

```bash
git config --global user.email "codebuild@dog-keeper.local"
git config --global user.name "CodeBuild"
git init && git add . && git commit -m "codebuild" --allow-empty --no-verify
```

## ECR Authentication for Kaniko

Garden's Kaniko builder needs ECR credentials as a Kubernetes secret:

```bash
kubectl create namespace dog-keeper-test --dry-run=client -o yaml | kubectl apply -f -
kubectl delete secret ecr-registry-credentials -n dog-keeper-test --ignore-not-found
kubectl create secret docker-registry ecr-registry-credentials \
  -n dog-keeper-test \
  --docker-server=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region $AWS_REGION)
```

## Admin Role Mapping (Idempotent)

Map SSO admin role for console/kubectl access:

```bash
kubectl get configmap aws-auth -n kube-system -o json | \
  python3 -c "import json,sys; cm=json.load(sys.stdin); ..." | \
  kubectl apply -f -
```

Use ARN **without path** for SSO roles.

---

# IAM Roles (3 CodeBuild Roles)

| Role | Purpose | Key Permissions |
|---|---|---|
| Build Role | Docker build + ECR push | `ecr:*LayerUpload`, `ecr:PutImage`, `ecr:GetAuthorizationToken` |
| Test Role | Run Garden tests in EKS | `eks:DescribeCluster`, `ecr:*`, `sts:GetCallerIdentity` |
| Deploy Role | Garden deploy to EKS | `eks:*`, `ecr:*`, `ssm:GetParameter`, `sts:GetCallerIdentity` |

All roles also need `logs:CreateLogGroup/Stream`, `logs:PutLogEvents`.

Deploy and Test roles must be mapped in EKS `aws-auth` ConfigMap with `system:masters`.

---

# Garden Configuration for Cloud

```yaml
# project.garden.yml
environments:
  - name: test
    defaultNamespace: dog-keeper-test

providers:
  - name: kubernetes
    environments: [test]
    namespace: dog-keeper-test
    context: arn:aws:eks:<REGION>:<ACCOUNT>:cluster/<CLUSTER>
    buildMode: kaniko
    kaniko:
      namespace: dog-keeper-test
      extraFlags: [--cache=true]
    deploymentRegistry:
      hostname: <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com
      namespace: dog-keeper-test
    imagePullSecrets:
      - name: ecr-registry-credentials
        namespace: dog-keeper-test
```

---

# Ingress — Environment-Conditional

The Ingress manifest must use different annotations per environment:

```yaml
# Garden patch in frontend/garden.yml
annotations:
  kubernetes.io/ingress.class: "${environment.name == 'test' ? 'alb' : 'nginx'}"
  alb.ingress.kubernetes.io/scheme: "internet-facing"
  alb.ingress.kubernetes.io/target-type: "ip"
  alb.ingress.kubernetes.io/subnets: "subnet-xxx,subnet-yyy"
```

- `local` → NGINX Ingress (Minikube addon)
- `test` → ALB (AWS Load Balancer Controller)

---

# Vite Dev Server — allowedHosts

When running Vite in a container behind ALB, set `allowedHosts: true` in `vite.config.ts` to accept any hostname:

```typescript
server: {
  allowedHosts: true,
}
```

Without this, Vite blocks requests from the ALB DNS hostname.

---

# Failure Policy

- Pipeline stops immediately on any stage failure
- Build failures block Test
- Test failures block Approve
- Deploy failures are reported but don't roll back (manual intervention)

---

# Non Goals

The CI/CD pipeline does NOT:
- Create AWS infrastructure (that's CDK's job)
- Deploy from developer machines
- Skip manual approval for cloud deploys
- Use Lambda or API Gateway
- Build images outside of Docker/Kaniko
