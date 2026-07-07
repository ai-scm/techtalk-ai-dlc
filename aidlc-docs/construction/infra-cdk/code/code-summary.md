# Code Summary — Unit 4: Infrastructure (AWS CDK)

**Generated**: 2026-07-07
**Stage**: CONSTRUCTION — Code Generation
**Unit**: Infrastructure (AWS CDK)
**Location**: `/infra/cdk/`

---

## Generated Files (15 files)

| # | File | Purpose |
|---|---|---|
| 1 | `package.json` | CDK v2 project dependencies and scripts |
| 2 | `tsconfig.json` | TypeScript strict configuration |
| 3 | `cdk.json` | CDK app configuration and context |
| 4 | `.gitignore` | Ignore node_modules, cdk.out, compiled JS |
| 5 | `lib/shared/types.ts` | All TypeScript interfaces (EnvironmentConfig, construct props) |
| 6 | `config/test.ts` | Test environment config (placeholder values) |
| 7 | `lib/networking/networking-construct.ts` | VPC import, security groups |
| 8 | `lib/ecr/ecr-construct.ts` | 3 ECR repositories with lifecycle policies |
| 9 | `lib/eks/eks-construct.ts` | EKS cluster, Fargate profiles, IRSA, ALB Controller |
| 10 | `lib/monitoring/monitoring-construct.ts` | CloudWatch Log Groups (7-day retention) |
| 11 | `lib/pipeline/pipeline-construct.ts` | CodePipeline + CodeBuild (build + deploy) |
| 12 | `lib/dog-keeper-stack.ts` | Parent stack — orchestrates all constructs |
| 13 | `bin/app.ts` | CDK app entry point |
| 14 | `jest.config.ts` | Jest test configuration |
| 15 | `test/dog-keeper-stack.test.ts` | Unit tests (25+ assertions) |

---

## Prerequisites

Before deploying:

1. **Node.js** 20.x LTS installed
2. **AWS CLI** configured with appropriate credentials
3. **CDK CLI** installed: `npm install -g aws-cdk`
4. **AWS Account** with permissions to create EKS, ECR, CodePipeline, IAM, etc.
5. **Existing VPC** with at least 2 private + 2 public subnets

---

## Configuration

Before first deploy, fill placeholder values in `config/test.ts`:

```typescript
// Replace these placeholders:
account: '<AWS_ACCOUNT_ID>',        // e.g., '123456789012'
region: '<AWS_REGION>',             // e.g., 'us-east-1'
vpcId: '<EXISTING_VPC_ID>',         // e.g., 'vpc-0abc123def456'
privateSubnetIds: ['<...>', '<...>'], // At least 2 private subnets
publicSubnetIds: ['<...>', '<...>'],  // At least 2 public subnets
githubOwner: '<GITHUB_OWNER>',       // e.g., 'my-org'
githubRepo: '<GITHUB_REPO>',         // e.g., 'dog-keeper'
```

---

## Deployment

```bash
# Navigate to CDK project
cd infra/cdk

# Install dependencies
npm install

# Synthesize CloudFormation template (dry-run)
cdk synth

# Preview changes
cdk diff

# Deploy all infrastructure
cdk deploy DogKeeperStack

# Destroy all infrastructure
cdk destroy DogKeeperStack
```

---

## Post-Deploy Steps

After `cdk deploy` completes:

1. **Confirm CodeConnections**: Go to AWS Console → Developer Tools → Connections → Confirm the GitHub connection
2. **Configure kubectl**: `aws eks update-kubeconfig --name dog-keeper-test-eks --region <REGION>`
3. **Create SSM Parameters** (manual, one-time):
   ```bash
   aws ssm put-parameter --name "/dog-keeper/test/jwt-secret" --type SecureString --value "<JWT_SECRET>"
   aws ssm put-parameter --name "/dog-keeper/test/db-password" --type SecureString --value "<DB_PASSWORD>"
   aws ssm put-parameter --name "/dog-keeper/test/db-username" --type String --value "postgres"
   aws ssm put-parameter --name "/dog-keeper/test/db-host" --type String --value "db"
   aws ssm put-parameter --name "/dog-keeper/test/db-name" --type String --value "dog_keeper_db"
   ```
4. **Deploy PostgreSQL Helm** (in-cluster):
   ```bash
   helm repo add bitnami https://charts.bitnami.com/bitnami
   helm install db bitnami/postgresql --namespace dog-keeper-test --set auth.postgresPassword=<PASSWORD> --set fullnameOverride=db --set primary.persistence.size=10Gi
   ```
5. **First pipeline run**: Push to GitHub `main` branch to trigger the pipeline

---

## Testing

```bash
cd infra/cdk
npm test
```

Tests validate:
- ECR repositories created with correct names and settings
- EKS cluster uses Fargate (no EC2 node groups)
- Security groups have correct ingress rules
- CloudWatch log groups with retention
- Pipeline has 4 stages
- IAM follows least privilege (no wildcards)
- Tags applied correctly
- Stack outputs exported

---

## Architecture

```
DogKeeperStack
├── NetworkingConstruct    → Imports VPC, creates SGs
├── EcrConstruct           → 3 repos (backend, bff, frontend)
├── EksConstruct           → EKS + Fargate + OIDC + ALB Controller
├── MonitoringConstruct    → 4 CloudWatch Log Groups
└── PipelineConstruct      → CodePipeline + 2 CodeBuild projects
```

Single deploy: `cdk deploy DogKeeperStack`
Single destroy: `cdk destroy DogKeeperStack`

---

## Cost Estimate (Test Environment)

| Service | Monthly Cost |
|---|---|
| EKS Control Plane | ~$73 |
| Fargate (4 pods) | ~$15-25 |
| ALB | ~$16 |
| ECR | ~$1 |
| CloudWatch | ~$1-3 |
| CodePipeline | ~$1 |
| CodeBuild | Pay per use |
| **Total** | **~$110-120/month** |
