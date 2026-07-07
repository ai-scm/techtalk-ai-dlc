# Infrastructure Design — Unit 4: AWS CDK

**Generated**: 2026-07-07
**Stage**: CONSTRUCTION — Infrastructure Design
**Unit**: Infrastructure (AWS CDK)
**Environment**: AWS Cloud — Test

---

## Architecture Overview

La arquitectura cloud replica la topología de desarrollo local (Garden + Minikube) pero sobre servicios administrados de AWS:

| Local (Garden/Minikube) | Cloud (AWS) |
|---|---|
| Minikube cluster | Amazon EKS (Fargate) |
| Docker local builds | Amazon ECR |
| NGINX Ingress | Application Load Balancer (ALB) |
| PostgreSQL Helm chart | PostgreSQL Helm chart (in-cluster) |
| localhost / port-forward | ALB endpoint (default AWS URL) |
| Garden deploy | CodePipeline + Garden deploy |

**Principio**: misma topología, diferente infraestructura subyacente.

---

## Stack Architecture

```
+------------------------------------------------------+
|                    AWS Account                        |
|                                                      |
|  +------------------------------------------+        |
|  |          VPC (Existing, imported)         |        |
|  |                                           |        |
|  |  +------------------+  +--------------+   |        |
|  |  | Private Subnet A |  | Private Sub B|   |        |
|  |  |                  |  |              |   |        |
|  |  |  +---------------------------+     |   |        |
|  |  |  |     EKS Cluster (Fargate) |     |   |        |
|  |  |  |                           |     |   |        |
|  |  |  |  [frontend]  [bff]        |     |   |        |
|  |  |  |  [backend]   [db-helm]    |     |   |        |
|  |  |  +---------------------------+     |   |        |
|  |  +------------------+  +--------------+   |        |
|  |                                           |        |
|  |  +--------------------------------------+ |        |
|  |  | Public Subnets                       | |        |
|  |  |  [ALB] <-- Internet traffic          | |        |
|  |  +--------------------------------------+ |        |
|  +------------------------------------------+        |
|                                                      |
|  +------------------+  +---------------------+       |
|  |   Amazon ECR     |  | SSM Parameter Store |       |
|  |  (3 repos)       |  | (secrets)           |       |
|  +------------------+  +---------------------+       |
|                                                      |
|  +------------------+  +---------------------+       |
|  |  CloudWatch Logs |  | CodePipeline        |       |
|  +------------------+  +---------------------+       |
+------------------------------------------------------+
```

---

## CDK Stacks (Nested Stack Architecture)

Un **stack padre** (`DogKeeperStack`) contiene todos los recursos como **nested stacks**. Esto permite desplegar y destruir toda la infraestructura con un solo comando (`cdk deploy` / `cdk destroy`).

### Stack Parent

| Stack | Tipo | Responsabilidad |
|---|---|---|
| `DogKeeperStack` | **Parent (root)** | Orquesta todos los nested stacks |

### Nested Stacks

| Nested Stack | Responsabilidad | Recursos Principales |
|---|---|---|
| `NetworkingNestedStack` | Importar VPC/subnets existentes | VPC lookup, Security Groups |
| `EcrNestedStack` | Container Registry | 3 ECR repositories |
| `EksNestedStack` | Kubernetes cluster | EKS, Fargate Profiles, OIDC, IAM Roles, ALB Controller |
| `MonitoringNestedStack` | Observabilidad | CloudWatch Log Groups, Container Insights |
| `PipelineNestedStack` | CI/CD | CodePipeline, CodeBuild, CodeConnections |

### Ventajas del enfoque nested
- `cdk deploy DogKeeperStack` despliega TODO
- `cdk destroy DogKeeperStack` elimina TODO
- Dependencias internas resueltas automáticamente por CloudFormation
- Un solo stack en la consola de CloudFormation (con nested expandibles)
- Los Constructs siguen siendo modulares y reutilizables internamente

---

## Stack 1: Networking (`DogKeeperNetworkingStack`)

### Estrategia
VPC y subnets **ya existen** en la cuenta AWS. CDK las importa por configuración.

### Recursos

