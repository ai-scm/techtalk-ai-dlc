# Code Generation Plan — Unit 4: Infrastructure (AWS CDK)

**Generated**: 2026-07-07
**Stage**: CONSTRUCTION — Code Generation (Part 1: Planning)
**Unit**: Infrastructure (AWS CDK)
**Target Directory**: `/infra/cdk/`

---

## Unit Context

- **Tecnología**: TypeScript 5.x + AWS CDK v2
- **Arquitectura**: Single parent stack (`DogKeeperStack`) con Constructs modulares
- **Recursos**: EKS Fargate, ECR, ALB Controller, SSM, CloudWatch, CodePipeline, CodeBuild
- **Dependencias build**: Necesita ECR repos para que Pipeline pueda pushear imágenes
- **Dependencias runtime**: Las apps (Backend, BFF, Frontend) ya están desarrolladas — CDK solo provee la infraestructura donde corren

---

## Stories Covered

Este unit cubre las stories de infraestructura implícitas:
- Proveer un cluster Kubernetes en la nube para el ambiente test
- Container registry para almacenar imágenes Docker
- CI/CD pipeline para automatizar build + deploy
- Secrets management en la nube (SSM)
- Monitoring básico (CloudWatch Logs)

---

## Code Generation Steps

### Step 1: Project Setup
- [x] Create `infra/cdk/package.json` (CDK v2 dependencies, TypeScript, jest)
- [x] Create `infra/cdk/tsconfig.json` (strict mode, ES modules)
- [x] Create `infra/cdk/cdk.json` (CDK app config, context defaults)
- [x] Create `infra/cdk/.gitignore` (node_modules, cdk.out, *.js, *.d.ts)

### Step 2: Shared Types & Configuration
- [x] Create `infra/cdk/lib/shared/types.ts` (EnvironmentConfig interface, construct prop interfaces)
- [x] Create `infra/cdk/config/test.ts` (test environment config with placeholder values for VPC, subnets, account, region)

### Step 3: Networking Construct
- [x] Create `infra/cdk/lib/networking/networking-construct.ts`

### Step 4: ECR Construct
- [x] Create `infra/cdk/lib/ecr/ecr-construct.ts`

### Step 5: EKS Construct
- [x] Create `infra/cdk/lib/eks/eks-construct.ts`

### Step 6: Monitoring Construct
- [x] Create `infra/cdk/lib/monitoring/monitoring-construct.ts`

### Step 7: Pipeline Construct
- [x] Create `infra/cdk/lib/pipeline/pipeline-construct.ts`

### Step 8: Parent Stack (DogKeeperStack)
- [x] Create `infra/cdk/lib/dog-keeper-stack.ts`

### Step 9: CDK App Entry Point
- [x] Create `infra/cdk/bin/app.ts`

### Step 10: Unit Tests
- [x] Create `infra/cdk/test/dog-keeper-stack.test.ts`
- [x] Create `infra/cdk/jest.config.ts`

### Step 11: Documentation Summary
- [x] Create `aidlc-docs/construction/infra-cdk/code/code-summary.md`

---

## Total Files to Generate

| Category | Count | Location |
|---|---|---|
| Project config | 4 | `infra/cdk/` |
| Shared types + env config | 2 | `infra/cdk/lib/shared/`, `infra/cdk/config/` |
| Constructs | 5 | `infra/cdk/lib/{domain}/` |
| Parent stack | 1 | `infra/cdk/lib/` |
| Entry point | 1 | `infra/cdk/bin/` |
| Tests | 2 | `infra/cdk/test/` |
| Documentation | 1 | `aidlc-docs/construction/infra-cdk/code/` |
| **Total** | **16** | |

---

## Execution Notes

- All placeholder values (VPC ID, subnets, account, region, GitHub owner/repo) go in `config/test.ts` as strings to be filled by the user
- Follows steering docs: L2 constructs, strict TypeScript, no `any`, readonly props, deterministic naming
- IAM: least privilege, no wildcards, dedicated roles
- Tags applied via `cdk.Tags.of(this).add(...)` at stack level
