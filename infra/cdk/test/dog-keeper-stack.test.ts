import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DogKeeperStack } from '../lib/dog-keeper-stack';
import { EnvironmentConfig } from '../lib/shared/types';

/**
 * Test configuration with deterministic values for assertions.
 */
const testConfig: EnvironmentConfig = {
  environment: 'test',
  account: '123456789012',
  region: 'us-east-1',
  networking: {
    vpcId: 'vpc-12345678',
    privateSubnetIds: ['subnet-private-1', 'subnet-private-2'],
    publicSubnetIds: ['subnet-public-1', 'subnet-public-2'],
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
    githubOwner: 'test-owner',
    githubRepo: 'test-repo',
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

describe('DogKeeperStack', () => {
  let app: cdk.App;
  let stack: DogKeeperStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new DogKeeperStack(app, 'TestStack', {
      env: { account: testConfig.account, region: testConfig.region },
      config: testConfig,
    });
    template = Template.fromStack(stack);
  });

  describe('ECR Repositories', () => {
    it('should create 3 ECR repositories', () => {
      template.resourceCountIs('AWS::ECR::Repository', 3);
    });

    it('should create backend repository with correct name', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        RepositoryName: 'dog-keeper-test-backend',
        ImageTagMutability: 'IMMUTABLE',
        ImageScanningConfiguration: {
          ScanOnPush: true,
        },
      });
    });

    it('should create bff repository with correct name', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        RepositoryName: 'dog-keeper-test-bff',
        ImageTagMutability: 'IMMUTABLE',
      });
    });

    it('should create frontend repository with correct name', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        RepositoryName: 'dog-keeper-test-frontend',
        ImageTagMutability: 'IMMUTABLE',
      });
    });

    it('should configure lifecycle policy on all repositories', () => {
      template.hasResourceProperties('AWS::ECR::Repository', {
        LifecyclePolicy: {
          LifecyclePolicyText: Match.stringLikeRegexp('maxImageCount'),
        },
      });
    });
  });

  describe('EKS Cluster', () => {
    it('should create an EKS cluster', () => {
      template.resourceCountIs('Custom::AWSCDK-EKS-Cluster', 1);
    });

    it('should create EKS cluster with correct name', () => {
      template.hasResourceProperties('Custom::AWSCDK-EKS-Cluster', {
        Config: Match.objectLike({
          name: 'dog-keeper-test-eks',
        }),
      });
    });

    it('should not create EC2 node groups (Fargate only)', () => {
      template.resourceCountIs('AWS::EKS::Nodegroup', 0);
    });

    it('should create Fargate profiles', () => {
      template.resourceCountIs('Custom::AWSCDK-EKS-FargateProfile', 2);
    });
  });

  describe('Security Groups', () => {
    it('should create security groups', () => {
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      expect(Object.keys(securityGroups).length).toBeGreaterThanOrEqual(2);
    });

    it('should create ALB security group with HTTP/HTTPS ingress', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
        CidrIp: '0.0.0.0/0',
      });

      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        CidrIp: '0.0.0.0/0',
      });
    });
  });

  describe('CloudWatch Log Groups', () => {
    it('should create 4 log groups', () => {
      template.resourceCountIs('AWS::Logs::LogGroup', 4);
    });

    it('should create backend log group with correct name and retention', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/dog-keeper/test/backend',
        RetentionInDays: 7,
      });
    });

    it('should create bff log group with correct name and retention', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/dog-keeper/test/bff',
        RetentionInDays: 7,
      });
    });

    it('should create frontend log group with correct name and retention', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/dog-keeper/test/frontend',
        RetentionInDays: 7,
      });
    });

    it('should create eks log group with correct name and retention', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/dog-keeper/test/eks',
        RetentionInDays: 7,
      });
    });
  });

  describe('CodePipeline', () => {
    it('should create a CodePipeline', () => {
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
    });

    it('should create pipeline with correct name', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Name: 'dog-keeper-test-pipeline',
      });
    });

    it('should have 4 stages (Source, Build, Deploy, Approve)', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({ Name: 'Source' }),
          Match.objectLike({ Name: 'Build' }),
          Match.objectLike({ Name: 'Deploy' }),
          Match.objectLike({ Name: 'Approve' }),
        ]),
      });
    });
  });

  describe('CodeBuild Projects', () => {
    it('should create CodeBuild projects', () => {
      const projects = template.findResources('AWS::CodeBuild::Project');
      expect(Object.keys(projects).length).toBeGreaterThanOrEqual(2);
    });

    it('should create build project with Docker privileged mode', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Name: 'dog-keeper-test-build',
        Environment: Match.objectLike({
          PrivilegedMode: true,
        }),
      });
    });

    it('should create deploy project', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Name: 'dog-keeper-test-deploy',
      });
    });
  });

  describe('IAM Roles', () => {
    it('should create IAM roles with least privilege (no admin access)', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement ?? [];
        statements.forEach((statement: any) => {
          if (statement.Action) {
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
            actions.forEach((action: string) => {
              expect(action).not.toBe('*');
              expect(action).not.toContain('AdministratorAccess');
            });
          }
        });
      });
    });

    it('should create app pod role for SSM access', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'dog-keeper-test-app-pod-role',
      });
    });

    it('should create ALB controller role', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'dog-keeper-test-alb-controller-role',
      });
    });
  });

  describe('Tags', () => {
    it('should apply Application tag to stack', () => {
      const resources = template.findResources('AWS::ECR::Repository');
      const firstRepo = Object.values(resources)[0];
      const tags = firstRepo?.Properties?.Tags ?? [];
      expect(tags).toContainEqual(
        expect.objectContaining({ Key: 'Application', Value: 'dog-keeper' })
      );
    });

    it('should apply Environment tag to stack', () => {
      const resources = template.findResources('AWS::ECR::Repository');
      const firstRepo = Object.values(resources)[0];
      const tags = firstRepo?.Properties?.Tags ?? [];
      expect(tags).toContainEqual(
        expect.objectContaining({ Key: 'Environment', Value: 'test' })
      );
    });

    it('should apply ManagedBy tag to stack', () => {
      const resources = template.findResources('AWS::ECR::Repository');
      const firstRepo = Object.values(resources)[0];
      const tags = firstRepo?.Properties?.Tags ?? [];
      expect(tags).toContainEqual(
        expect.objectContaining({ Key: 'ManagedBy', Value: 'cdk' })
      );
    });
  });

  describe('Stack Outputs', () => {
    it('should export EKS cluster name', () => {
      template.hasOutput('EksClusterName', {
        Value: Match.anyValue(),
      });
    });

    it('should export ECR repository URIs', () => {
      template.hasOutput('EcrBackendUri', {});
      template.hasOutput('EcrBffUri', {});
      template.hasOutput('EcrFrontendUri', {});
    });

    it('should export pipeline name', () => {
      template.hasOutput('PipelineName', {});
    });
  });
});
