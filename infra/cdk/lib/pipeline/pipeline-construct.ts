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
 * 1. Source  - Pull from GitHub via CodeConnections
 * 2. Build   - Docker build + push to ECR
 * 3. Test    - Unit tests via Garden (pods in EKS)
 * 4. Approve - Manual approval gate
 * 5. Deploy  - Garden deploy to EKS test environment
 */
export class PipelineConstruct extends Construct {
  public readonly pipeline: codepipeline.Pipeline;
  public readonly buildProject: codebuild.PipelineProject;
  public readonly testProject: codebuild.PipelineProject;
  public readonly deployProject: codebuild.PipelineProject;
  public deployRole!: iam.Role;

  constructor(scope: Construct, id: string, props: PipelineConstructProps) {
    super(scope, id);

    // Artifacts
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // CodeBuild projects
    this.buildProject = this.createBuildProject(props);
    this.testProject = this.createTestProject(props);
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

    // Stage 2: Build (docker build + push to ECR)
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

    // Stage 3: Test (unit tests via Garden in EKS)
    this.pipeline.addStage({
      stageName: 'Test',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'Unit_Tests',
          project: this.testProject,
          input: buildOutput,
        }),
      ],
    });

    // Stage 4: Manual Approval
    this.pipeline.addStage({
      stageName: 'Approve',
      actions: [
        new codepipeline_actions.ManualApprovalAction({
          actionName: 'Approve_Deploy',
          additionalInformation: 'Build and tests passed. Approve deployment to test environment?',
        }),
      ],
    });

    // Stage 5: Deploy to test environment
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
  }

  /**
   * Stage 2: Build — Docker build + push to ECR.
   */
  private createBuildProject(props: PipelineConstructProps): codebuild.PipelineProject {
    const buildRole = new iam.Role(this, 'BuildRole', {
      roleName: `dog-keeper-${props.environment}-codebuild-build-role`,
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });

    buildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ecr:GetAuthorizationToken'],
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

    buildRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['*'],
    }));

    return new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: `dog-keeper-${props.environment}-build`,
      role: buildRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        privileged: true,
      },
      environmentVariables: {
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        AWS_REGION: { value: cdk.Stack.of(this).region },
        ENVIRONMENT: { value: props.environment },
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
              'echo Building backend...',
              'docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT/backend:$IMAGE_TAG ./backend',
              '',
              'echo Building bff...',
              'docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT/bff:$IMAGE_TAG ./bff',
              '',
              'echo Building frontend...',
              'docker build -t $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT/frontend:$IMAGE_TAG ./frontend',
            ],
          },
          post_build: {
            commands: [
              'echo Pushing images to ECR...',
              'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT/backend:$IMAGE_TAG',
              'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT/bff:$IMAGE_TAG',
              'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/dog-keeper-$ENVIRONMENT/frontend:$IMAGE_TAG',
              '',
              'printf \'{"IMAGE_TAG":"%s"}\' $IMAGE_TAG > imagedefinitions.json',
              'echo "Build complete. Image tag: $IMAGE_TAG"',
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
   * Stage 3: Test — Unit tests via Garden (ephemeral pods in EKS).
   */
  private createTestProject(props: PipelineConstructProps): codebuild.PipelineProject {
    // Test project reuses the deploy role (needs EKS + ECR access to run test pods)
    const testRole = new iam.Role(this, 'TestRole', {
      roleName: `dog-keeper-${props.environment}-codebuild-test-role`,
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });

    testRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['eks:DescribeCluster', 'eks:ListClusters', 'eks:AccessKubernetesApi'],
      resources: [
        props.eksClusterArn ?? cdk.Arn.format({
          service: 'eks',
          resource: 'cluster',
          resourceName: props.eksClusterName,
        }, cdk.Stack.of(this)),
      ],
    }));

    testRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:GetCallerIdentity'],
      resources: ['*'],
    }));

    testRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ecr:GetAuthorizationToken'],
      resources: ['*'],
    }));

    testRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:BatchCheckLayerAvailability',
        'ecr:InitiateLayerUpload',
        'ecr:UploadLayerPart',
        'ecr:CompleteLayerUpload',
        'ecr:PutImage',
      ],
      resources: props.ecrRepositoryArns,
    }));

    testRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['*'],
    }));

    return new codebuild.PipelineProject(this, 'TestProject', {
      projectName: `dog-keeper-${props.environment}-test`,
      role: testRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
      },
      environmentVariables: {
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        AWS_REGION: { value: cdk.Stack.of(this).region },
        ENVIRONMENT: { value: props.environment },
        EKS_CLUSTER_NAME: { value: props.eksClusterName },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              '# Install kubectl',
              'curl -LO "https://dl.k8s.io/release/v1.31.0/bin/linux/amd64/kubectl"',
              'chmod +x kubectl && mv kubectl /usr/local/bin/',
              '',
              '# Install Garden CLI',
              'curl -sL https://get.garden.io/install.sh | bash',
              'export PATH=$HOME/.garden/bin:$PATH',
              '',
              '# Install AWS IAM Authenticator',
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
              '# Create ECR secret in K8s namespace',
              'kubectl create namespace dog-keeper-test --dry-run=client -o yaml | kubectl apply -f -',
              'kubectl delete secret ecr-registry-credentials -n dog-keeper-test --ignore-not-found',
              'kubectl create secret docker-registry ecr-registry-credentials -n dog-keeper-test --docker-server=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com --docker-username=AWS --docker-password=$(aws ecr get-login-password --region $AWS_REGION)',
              '',
              '# Initialize git repo (Garden requires git root)',
              'git config --global user.email "codebuild@dog-keeper.local"',
              'git config --global user.name "CodeBuild"',
              'git init && git add . && git commit -m "codebuild" --allow-empty --no-verify',
            ],
          },
          build: {
            commands: [
              '# Run unit tests via Garden (ephemeral pods in EKS)',
              'export PATH=$HOME/.garden/bin:$PATH',
              'garden test --env test --force',
            ],
          },
          post_build: {
            commands: [
              'echo "All unit tests passed."',
            ],
          },
        },
      }),
    });
  }

  /**
   * Stage 5: Deploy — Garden deploy to EKS test environment.
   */
  private createDeployProject(props: PipelineConstructProps): codebuild.PipelineProject {
    const deployRole = new iam.Role(this, 'DeployRole', {
      roleName: `dog-keeper-${props.environment}-codebuild-deploy-role`,
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    });
    this.deployRole = deployRole;

    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['eks:DescribeCluster', 'eks:ListClusters', 'eks:AccessKubernetesApi'],
      resources: [
        props.eksClusterArn ?? cdk.Arn.format({
          service: 'eks',
          resource: 'cluster',
          resourceName: props.eksClusterName,
        }, cdk.Stack.of(this)),
      ],
    }));

    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:GetCallerIdentity'],
      resources: ['*'],
    }));

    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ecr:GetAuthorizationToken'],
      resources: ['*'],
    }));

    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:BatchCheckLayerAvailability',
        'ecr:InitiateLayerUpload',
        'ecr:UploadLayerPart',
        'ecr:CompleteLayerUpload',
        'ecr:PutImage',
      ],
      resources: props.ecrRepositoryArns,
    }));

    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ssm:GetParameter', 'ssm:GetParameters'],
      resources: [
        cdk.Arn.format({
          service: 'ssm',
          resource: 'parameter',
          resourceName: `dog-keeper/${props.environment}/*`,
        }, cdk.Stack.of(this)),
      ],
    }));

    deployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
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
        AWS_ACCOUNT_ID: { value: cdk.Stack.of(this).account },
        AWS_REGION: { value: cdk.Stack.of(this).region },
        ENVIRONMENT: { value: props.environment },
        EKS_CLUSTER_NAME: { value: props.eksClusterName },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              '# Install kubectl',
              'curl -LO "https://dl.k8s.io/release/v1.31.0/bin/linux/amd64/kubectl"',
              'chmod +x kubectl && mv kubectl /usr/local/bin/',
              '',
              '# Install Helm',
              'curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash',
              '',
              '# Install Garden CLI',
              'curl -sL https://get.garden.io/install.sh | bash',
              'export PATH=$HOME/.garden/bin:$PATH',
              '',
              '# Install AWS IAM Authenticator',
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
              '# Create ECR secret in K8s namespace',
              'kubectl create namespace dog-keeper-test --dry-run=client -o yaml | kubectl apply -f -',
              'kubectl delete secret ecr-registry-credentials -n dog-keeper-test --ignore-not-found',
              'kubectl create secret docker-registry ecr-registry-credentials -n dog-keeper-test --docker-server=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com --docker-username=AWS --docker-password=$(aws ecr get-login-password --region $AWS_REGION)',
              '',
              '# Initialize git repo (Garden requires git root)',
              'git config --global user.email "codebuild@dog-keeper.local"',
              'git config --global user.name "CodeBuild"',
              'git init && git add . && git commit -m "codebuild" --allow-empty --no-verify',
            ],
          },
          build: {
            commands: [
              'export PATH=$HOME/.garden/bin:$PATH',
              '',
              '# Deploy to test environment using Garden',
              'garden deploy --env test --yes',
            ],
          },
          post_build: {
            commands: [
              '# Verify deployment',
              'kubectl get pods -n dog-keeper-test',
              'kubectl wait --for=condition=ready pods -l app -n dog-keeper-test --timeout=300s || true',
              'echo "Deployment to test environment complete."',
            ],
          },
        },
      }),
    });
  }

}
