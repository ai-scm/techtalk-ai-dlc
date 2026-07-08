import * as cdk from 'aws-cdk-lib';

/**
 * Environment configuration for the Dog Keeper platform.
 * All placeholder values must be filled before deployment.
 */
export interface EnvironmentConfig {
  readonly environment: string;
  readonly account: string;
  readonly region: string;
  readonly networking: NetworkingConfig;
  readonly eks: EksConfig;
  readonly database: DatabaseConfig;
  readonly pipeline: PipelineConfig;
  readonly monitoring: MonitoringConfig;
  readonly tags: TagsConfig;
}

export interface NetworkingConfig {
  readonly vpcId: string;
  readonly privateSubnetIds: string[];
  readonly publicSubnetIds: string[];
}

export interface EksConfig {
  readonly clusterName: string;
  readonly kubernetesVersion: string;
  readonly namespace: string;
  readonly adminRoleArn?: string;
}

export interface DatabaseConfig {
  /** 'in-cluster' uses Helm PostgreSQL in EKS; 'rds' uses managed RDS (future) */
  readonly type: 'in-cluster' | 'rds';
  readonly instanceClass?: string;
  readonly multiAz?: boolean;
  readonly backupRetentionDays?: number;
}

export interface PipelineConfig {
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly githubBranch: string;
  readonly connectionArn: string;
}

export interface MonitoringConfig {
  readonly logRetentionDays: number;
  readonly containerInsights: boolean;
}

export interface TagsConfig {
  readonly Application: string;
  readonly Environment: string;
  readonly ManagedBy: string;
  readonly Owner?: string;
  readonly CostCenter?: string;
}

/**
 * Props for the parent DogKeeperStack.
 */
export interface DogKeeperStackProps extends cdk.StackProps {
  readonly config: EnvironmentConfig;
}

/**
 * Props for NetworkingConstruct.
 */
export interface NetworkingConstructProps {
  readonly vpcId: string;
  readonly privateSubnetIds: string[];
  readonly publicSubnetIds: string[];
  readonly environment: string;
}

/**
 * Props for EcrConstruct.
 */
export interface EcrConstructProps {
  readonly environment: string;
  readonly maxImageCount?: number;
}

/**
 * Props for EksConstruct.
 */
export interface EksConstructProps {
  readonly environment: string;
  readonly clusterName: string;
  readonly kubernetesVersion: string;
  readonly namespace: string;
  readonly vpcId: string;
  readonly privateSubnetIds: string[];
  readonly publicSubnetIds: string[];
  readonly eksSecurityGroupId?: string;
}

/**
 * Props for MonitoringConstruct.
 */
export interface MonitoringConstructProps {
  readonly environment: string;
  readonly logRetentionDays?: number;
}

/**
 * Props for PipelineConstruct.
 */
export interface PipelineConstructProps {
  readonly environment: string;
  readonly githubOwner: string;
  readonly githubRepo: string;
  readonly githubBranch: string;
  readonly connectionArn: string;
  readonly ecrRepositoryArns: string[];
  readonly eksClusterName: string;
  readonly eksClusterArn?: string;
}