| Recurso | Tipo | Configuración |
|---|---|---|
| VPC | Import (lookup) | `vpcId` desde config |
| Private Subnets | Import | ARNs/IDs desde config (mínimo 2 AZs) |
| Public Subnets | Import | ARNs/IDs desde config (para ALB) |
| EKS Security Group | Create | Ingress: 443 (API server), 8000/8001/3000 (pods) |
| ALB Security Group | Create | Ingress: 80/443 from 0.0.0.0/0 |

### Props Interface

```typescript
interface NetworkingConstructProps {
  readonly vpcId: string;
  readonly privateSubnetIds: string[];
  readonly publicSubnetIds: string[];
  readonly environment: string;
}
```

### Outputs
- VPC reference
- Private subnet selection
- Public subnet selection
- EKS security group
- ALB security group

---

## Stack 2: ECR (`DogKeeperEcrStack`)

### Recursos

| Repositorio | Nombre | Propósito |
|---|---|---|
| Backend | `dog-keeper-test-backend` | Imagen del backend API |
| BFF | `dog-keeper-test-bff` | Imagen del BFF |
| Frontend | `dog-keeper-test-frontend` | Imagen del frontend |

### Configuración por repositorio
- Image tag mutability: IMMUTABLE
- Image scanning on push: Enabled
- Lifecycle policy: Max 10 imágenes (eliminar las más antiguas)
- Encryption: AES-256 (default)

### Props Interface

```typescript
interface EcrConstructProps {
  readonly environment: string;
  readonly maxImageCount?: number;  // default: 10
}
```

---

## Stack 3: EKS (`DogKeeperEksStack`)

### Cluster Configuration

| Propiedad | Valor |
|---|---|
| Cluster name | `dog-keeper-test-eks` |
| Kubernetes version | 1.29 (o latest supported) |
| Control plane | Managed by AWS |
| Compute | Fargate only (no EC2 node groups) |
| Endpoint access | Public + Private |
| OIDC Provider | Enabled |

### Fargate Profiles

| Profile | Namespace | Selectors |
|---|---|---|
| `dog-keeper-app` | `dog-keeper-test` | Labels: `app: backend`, `app: bff`, `app: frontend`, `app: db` |
| `kube-system` | `kube-system` | CoreDNS, ALB controller |

### AWS Load Balancer Controller
- Instalado como addon de EKS
- Permite crear ALB desde Ingress annotations de Kubernetes
- IAM role via IRSA (IAM Roles for Service Accounts)

### ALB (Application Load Balancer)
- Creado automáticamente por el ALB Ingress Controller a partir de K8s Ingress annotations
- Subnets: Public
- Scheme: internet-facing
- Routing:
  - `/` → frontend:3000
  - `/api/*` → bff:8001

### IAM Roles

| Role | Propósito | Permisos |
|---|---|---|
| EKS Cluster Role | Control plane | `AmazonEKSClusterPolicy` |
| Fargate Pod Execution Role | Pod execution | `AmazonEKSFargatePodExecutionRolePolicy` |
| ALB Controller Role (IRSA) | Load Balancer management | ALB controller policy |
| App Pod Role (IRSA) | SSM access from pods | `ssm:GetParameter`, `ssm:GetParametersByPath` |

### Props Interface

```typescript
interface EksConstructProps {
  readonly environment: string;
  readonly vpc: ec2.IVpc;
  readonly privateSubnets: ec2.ISubnet[];
  readonly publicSubnets: ec2.ISubnet[];
  readonly eksSecurityGroup: ec2.ISecurityGroup;
}
```

---

## Stack 4: Monitoring (`DogKeeperMonitoringStack`)

### Recursos

| Recurso | Configuración |
|---|---|
| Log Group: Backend | `/dog-keeper/test/backend`, retención: 7 días |
| Log Group: BFF | `/dog-keeper/test/bff`, retención: 7 días |
| Log Group: Frontend | `/dog-keeper/test/frontend`, retención: 7 días |
| Log Group: EKS | `/dog-keeper/test/eks`, retención: 7 días |
| Container Insights | Enabled on cluster (opcional, costo adicional) |

### Props Interface

```typescript
interface MonitoringConstructProps {
  readonly environment: string;
  readonly logRetentionDays?: number;  // default: 7
}
```

---

## Stack 5: Pipeline (`DogKeeperPipelineStack`)

### Pipeline Architecture

