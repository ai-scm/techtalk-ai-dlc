# AWS CDK Steering

## Purpose

This document defines the implementation standards for all AWS infrastructure generated with AWS CDK.

All generated infrastructure must follow these conventions.

---

# Primary Technology

Infrastructure must use:

- AWS CDK v2 (pinned version, e.g., 2.150.0)
- TypeScript (strict mode)
- Node.js LTS
- npm

Do not generate infrastructure using CloudFormation templates, Terraform, Pulumi, or AWS Console configuration.

---

# Single Stack Architecture

All infrastructure MUST live in a **single parent stack** with Constructs as internal modules.

Benefits:
- `cdk deploy DogKeeperStack` deploys everything
- `cdk destroy DogKeeperStack` removes everything
- No cross-stack reference issues
- Atomic deploy/destroy

The parent stack orchestrates Constructs in dependency order.

---

# Stack Structure

```typescript
export class DogKeeperStack extends cdk.Stack {
  constructor(scope, id, props) {
    // 1. Networking (VPC import)
    // 2. ECR (container registry)
    // 3. EKS (cluster + Fargate)
    // 4. Monitoring (CloudWatch)
    // 5. Pipeline (CI/CD)
    // 6. Wire cross-construct dependencies
    // 7. Create SSM parameters
    // 8. Export outputs
  }
}
```

---

# Repository Layout

```
infra/cdk/
├── bin/
│   └── app.ts                    # Entry point (config loading only)
├── lib/
│   ├── dog-keeper-stack.ts       # Single parent stack
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
│       └── types.ts
├── config/
│   └── test.ts                   # Environment config (placeholders)
├── test/
│   └── dog-keeper-stack.test.ts
├── package.json
├── tsconfig.json
└── cdk.json
```

---

# EKS with Fargate — Critical Patterns

## Kubectl Layer (MANDATORY)

EKS clusters MUST specify a `kubectlLayer` matching the Kubernetes version. Without this, CDK uses an old kubectl that fails with `batch/v1beta1` errors on K8s >= 1.25.

```typescript
import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';

new eks.Cluster(this, 'Cluster', {
  kubectlLayer: new KubectlV31Layer(this, 'KubectlLayer'),
  // ...
});
```

Install the matching package: `npm install @aws-cdk/lambda-layer-kubectl-v31`

## IRSA with CfnJson (MANDATORY)

When creating IAM roles with OIDC conditions for IRSA, the condition key (`<issuer>:sub`) is a CloudFormation token that cannot be used as a map key at synth-time. MUST use `CfnJson` to defer resolution:

```typescript
const condition = new cdk.CfnJson(this, 'Condition', {
  value: {
    [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]:
      `system:serviceaccount:${namespace}:*`,
    [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:aud`]:
      'sts.amazonaws.com',
  },
});

