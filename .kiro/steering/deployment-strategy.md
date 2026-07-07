# Deployment Strategy Steering

## Purpose

This document defines the deployment strategy for the Dog Keeper platform.

It specifies:

- deployment environments
- promotion workflow
- ownership of every deployment tool
- deployment responsibilities
- deployment lifecycle

This document is the authoritative source for how software moves from a developer workstation into Production.

---

# Deployment Philosophy

The deployment strategy follows these principles.

- Build once
- Deploy many
- Immutable artifacts
- Infrastructure as Code
- Environment consistency
- Automated validation
- Controlled promotion
- Reproducible deployments

Production deployments should always be predictable.

---

# Deployment Lifecycle

Every software change follows the same lifecycle.

Specification

↓

Implementation

↓

Unit Tests

↓

Container Build

↓


Smoke Tests

↓

Integration Tests

↓

Image Publication

↓

Deploy Test

↓

Manual Approval

↓

Deploy Production

↓

Production Validation

No deployment may skip any mandatory stage.

---

# Platform Responsibilities

Each technology owns a specific part of the deployment process.

GitHub

↓

Source Code

AWS CodeConnections

↓

Repository Integration

AWS CodePipeline

↓

Deployment Orchestration

AWS CodeBuild

↓

Build Validation

Amazon ECR

↓

Container Registry

AWS CDK

↓

Infrastructure Provisioning

Garden

↓

Application Deployment

Amazon EKS

↓

Application Runtime

Amazon CloudWatch

↓

Monitoring

AWS Secrets Manager

↓

Secrets Management

Responsibilities must never overlap.

---

# Infrastructure Deployment

Infrastructure is deployed independently from applications.

Infrastructure includes:

- VPC
- IAM
- EKS
- ECR
- Route53
- CloudWatch
- Secrets Manager
- CodePipeline
- CodeBuild

Infrastructure must always be deployed using AWS CDK.

Garden must never create AWS infrastructure.

---

# Application Deployment

Applications are deployed independently from infrastructure.

Applications include:

- Frontend
- BFF
- Backend
- Kubernetes Services
- ConfigMaps
- Ingress
- Secrets references

Applications must always be deployed using Garden.

AWS CDK must never deploy application workloads.

---

# Local Development

The local environment is optimized for developer productivity.

Developer

↓

garden dev

↓

Minikube

↓

Hot Reload

↓

Fast Feedback

Container images are built locally.

Application synchronization uses Garden Sync.

Infrastructure provisioning is not required locally.

---

# Test Environment

The Test environment validates every change before Production.

Deployment is automatic.

Pipeline

↓

garden deploy test

↓

Smoke Tests

↓

Integration Tests

↓

Approval Gate

Developers must never deploy manually to Test.

---

# Production Environment

Production deployments require explicit approval.

Pipeline

↓

Manual Approval

↓

garden deploy production

↓

Production Validation

Production deployments must always reuse the approved container image.

---

# Promotion Strategy

Application promotion moves artifacts.

Never source code.

Example

Commit

↓

Docker Image

↓

Amazon ECR

↓

Test

↓

Production

No environment should rebuild the application.

---

# Artifact Strategy

Every deployment uses immutable artifacts.

Docker images are the deployment artifact.

Every image must have:

- Git Commit
- Version
- Build Number

Images must never change after publication.

---

# Environment Configuration

Every environment owns its own configuration.

Local

↓

Development

↓

Test

↓

Production

Configuration differences should be limited to:

- Secrets
- Domain Names
- Resource Sizes
- Scaling
- External Services

Application behavior should remain identical.

---

# Deployment Order

Infrastructure

↓

Container Registry

↓

Database

↓

Cluster

↓

Application

↓

Validation

Infrastructure must exist before application deployment.

---

# Kubernetes Deployment Strategy

Garden deploys Kubernetes resources.

Deployments should use:

RollingUpdate

Health Checks

Readiness Probes

Liveness Probes

Resource Requests

Resource Limits

Avoid Recreate deployments unless explicitly required.

---

# Rollback Strategy

Rollback should deploy the previously approved image.

Rollback must never rebuild older commits.

Rollback should reuse existing artifacts from Amazon ECR.

---

# Release Strategy

Current deployment model:

Rolling Deployment

Future supported strategies:

Blue/Green

Canary

Feature Flags

Progressive Delivery

The deployment architecture should allow future migration without redesign.

---

# Database Strategy

Local

↓

Helm PostgreSQL

Cloud

↓

Amazon RDS PostgreSQL

Application deployments must never recreate production databases.

Infrastructure changes should be managed independently.

---

# Secrets Strategy

Secrets belong to AWS Secrets Manager.

Applications consume secret references.

Secrets must never exist in:

Git

Docker Images

ConfigMaps

Source Code

---

# Networking Strategy

Infrastructure owns networking.

Applications consume networking.

Networking resources include:

- VPC
- Subnets
- Security Groups
- Route Tables
- Load Balancer

Garden must never provision networking resources.

---

# Monitoring Strategy

Every deployment should publish:

Application Logs

Deployment Logs

Metrics

Health Status

Deployment Duration

CloudWatch is the default monitoring platform.

---

# Validation Gates

Every deployment passes the following gates.

Build

↓

Lint

↓

Unit Tests

↓

Container Build

↓

Image Push

↓

Deploy Test

↓

Smoke Tests

↓

Integration Tests

↓

Manual Approval

↓

Deploy Production

↓

Production Validation

Deployment stops immediately after any failed validation.

---

# Recovery Strategy

Recovery must be simple.

Rollback

↓

Previous Image

↓

Garden Deploy

↓

Validation

Recovery should take minutes.

Infrastructure should remain unchanged.

---

# Scaling Strategy

Application scaling belongs to Kubernetes.

Infrastructure scaling belongs to AWS.

Examples

Application

↓

Replica Count

↓

Horizontal Pod Autoscaler

Infrastructure

↓

Fargate Capacity

↓

RDS Scaling

↓

Load Balancer

Responsibilities remain separated.

---

# Future Evolution

The deployment strategy should support future capabilities.

Examples:

- Blue/Green Deployments
- Canary Releases
- GitOps
- Argo Rollouts
- Preview Environments
- Feature Flags
- Progressive Delivery

These capabilities should integrate without changing the deployment architecture.

---

# Non Goals

This deployment strategy does not support:

Manual Production Deployments

Deployments from Developer Workstations

Infrastructure created by Garden

Applications deployed by CDK

Mutable Docker Images

Environment-specific Builds

Production Hotfixes outside the Pipeline

---

# Decision Matrix

| Responsibility | Tool |
|----------------|------|
| Source Control | GitHub |
| Repository Integration | AWS CodeConnections |
| CI/CD Orchestration | AWS CodePipeline |
| Build | AWS CodeBuild |
| Infrastructure | AWS CDK |
| Container Registry | Amazon ECR |
| Kubernetes Runtime | Amazon EKS |
| Compute | AWS Fargate |
| Application Deployment | Garden |
| Local Development | Garden Dev |
| Local Synchronization | Garden Sync |
| Secrets | AWS Secrets Manager |
| Monitoring | Amazon CloudWatch |
| Database | Amazon RDS PostgreSQL |

---

# Deployment Architecture Summary

Developer

↓

GitHub

↓

AWS CodeConnections

↓

CodePipeline

↓

CodeBuild

↓

Amazon ECR

↓

Garden Deploy Test

↓

Smoke Tests

↓

Integration Tests

↓

Manual Approval

↓

Garden Deploy Production

↓

Amazon EKS (Fargate)

↓

CloudWatch