```
GitHub → CodeConnections → CodePipeline → CodeBuild → ECR → Garden Deploy (EKS)
```

### Stages

| Stage | Acción | Tool |
|---|---|---|
| Source | Pull from GitHub | CodeConnections |
| Build | Lint + Unit Tests + Docker Build + Push to ECR | CodeBuild |
| Deploy Test | `garden deploy` to EKS test namespace | CodeBuild (with kubectl/garden) |
| Smoke Tests | Health checks + basic validation | CodeBuild |
| Manual Approval | Gate before production (future) | Manual Approval Action |

### CodeBuild Projects

| Project | Propósito | Compute |
|---|---|---|
| `dog-keeper-test-build` | Build + test + push images | Standard (3 GB, 2 vCPU) |
| `dog-keeper-test-deploy` | Garden deploy to EKS | Standard |

### CodeConnections
- Provider: GitHub
- Managed connection (no PATs)

### Props Interface

```typescript
interface PipelineConstructProps {
  readonly environment: string;
  readonly ecrRepositories: ecr.IRepository[];
  readonly eksCluster: eks.ICluster;
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly githubBranch?: string;  // default: 'main'
}
```

---

## Database Strategy (In-Cluster)

### Test Environment
PostgreSQL corre **dentro del cluster EKS** desplegado con Helm (Bitnami PostgreSQL chart) — mismo mecanismo que desarrollo local.

| Propiedad | Valor |
|---|---|
| Chart | bitnami/postgresql 15.5.21 |
| Namespace | `dog-keeper-test` |
| Service name | `db` |
| Port | 5432 |
| Storage | EBS-backed PVC (gp3, 10Gi) |
| Credentials | SSM Parameter Store |

### Future Production (configurable)
Para ambientes de producción, la DB se puede cambiar a RDS PostgreSQL via configuración CDK:

```typescript
interface DatabaseConfig {
  readonly type: 'in-cluster' | 'rds';
  // Si type == 'rds':
  readonly instanceClass?: string;   // e.g., 'db.t4g.micro'
  readonly multiAz?: boolean;
  readonly backupRetention?: number; // days
}
```

---

## Secrets Management

### SSM Parameter Store (SecureString)

| Parameter | Path | Type |
|---|---|---|
| JWT Secret | `/dog-keeper/test/jwt-secret` | SecureString |
| DB Password | `/dog-keeper/test/db-password` | SecureString |
| DB Username | `/dog-keeper/test/db-username` | String |
| DB Host | `/dog-keeper/test/db-host` | String |
| DB Name | `/dog-keeper/test/db-name` | String |

### Access Pattern
- Pods acceden via IRSA (IAM Role for Service Account con permisos `ssm:GetParameter`)
- Init container o app startup lee parámetros y los expone como env vars

---

## Environment Configuration

### `config/test.ts`

```typescript
export const testConfig: EnvironmentConfig = {
  environment: 'test',
  account: '<AWS_ACCOUNT_ID>',
  region: '<AWS_REGION>',
  
  networking: {
    vpcId: '<EXISTING_VPC_ID>',
    privateSubnetIds: ['<SUBNET_1>', '<SUBNET_2>'],
    publicSubnetIds: ['<SUBNET_3>', '<SUBNET_4>'],
  },
  
  eks: {
    clusterName: 'dog-keeper-test-eks',
    kubernetesVersion: '1.29',
    namespace: 'dog-keeper-test',
  },
  
  database: {
    type: 'in-cluster',  // 'rds' for production
  },
  
  pipeline: {
    githubOwner: '<GITHUB_OWNER>',
    githubRepo: '<GITHUB_REPO>',
    githubBranch: 'main',
  },
  
  monitoring: {
    logRetentionDays: 7,
    containerInsights: false,
  },
  
  tags: {
    Application: 'dog-keeper',
    Environment: 'test',
    ManagedBy: 'cdk',
  },
};
```

---

## CDK Project Structure

