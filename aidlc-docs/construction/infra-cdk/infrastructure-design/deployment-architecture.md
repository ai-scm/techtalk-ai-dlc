# Deployment Architecture — Unit 4: AWS CDK

**Generated**: 2026-07-07
**Stage**: CONSTRUCTION — Infrastructure Design
**Unit**: Infrastructure (AWS CDK)

---

## Cloud Deployment Topology

```
+------------------+
|    Internet      |
+--------+---------+
         |
+--------v---------+
|   ALB (Public)   |
| dog-keeper-test  |
+--------+---------+
         |
         | Routing:
         |  / --> frontend:3000
         |  /api/* --> bff:8001
         |
+--------v-----------------------------------------+
|          EKS Cluster (Fargate)                   |
|          Namespace: dog-keeper-test              |
|                                                  |
|  +------------+  +---------+  +-----------+     |
|  | frontend   |  |  bff    |  | backend   |     |
|  | :3000      |  |  :8001  |  | :8000     |     |
|  +------------+  +----+----+  +-----+-----+     |
|                       |              |           |
|                       |   HTTP       |   SQL     |
|                       +------>       +------>    |
|                                                  |
|                              +----------+        |
|                              |   db     |        |
|                              | (Helm)   |        |
|                              | :5432    |        |
|                              +----------+        |
|                              PVC: 10Gi gp3       |
+--------------------------------------------------+
         |
         | (IRSA)
         v
+--------------------------------------------------+
|       AWS Services                               |
|                                                  |
|  +------------------+  +---------------------+   |
|  | SSM Param Store  |  | CloudWatch Logs     |   |
|  | /dog-keeper/test |  | /dog-keeper/test/*  |   |
|  +------------------+  +---------------------+   |
|                                                  |
|  +------------------+  +---------------------+   |
|  | Amazon ECR       |  | CodePipeline        |   |
|  | (3 repos)        |  | + CodeBuild         |   |
|  +------------------+  +---------------------+   |
+--------------------------------------------------+
```

---

## Diferencias: Local vs Cloud

| Aspecto | Local (Garden + Minikube) | Cloud (AWS EKS + Fargate) |
|---|---|---|
| Cluster | Minikube (single-node) | EKS managed (multi-AZ Fargate) |
| Compute | Docker containers local | Fargate pods |
| Ingress | NGINX Ingress Controller | AWS Load Balancer Controller + ALB |
| DB | Helm PostgreSQL (ephemeral or PVC) | Helm PostgreSQL (EBS PVC) |
| Registry | Local Docker daemon | Amazon ECR |
| Secrets | Environment vars (garden.yml) | SSM Parameter Store (IRSA) |
| Builds | `docker build` local | CodeBuild → ECR |
| Deploy | `garden deploy` (local) | CodePipeline → Garden deploy (remote) |
| DNS | `dog-keeper.local.app.garden` | ALB default DNS |
| TLS | No (HTTP only) | Optional (ACM + ALB) |

---

## CI/CD Pipeline Flow

```
Developer
    |
    v
Git Push (GitHub)
    |
    v
AWS CodeConnections
    |
    v
CodePipeline (Source Stage)
    |
    v
CodeBuild (Build Stage)
    |-- npm install / pip install
    |-- lint + unit tests
    |-- docker build (backend, bff, frontend)
    |-- docker push → ECR
    |
    v
CodeBuild (Deploy Stage)
    |-- configure kubectl (EKS credentials)
    |-- garden deploy --env test
    |
    v
CodeBuild (Smoke Tests)
    |-- health check endpoints
    |-- basic API validation
    |
    v
Manual Approval (future: prod gate)
    |
    v
[Future: Deploy Production]
```

---

## Kubernetes Resources in EKS (deployed by Garden)

Garden despliega los **mismos manifiestos** que en local, con diferencias en:

| Recurso | Cambio vs Local |
|---|---|
| Deployment images | ECR URLs (`<account>.dkr.ecr.<region>.amazonaws.com/dog-keeper-test-*`) |
| Ingress | ALB annotations en lugar de NGINX class |
| DB credentials | Mounted from SSM via init-container/env |
| Resource requests | Ajustados para Fargate (mínimo 0.25 vCPU, 0.5 GB) |
| Namespace | `dog-keeper-test` |

### Ingress Annotations (ALB)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: frontend
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/subnets: <public-subnet-1>,<public-subnet-2>
spec:
  rules:
    - http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: bff
                port:
                  number: 8001
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
```

---

## Garden Environment Configuration (Cloud)

Garden necesita un environment `test` que use el cluster EKS:

```yaml
# project.garden.yml (additions)
environments:
  - name: test
    defaultNamespace: dog-keeper-test
    variables:
      baseHostname: <ALB_DNS>
      bffUrl: /api

