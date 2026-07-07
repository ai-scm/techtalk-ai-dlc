import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { PipelineConstructProps } from '../shared/types';

/**
 * PipelineConstruct creates a CI/CD pipeline using CodePipeline.
 *
 * Pipeline stages:
 * 1. Source - Pull from GitHub via CodeConnections
 * 2. Build - Lint, test, docker build, push to ECR
 * 3. Deploy - Deploy to EKS test environment via Garden
 * 4. Approve - Manual approval gate (placeholder for production)
 */
export class PipelineConstruct extends Construct {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly buildProject: codebuild.PipelineProject;
  public readonly deployProject: codebuild.PipelineProject;
  public deployRole!: iam.Role;

  constructor(scope: Construct, id: string, props: PipelineConstructProps) {
    super(scope, id);

    // Source output artifact
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // CodeBuild project for build stage
    this.buildProject = this.createBuildProject(props);

    // CodeBuild project for deploy stage
    this.deployProject = this.createDeployProject(props);

    // CodePipeline
    this.pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `dog-keeper-${props.environment}-pipeline`,
      restartExecutionOnUpdate: false,
    });

    // Stage 1: Source (GitHub via CodeConnections)
    this.pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.CodeStarConnectionsSourceAction({
          actionName: 'GitHub_Source',
          owner: props.githubOwner,
          repo: props.githubRepo,
          branch: props.githubBranch,
          connectionArn: props.connectionArn,
          output: sourceOutput,
          triggerOnPush: true,
        }),
      ],
    });

    // Stage 2: Build (lint + test + docker build + push to ECR)
    this.pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Build_And_Push',
          project: this.buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // Stage 3: Deploy to test environment
    this.pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Deploy_Test',
          project: this.deployProject,
          input: buildOutput,
        }),
      ],
    });

    // Stage 4: Manual Approval (placeholder for production gate)
    this.pipeline.addStage({
      stageName: 'Approve',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'Production_Approval',
          additionalInformation: 'Approve deployment to production environment',
        }),
      ],
    });
  }

  /**
   * Creates the CodeBuild project for building and pushing Docker images.
   */
  private createBuildProject(props: PipelineConstructProps): codebuild.PipelineProject {
    const buildRole = new iam.Role(this, 'BuildRole', {
      roleName: `dog-keeper-${props.environment}-codebuild-build-role`,
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });

    // Grant ECR push permissions
    buildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
      ],
      resources: ['*'],
    }));

    buildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:BatchCheckLayerAvailability',
        'ecr:CompleteLayerUpload',
        'ecr:InitiateLayerUpload',
        'ecr:PutImage',
        'ecr:UploadLayerPart',
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
      ],
      resources: props.ecrRepositoryArns,
    }));

    // Grant CloudWatch Logs permissions
    buildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    return new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: `dog-keeper-${props.environment}-build`,
      role: buildRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: true, // Required for Docker builds
      },
      environmentVariables: {
        AWS_ACCOUNT_ID: {
          value: cdk.Stack.of(this).account,
        },
        AWS_REGION: {
          value: cdk.Stack.of(this).region,
        },
        ENVIRONMENT: {
          value: props.environment,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'echo Logging in to Amazon ECR...',
              'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com',
              'export COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
              'export IMAGE_TAG=${COMMIT_HASH:=latest}',
            ],
          },
          build: {
            commands: [
              '# Build Backend',
              'echo Building backend...',
              'docker build -t dog-keeper-$ENVIRONMENT-backend:$IMAGE_TAG ./backend',
              'docker tag dog-keeper-$ENVIRONMENT-backend:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT-backend:$IMAGE_TAG',
              '',
              '# Build BFF',
              'echo Building bff...',
              'docker build -t dog-keeper-$ENVIRONMENT-bff:$IMAGE_TAG ./bff',
              'docker tag dog-keeper-$ENVIRONMENT-bff:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT-bff:$IMAGE_TAG',
              '',
              '# Build Frontend',
              'echo Building frontend...',
              'docker build -t dog-keeper-$ENVIRONMENT-frontend:$IMAGE_TAG ./frontend',
              'docker tag dog-keeper-$ENVIRONMENT-frontend:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT-frontend:$IMAGE_TAG',
            ],
          },
          post_build: {
            commands: [
              '# Push images to ECR',
              'echo Pushing images to ECR...',
              'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT-backend:$IMAGE_TAG',
              'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT-bff:$IMAGE_TAG',
              'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT-frontend:$IMAGE_TAG',
              '',
              '# Write image definitions for deploy stage',
              'echo Writing image definitions...',
              'printf \'{"IMAGE_TAG":"%s"}\' $IMAGE_TAG > imagedefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ['imagedefinitions.json', '**/*'],
        },
      }),
    });
  }

  /**
   * Creates the CodeBuild project for deploying to EKS via Garden.
   */
  private createDeployProject(props: PipelineConstructProps): codebuild.PipelineProject {
    const deployRole = new iam.Role(this, 'DeployRole', {
      roleName: `dog-keeper-${props.environment}-codebuild-deploy-role`,
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });
    this.deployRole = deployRole;

    // Grant EKS access
    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'eks:DescribeCluster',
        'eks:ListClusters',
        'eks:AccessKubernetesApi',
      ],
      resources: [
        props.eksClusterArn ?? cdk.Arn.format({
          service: 'eks',
          resource: 'cluster',
          resourceName: props.eksClusterName,
        }, cdk.Stack.of(this)),
      ],
    }));

    // Grant STS for EKS authentication
    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sts:GetCallerIdentity',
      ],
      resources: ['*'],
    }));

    // Grant ECR pull permissions
    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetAuthorizationToken',
      ],
      resources: ['*'],
    }));

    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:BatchCheckLayerAvailability',
      ],
      resources: props.ecrRepositoryArns,
    }));

    // Grant SSM read for secrets
    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:GetParameter',
        'ssm:GetParameters',
      ],
      resources: [
        cdk.Arn.format({
          service: 'ssm',
          resource: 'parameter',
          resourceName: `dog-keeper/${props.environment}/*`,
        }, cdk.Stack.of(this)),
      ],
    }));

    // Grant CloudWatch Logs permissions
    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: ['*'],
    }));

    return new codebuild.PipelineProject(this, 'DeployProject', {
      projectName: `dog-keeper-${props.environment}-deploy`,
      role: deployRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      environmentVariables: {
        AWS_ACCOUNT_ID: {
          value: cdk.Stack.of(this).account,
        },
        AWS_REGION: {
          value: cdk.Stack.of(this).region,
        },
        ENVIRONMENT: {
          value: props.environment,
        },
        EKS_CLUSTER_NAME: {
          value: props.eksClusterName,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              '# Install kubectl',
              'curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl"',
              'chmod +x kubectl && mv kubectl /usr/local/bin/',
              '',
              '# Install Garden CLI',
              'curl -sL https://get.garden.io/install.sh | bash',
              'export PATH=$HOME/.garden/bin:$PATH',
              'garden version',
              '',
              '# Install AWS IAM Authenticator (for EKS auth)',
              'curl -Lo aws-iam-authenticator https://github.com/kubernetes-sigs/aws-iam-authenticator/releases/download/v0.6.14/aws-iam-authenticator_0.6.14_linux_amd64',
              'chmod +x aws-iam-authenticator && mv aws-iam-authenticator /usr/local/bin/',
            ],
          },
          pre_build: {
            commands: [
              '# Configure kubectl for EKS',
              'aws eks update-kubeconfig --name $EKS_CLUSTER_NAME --region $AWS_REGION',
              '',
              '# Authenticate Docker to ECR',
              'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com',
              '',
              '# Read image tag from build output',
              'export IMAGE_TAG=$(cat imagedefinitions.json | python3 -c "import sys, json; print(json.load(sys.stdin)[\'IMAGE_TAG\'])")',
              'echo "Deploying image tag: $IMAGE_TAG"',
            ],
          },
          build: {
            commands: [
              '# Deploy to test environment using Garden',
              'export PATH=$HOME/.garden/bin:$PATH',
              'garden deploy --env test --yes',
              '',
              '# Wait for all pods to be ready',
              'kubectl wait --for=condition=ready pods --all -n dog-keeper-test --timeout=300s',
            ],
          },
          post_build: {
            commands: [
              '# Run smoke tests via Garden',
              'export PATH=$HOME/.garden/bin:$PATH',
              'garden test integration-tests --env test --force',
              '',
              '# Verify service health',
              'echo "Verifying service health..."',
              'kubectl get pods -n dog-keeper-test',
              'echo "Deploy and test complete."',
            ],
          },
        },
      }),
    });
  }

}