new iam.Role(this, 'Role', {
  assumedBy: new iam.FederatedPrincipal(
    cluster.openIdConnectProvider.openIdConnectProviderArn,
    { StringLike: condition },
    'sts:AssumeRoleWithWebIdentity'
  ),
});
```

**Never** use template literals directly as map keys in IAM conditions with OIDC.

## CoreDNS Patch for Fargate (MANDATORY)

CoreDNS must be patched to run on Fargate. Use `KubernetesPatch`, NOT `addManifest` (which requires a complete Deployment spec including `selector`):

```typescript
new eks.KubernetesPatch(this, 'CoreDnsPatch', {
  cluster: this.cluster,
  resourceName: 'deployment/coredns',
  resourceNamespace: 'kube-system',
  applyPatch: {
    spec: { template: { metadata: { annotations: {
      'eks.amazonaws.com/compute-type': 'fargate',
    }}}}
  },
  restorePatch: {
    spec: { template: { metadata: { annotations: {
      'eks.amazonaws.com/compute-type': 'ec2',
    }}}}
  },
  patchType: eks.PatchType.STRATEGIC,
});
```

## SSM Parameters in Stack

Create SSM parameters directly in the stack to avoid manual post-deploy steps:

```typescript
new ssm.StringParameter(this, 'SsmDbHost', {
  parameterName: `/dog-keeper/${env}/db-host`,
  stringValue: 'db',
});
```

Sensitive values use placeholder `CHANGE_ME_AFTER_DEPLOY` — update manually once.

---

# ECR Patterns

- Use MUTABLE tags for POC/test environments (allows pipeline re-runs with same commit)
- Use IMMUTABLE tags for production
- Repository names follow `{project}-{env}/{service}` format (e.g., `dog-keeper-test/backend`)
- The slash format matches Garden's `deploymentRegistry.namespace` convention
- Enable scan on push
- Set lifecycle policy (max 10 images)
- Set `removalPolicy: DESTROY` and `emptyOnDelete: true` for non-prod

---

# VPC — Import Existing

Never create a VPC in CDK for this project. Import existing VPC and subnets by ID:

```typescript
const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: props.vpcId });
```

Subnet IDs are passed via configuration.

---

# ALB Controller Permissions

The AWS Load Balancer Controller role requires extensive permissions. These are the **minimum required** (learned from actual deployment failures):

EC2:
- `DescribeSecurityGroups`, `DescribeSubnets`, `DescribeVpcs`
- `DescribeInternetGateways`, `DescribeRouteTables` ← CRITICAL (subnet auto-discovery)
- `DescribeAvailabilityZones`, `DescribeNetworkInterfaces`
- `DescribeAccountAttributes`, `DescribeAddresses`
- `DescribeInstances`, `DescribeCoipPools`, `GetCoipPoolUsage`
- `CreateSecurityGroup`, `AuthorizeSecurityGroupIngress`, `RevokeSecurityGroupIngress`, `DeleteSecurityGroup`
- `CreateTags`, `DeleteTags`

ELB:
- All CRUD actions on LoadBalancers, TargetGroups, Listeners, Rules
- `DescribeListenerAttributes` ← CRITICAL (missing causes FailedDeployModel)
- `ModifyTargetGroup` ← Required for updates

IAM:
- `CreateServiceLinkedRole` (condition: `elasticloadbalancing.amazonaws.com`)

---

# aws-auth ConfigMap — SSO Roles

For SSO (IAM Identity Center) roles, the ARN in `aws-auth` must be **without the path**:

- ✅ `arn:aws:iam::ACCOUNT:role/AWSReservedSSO_RoleName_ID`
- ❌ `arn:aws:iam::ACCOUNT:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_RoleName_ID`

Map admin roles programmatically via `cluster.awsAuth.addRoleMapping()` or via kubectl in CodeBuild.

---

# Configuration

Environment configuration lives in `config/{env}.ts`.

All environment-specific values are **placeholder strings** (`<AWS_ACCOUNT_ID>`, etc.) that must be filled before first deploy.

Required config fields:
- account, region
- vpcId, privateSubnetIds, publicSubnetIds
- clusterName, kubernetesVersion, namespace
- connectionArn (CodeConnections — must exist beforehand)
- githubOwner, githubRepo, githubBranch
- adminRoleArn (SSO role for console access)
- logRetentionDays

---

# Deployment Commands

```bash
cd infra/cdk
npm install
cdk synth              # Validate template
cdk diff               # Preview changes
cdk deploy DogKeeperStack    # Deploy all
cdk destroy DogKeeperStack   # Tear down all
```

If deploy fails mid-way:
```bash
aws cloudformation continue-update-rollback --stack-name DogKeeperStack
# Then retry deploy
```

---

# Tags

Every resource must include:

| Tag | Value |
|---|---|
| Application | dog-keeper |
| Environment | test/production |
| ManagedBy | cdk |

Applied at stack level with `cdk.Tags.of(this).add()`.

---

# Testing

Use CDK Assertions library:

```typescript
import { Template, Match } from 'aws-cdk-lib/assertions';
```

Test: resource counts, naming, IAM policies (no wildcards), tags, pipeline stages.

---

# Non Goals

CDK must NOT:
- Deploy applications (that's Garden's job)
- Create VPCs (use existing)
- Manage Kubernetes Deployments/Services
- Build Docker images
- Generate Helm charts