providers:
  - name: kubernetes
    environments: [test]
    namespace: dog-keeper-test
    context: arn:aws:eks:<region>:<account>:cluster/dog-keeper-test-eks
    buildMode: cluster-buildkit  # or pre-built images from ECR
```

---

## Fargate Pod Sizing

| Pod | vCPU | Memory | Justificación |
|---|---|---|---|
| frontend | 0.25 | 0.5 GB | Sirve assets estáticos, bajo CPU |
| bff | 0.25 | 0.5 GB | Proxy HTTP, bajo consumo |
| backend | 0.5 | 1 GB | Business logic + DB queries |
| db (PostgreSQL) | 0.5 | 1 GB | Helm chart, datos en EBS |

*Nota*: Fargate pricing es por vCPU-hora y GB-hora. Estos son los tamaños mínimos viables.

---

## EKS Access & Authentication

| Actor | Método | Permisos |
|---|---|---|
| CDK (deploy) | IAM role (cluster creator) | `system:masters` |
| CodeBuild (deploy) | IAM role assumed by CodeBuild | Custom RBAC (deploy to namespace) |
| Developer (debug) | IAM user + `aws eks update-kubeconfig` | Read-only or admin (configurable) |
| Pods (app) | IRSA (service account → IAM role) | SSM read, CloudWatch write |

---

## Network Flow

```
Internet → ALB (public subnets)
              |
              | [Security Group: 80/443 inbound]
              v
         EKS Fargate (private subnets)
              |
              | [Security Group: 3000/8001/8000/5432 internal]
              v
         Pod-to-Pod (cluster networking)
              |
              v
         Pod → SSM (via VPC endpoint or NAT)
         Pod → CloudWatch (via VPC endpoint or NAT)
         Pod → ECR (via VPC endpoint or NAT)
```

### VPC Endpoints (Recomendados para reducir NAT costs)

| Endpoint | Servicio | Tipo |
|---|---|---|
| `com.amazonaws.<region>.ssm` | SSM Parameter Store | Interface |
| `com.amazonaws.<region>.ecr.api` | ECR API | Interface |
| `com.amazonaws.<region>.ecr.dkr` | ECR Docker | Interface |
| `com.amazonaws.<region>.s3` | S3 (ECR layer storage) | Gateway |
| `com.amazonaws.<region>.logs` | CloudWatch Logs | Interface |
| `com.amazonaws.<region>.sts` | STS (IRSA) | Interface |

*Nota*: Si la VPC existente ya tiene NAT Gateway, los VPC endpoints son opcionales (optimización de costos). CDK puede crearlos condicionalmente.

---

## Extensibility

### Future Production Environment

Para agregar un ambiente de producción:

1. Crear `config/production.ts` con:
   - `database.type: 'rds'` (RDS PostgreSQL managed)
   - `database.instanceClass: 'db.t4g.micro'`
   - `database.multiAz: true`
   - `database.backupRetention: 7`
2. Agregar Fargate Profile con namespace `dog-keeper-production`
3. Agregar Manual Approval stage en Pipeline antes de deploy prod
4. Garden environment `production` apuntando al mismo cluster (diferente namespace)

### Future Services

Nuevos servicios se agregan como:
1. Nuevo ECR repository (en `EcrConstruct`)
2. Nueva Fargate Profile selector (si namespace diferente)
3. Nuevo Garden service (mismo patrón que backend/bff/frontend)

---

## Decisions Log

| Decisión | Elección | Justificación |
|---|---|---|
| Compute | EKS Fargate (no Lambda) | Misma topología que local, contenedores reutilizables |
| Load Balancer | ALB via AWS LB Controller (no API Gateway) | Más simple, más barato, native K8s integration |
| Database | Helm in-cluster (no RDS) | POC simple, configurable para RDS en prod |
| VPC | Importada (no creada) | Reutiliza infraestructura existente de la cuenta |
| Secrets | SSM Parameter Store | Gratis, suficiente para POC |
| Frontend hosting | EKS pod (no S3+CloudFront) | Consistencia con el resto, un solo punto de deploy |
| Environments | Solo `test` | Local = dev; test en AWS; prod futuro |
| Domain | AWS defaults | Sin costo adicional de Route53/ACM para POC |
| WAF | No | No necesario para POC |
| Monitoring | CloudWatch Logs mínimo | Free tier, suficiente para POC |