```
/infra/cdk/
├── bin/
│   └── app.ts                    # CDK app entrypoint (instantiates DogKeeperStack)
├── lib/
│   ├── dog-keeper-stack.ts       # Parent stack (orchestrates nested stacks)
│   ├── networking/
│   │   └── networking-construct.ts
│   ├── ecr/
│   │   └── ecr-construct.ts
│   ├── eks/
│   │   └── eks-construct.ts
│   ├── monitoring/
│   │   └── monitoring-construct.ts
│   ├── pipeline/
│   │   └── pipeline-construct.ts
│   └── shared/
│       └── types.ts              # Shared interfaces
├── config/
│   └── test.ts                   # Test environment config
├── test/
│   ├── dog-keeper-stack.test.ts  # Parent stack test
│   ├── networking.test.ts
│   ├── ecr.test.ts
│   ├── eks.test.ts
│   └── pipeline.test.ts
├── package.json
├── tsconfig.json
└── cdk.json
```

### `bin/app.ts` (Entry Point)

```typescript
const app = new cdk.App();

new DogKeeperStack(app, 'DogKeeperStack', {
  env: { account: testConfig.account, region: testConfig.region },
  config: testConfig,
});
```

### `lib/dog-keeper-stack.ts` (Parent Stack)

```typescript
export class DogKeeperStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DogKeeperStackProps) {
    super(scope, id, props);

    const networking = new NetworkingConstruct(this, 'Networking', { ... });
    const ecr = new EcrConstruct(this, 'Ecr', { ... });
    const eks = new EksConstruct(this, 'Eks', { vpc: networking.vpc, ... });
    const monitoring = new MonitoringConstruct(this, 'Monitoring', { ... });
    const pipeline = new PipelineConstruct(this, 'Pipeline', { ecr, eks, ... });
  }
}
```

**Nota**: Los Constructs se mantienen como módulos independientes y reutilizables. La diferencia es que todos viven dentro de un solo Stack en lugar de ser stacks separados. Esto NO usa `NestedStack` de CDK (que crea CloudFormation anidado) sino simplemente Constructs dentro de un Stack — es la opción más simple y limpia para deploy/destroy atómico.

---

## Naming Convention

| Recurso | Nombre |
|---|---|
| Parent Stack | `DogKeeperStack` |
| ECR repos | `dog-keeper-test-{service}` |
| EKS cluster | `dog-keeper-test-eks` |
| Security Groups | `dog-keeper-test-{purpose}-sg` |
| Log Groups | `/dog-keeper/test/{service}` |
| SSM Parameters | `/dog-keeper/test/{param}` |
| CodePipeline | `dog-keeper-test-pipeline` |
| CodeBuild | `dog-keeper-test-{purpose}` |

---

## Tags (Applied to All Resources)

| Tag | Value |
|---|---|
| Application | dog-keeper |
| Environment | test |
| ManagedBy | cdk |
| Owner | (configurable) |

---

## Security Defaults

- No public subnets for pods (Fargate in private subnets)
- ALB in public subnets (only internet-facing resource)
- ECR image scanning enabled
- IMMUTABLE image tags
- IAM least privilege (no wildcards)
- SSM SecureString for secrets (encrypted at rest with AWS managed key)
- Security groups: minimal ingress rules
- No public DB access

---

## Deployment Order (CDK)

Un solo comando despliega toda la infraestructura:

```bash
cdk deploy DogKeeperStack
```

Internamente, los Constructs se instancian en orden de dependencia:

```
1. NetworkingConstruct     (importa VPC)
2. EcrConstruct            (crea repos)
3. EksConstruct            (crea cluster, usa networking)
4. MonitoringConstruct     (log groups)
5. PipelineConstruct       (CI/CD, usa ECR + EKS)
```

Para destruir todo:

```bash
cdk destroy DogKeeperStack
```

---

## Cost Estimate (Test Environment)

| Servicio | Costo Estimado (mensual) |
|---|---|
| EKS Control Plane | ~$73 |
| Fargate (4 pods, 0.25 vCPU / 0.5GB cada uno) | ~$15-25 |
| ALB | ~$16 + LCU |
| ECR (3 repos, <1GB) | ~$1 |
| CloudWatch Logs | ~$1-3 |
| SSM Parameter Store | Free (Standard) |
| CodePipeline | ~$1/pipeline |
| CodeBuild | ~$0.005/min (pago por uso) |
| **Total estimado** | **~$110-120/mes** |

*Nota*: EKS es el componente más costoso. Para minimizar costos en la POC, considerar apagar el cluster cuando no se use.
