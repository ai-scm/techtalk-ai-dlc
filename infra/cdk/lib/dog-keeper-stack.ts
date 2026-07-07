import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { DogKeeperStackProps } from './shared/types';
import { NetworkingConstruct } from './networking/networking-construct';
import { EcrConstruct } from './ecr/ecr-construct';
import { EksConstruct } from './eks/eks-construct';
import { MonitoringConstruct } from './monitoring/monitoring-construct';
import { PipelineConstruct } from './pipeline/pipeline-construct';

/**
 * DogKeeperStack is the single parent stack that orchestrates all infrastructure.
 *
 * Deploy everything: `cdk deploy DogKeeperStack`
 * Destroy everything: `cdk destroy DogKeeperStack`
 *
 * All resources are created as Constructs within this stack, ensuring
 * atomic deployment and teardown.
 */
export class DogKeeperStack extends cdk.Stack {
  public readonly networking: NetworkingConstruct;
  public readonly ecr: EcrConstruct;
  public readonly eks: EksConstruct;
  public readonly monitoring: MonitoringConstruct;
  public readonly pipeline: PipelineConstruct;

  constructor(scope: Construct, id: string, props: DogKeeperStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Apply tags to all resources in this stack
    Object.entries(config.tags).forEach(([key, value]) => {
      if (value) {
        cdk.Tags.of(this).add(key, value);
      }
    });

    // 1. Networking — Import existing VPC and create security groups
    this.networking = new NetworkingConstruct(this, 'Networking', {
      vpcId: config.networking.vpcId,
      privateSubnetIds: config.networking.privateSubnetIds,
      publicSubnetIds: config.networking.publicSubnetIds,
      environment: config.environment,
    });

    // 2. ECR — Container image repositories
    this.ecr = new EcrConstruct(this, 'Ecr', {
      environment: config.environment,
      maxImageCount: 10,
    });

    // 3. EKS — Kubernetes cluster with Fargate
    this.eks = new EksConstruct(this, 'Eks', {
      environment: config.environment,
      clusterName: config.eks.clusterName,
      kubernetesVersion: config.eks.kubernetesVersion,
      namespace: config.eks.namespace,
      vpcId: config.networking.vpcId,
      privateSubnetIds: config.networking.privateSubnetIds,
      publicSubnetIds: config.networking.publicSubnetIds,
    });

    // 4. Monitoring — CloudWatch Log Groups
    this.monitoring = new MonitoringConstruct(this, 'Monitoring', {
      environment: config.environment,
      logRetentionDays: config.monitoring.logRetentionDays,
    });

    // 5. Pipeline — CI/CD with CodePipeline + CodeBuild
    this.pipeline = new PipelineConstruct(this, 'Pipeline', {
      environment: config.environment,
      githubOwner: config.pipeline.githubOwner,
      githubRepo: config.pipeline.githubRepo,
      githubBranch: config.pipeline.githubBranch,
      connectionArn: config.pipeline.connectionArn,
      ecrRepositoryArns: this.ecr.repositories.map(repo => repo.repositoryArn),
      eksClusterName: config.eks.clusterName,
      eksClusterArn: this.eks.cluster.clusterArn,
    });

    // 6. Grant CodeBuild deploy role kubectl access to EKS (aws-auth ConfigMap)
    this.eks.grantDeployAccess(
      this.pipeline.deployRole,
      'codebuild-deploy'
    );

    // 7. SSM Parameters — Created automatically so no manual steps needed
    new ssm.StringParameter(this, 'SsmDbUsername', {
      parameterName: `/dog-keeper/${config.environment}/db-username`,
      stringValue: 'postgres',
      description: 'Database username for Dog Keeper',
    });
    new ssm.StringParameter(this, 'SsmDbHost', {
      parameterName: `/dog-keeper/${config.environment}/db-host`,
      stringValue: 'db',
      description: 'Database host (in-cluster service name)',
    });
    new ssm.StringParameter(this, 'SsmDbName', {
      parameterName: `/dog-keeper/${config.environment}/db-name`,
      stringValue: 'dog_keeper_db',
      description: 'Database name',
    });
    new ssm.StringParameter(this, 'SsmDbPassword', {
      parameterName: `/dog-keeper/${config.environment}/db-password`,
      stringValue: 'CHANGE_ME_AFTER_DEPLOY',
      description: 'Database password — update this value after deploy',
    });
    new ssm.StringParameter(this, 'SsmJwtSecret', {
      parameterName: `/dog-keeper/${config.environment}/jwt-secret`,
      stringValue: 'CHANGE_ME_AFTER_DEPLOY',
      description: 'JWT signing secret — update this value after deploy',
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'EksClusterName', {
      value: this.eks.cluster.clusterName,
      description: 'EKS cluster name',
      exportName: `${config.environment}-eks-cluster-name`,
    });

    new cdk.CfnOutput(this, 'EksClusterEndpoint', {
      value: this.eks.cluster.clusterEndpoint,
      description: 'EKS cluster API endpoint',
    });

    new cdk.CfnOutput(this, 'EcrBackendUri', {
      value: this.ecr.backendRepository.repositoryUri,
      description: 'ECR repository URI for backend',
    });

    new cdk.CfnOutput(this, 'EcrBffUri', {
      value: this.ecr.bffRepository.repositoryUri,
      description: 'ECR repository URI for BFF',
    });

    new cdk.CfnOutput(this, 'EcrFrontendUri', {
      value: this.ecr.frontendRepository.repositoryUri,
      description: 'ECR repository URI for frontend',
    });

    new cdk.CfnOutput(this, 'PipelineName', {
      value: this.pipeline.pipeline.pipelineName,
      description: 'CodePipeline name',
    });
  }
}
