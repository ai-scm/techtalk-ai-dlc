import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';
import { EksConstructProps } from '../shared/types';

/**
 * EksConstruct creates a managed EKS cluster with Fargate profiles.
 *
 * Features:
 * - Managed control plane (no EC2 node groups)
 * - Fargate profiles for application and system workloads
 * - OIDC provider for IRSA (IAM Roles for Service Accounts)
 * - AWS Load Balancer Controller for ALB-based ingress
 * - IAM roles with least privilege
 */
export class EksConstruct extends Construct {
  public readonly cluster: eks.Cluster;
  public readonly appPodRole: iam.Role;
  public readonly albControllerRole: iam.Role;

  constructor(scope: Construct, id: string, props: EksConstructProps) {
    super(scope, id);

    // Import VPC and subnets
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: props.vpcId,
    });

    const privateSubnets = props.privateSubnetIds.map((subnetId, index) =>
      ec2.Subnet.fromSubnetId(this, `PrivateSubnet${index}`, subnetId)
    );

    const publicSubnets = props.publicSubnetIds.map((subnetId, index) =>
      ec2.Subnet.fromSubnetId(this, `PublicSubnet${index}`, subnetId)
    );

    // EKS Cluster Role
    const clusterRole = new iam.Role(this, 'ClusterRole', {
      roleName: `dog-keeper-${props.environment}-eks-cluster-role`,
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'),
      ],
    });

    // Create EKS Cluster (Fargate only)
    this.cluster = new eks.Cluster(this, 'Cluster', {
      clusterName: props.clusterName,
      version: eks.KubernetesVersion.of(props.kubernetesVersion),
      vpc: vpc,
      vpcSubnets: [{ subnets: privateSubnets }],
      role: clusterRole,
      defaultCapacity: 0, // No EC2 node groups
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
      outputClusterName: true,
      kubectlLayer: new KubectlV31Layer(this, 'KubectlLayer'),
    });

    // Fargate Profile for application pods
    this.cluster.addFargateProfile('AppProfile', {
      fargateProfileName: `dog-keeper-${props.environment}-app`,
      selectors: [
        { namespace: props.namespace },
      ],
      subnetSelection: { subnets: privateSubnets },
    });

    // Fargate Profile for kube-system (CoreDNS, etc.)
    this.cluster.addFargateProfile('SystemProfile', {
      fargateProfileName: `dog-keeper-${props.environment}-system`,
      selectors: [
        { namespace: 'kube-system' },
      ],
      subnetSelection: { subnets: privateSubnets },
    });

    // Patch CoreDNS to run on Fargate (remove ec2 compute-type annotation)
    new eks.KubernetesPatch(this, 'CoreDnsPatch', {
      cluster: this.cluster,
      resourceName: 'deployment/coredns',
      resourceNamespace: 'kube-system',
      applyPatch: {
        spec: {
          template: {
            metadata: {
              annotations: {
                'eks.amazonaws.com/compute-type': 'fargate',
              },
            },
          },
        },
      },
      restorePatch: {
        spec: {
          template: {
            metadata: {
              annotations: {
                'eks.amazonaws.com/compute-type': 'ec2',
              },
            },
          },
        },
      },
      patchType: eks.PatchType.STRATEGIC,
    });

    // Create application namespace
    this.cluster.addManifest('AppNamespace', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: props.namespace,
      },
    });

    // IAM Role for application pods (IRSA) — SSM access
    const appPodCondition = new cdk.CfnJson(this, 'AppPodCondition', {
      value: {
        [`${this.cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]:
          `system:serviceaccount:${props.namespace}:*`,
        [`${this.cluster.openIdConnectProvider.openIdConnectProviderIssuer}:aud`]:
          'sts.amazonaws.com',
      },
    });

    this.appPodRole = new iam.Role(this, 'AppPodRole', {
      roleName: `dog-keeper-${props.environment}-app-pod-role`,
      assumedBy: new iam.FederatedPrincipal(
        this.cluster.openIdConnectProvider.openIdConnectProviderArn,
        {
          StringLike: appPodCondition,
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Grant SSM Parameter Store read access to app pods
    this.appPodRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParametersByPath',
      ],
      resources: [
        cdk.Arn.format({
          service: 'ssm',
          resource: 'parameter',
          resourceName: `dog-keeper/${props.environment}/*`,
        }, cdk.Stack.of(this)),
      ],
    }));

    // Grant CloudWatch Logs write access to app pods
    this.appPodRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogStreams',
      ],
      resources: [
        cdk.Arn.format({
          service: 'logs',
          resource: 'log-group',
          resourceName: `/dog-keeper/${props.environment}/*`,
        }, cdk.Stack.of(this)),
      ],
    }));

    // AWS Load Balancer Controller - IAM Role (IRSA)
    const albControllerCondition = new cdk.CfnJson(this, 'AlbControllerCondition', {
      value: {
        [`${this.cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]:
          'system:serviceaccount:kube-system:aws-load-balancer-controller',
        [`${this.cluster.openIdConnectProvider.openIdConnectProviderIssuer}:aud`]:
          'sts.amazonaws.com',
      },
    });

    this.albControllerRole = new iam.Role(this, 'AlbControllerRole', {
      roleName: `dog-keeper-${props.environment}-alb-controller-role`,
      assumedBy: new iam.FederatedPrincipal(
        this.cluster.openIdConnectProvider.openIdConnectProviderArn,
        {
          StringEquals: albControllerCondition,
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // ALB Controller IAM Policy (subset of required permissions)
    this.albControllerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeSubnets',
        'ec2:DescribeVpcs',
        'ec2:DescribeInternetGateways',
        'ec2:DescribeAccountAttributes',
        'ec2:DescribeAddresses',
        'ec2:DescribeAvailabilityZones',
        'ec2:DescribeNetworkInterfaces',
        'ec2:CreateSecurityGroup',
        'ec2:AuthorizeSecurityGroupIngress',
        'ec2:RevokeSecurityGroupIngress',
        'ec2:DeleteSecurityGroup',
        'ec2:CreateTags',
        'ec2:DeleteTags',
      ],
      resources: ['*'],
    }));

    this.albControllerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'elasticloadbalancing:CreateLoadBalancer',
        'elasticloadbalancing:CreateTargetGroup',
        'elasticloadbalancing:CreateListener',
        'elasticloadbalancing:CreateRule',
        'elasticloadbalancing:DeleteLoadBalancer',
        'elasticloadbalancing:DeleteTargetGroup',
        'elasticloadbalancing:DeleteListener',
        'elasticloadbalancing:DeleteRule',
        'elasticloadbalancing:ModifyLoadBalancerAttributes',
        'elasticloadbalancing:ModifyTargetGroupAttributes',
        'elasticloadbalancing:ModifyListener',
        'elasticloadbalancing:ModifyRule',
        'elasticloadbalancing:RegisterTargets',
        'elasticloadbalancing:DeregisterTargets',
        'elasticloadbalancing:SetWebAcl',
        'elasticloadbalancing:SetSecurityGroups',
        'elasticloadbalancing:SetSubnets',
        'elasticloadbalancing:AddTags',
        'elasticloadbalancing:RemoveTags',
        'elasticloadbalancing:DescribeLoadBalancers',
        'elasticloadbalancing:DescribeTargetGroups',
        'elasticloadbalancing:DescribeListeners',
        'elasticloadbalancing:DescribeRules',
        'elasticloadbalancing:DescribeTargetHealth',
        'elasticloadbalancing:DescribeLoadBalancerAttributes',
        'elasticloadbalancing:DescribeTargetGroupAttributes',
        'elasticloadbalancing:DescribeTags',
      ],
      resources: ['*'],
    }));

    this.albControllerRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'iam:CreateServiceLinkedRole',
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'iam:AWSServiceName': 'elasticloadbalancing.amazonaws.com',
        },
      },
    }));

    // Install AWS Load Balancer Controller via Helm
    this.cluster.addHelmChart('AwsLoadBalancerController', {
      chart: 'aws-load-balancer-controller',
      repository: 'https://aws.github.io/eks-charts',
      namespace: 'kube-system',
      release: 'aws-load-balancer-controller',
      values: {
        clusterName: props.clusterName,
        serviceAccount: {
          create: true,
          name: 'aws-load-balancer-controller',
          annotations: {
            'eks.amazonaws.com/role-arn': this.albControllerRole.roleArn,
          },
        },
        region: cdk.Stack.of(this).region,
        vpcId: props.vpcId,
      },
    });

    // Create Kubernetes Service Account for application pods
    this.cluster.addManifest('AppServiceAccount', {
      apiVersion: 'v1',
      kind: 'ServiceAccount',
      metadata: {
        name: 'dog-keeper-app',
        namespace: props.namespace,
        annotations: {
          'eks.amazonaws.com/role-arn': this.appPodRole.roleArn,
        },
      },
    });
  }

  /**
   * Grants a role full kubectl access to the cluster (system:masters).
   * Use this to allow CodeBuild deploy roles to interact with the cluster.
   */
  public grantDeployAccess(role: iam.IRole, username: string): void {
    this.cluster.awsAuth.addRoleMapping(role, {
      groups: ['system:masters'],
      username: username,
    });
  }
}
