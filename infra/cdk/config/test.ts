import { EnvironmentConfig } from '../lib/shared/types';

/**
 * Test environment configuration.
 *
 * IMPORTANT: Replace all placeholder values (<...>) with actual AWS resource IDs
 * before running `cdk deploy`.
 */
export const testConfig: EnvironmentConfig = {
  environment: 'test',
  account: '891377180652',
  region: 'us-east-1',

  networking: {
    vpcId: 'vpc-0a28b7a71a2882f8f',
    privateSubnetIds: [
      'subnet-09752d458814bdbef',
      'subnet-0f14586d318bf5f85',
    ],
    publicSubnetIds: [
      'subnet-0256451ef25a44077',
      'subnet-02ef9d7abfc8775e6',
    ],
  },

  eks: {
    clusterName: 'dog-keeper-test-eks',
    kubernetesVersion: '1.29',
    namespace: 'dog-keeper-test',
  },

  database: {
    type: 'in-cluster',
  },

  pipeline: {
    githubOwner: 'ai-scm',
    githubRepo: 'techtalk-ai-dlc',
    githubBranch: 'feature/unidad_infra',
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
