import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as cdk from 'aws-cdk-lib';
import { EcrConstructProps } from '../shared/types';

/**
 * EcrConstruct creates ECR repositories for all application services.
 *
 * Each repository is configured with:
 * - Immutable image tags (prevents tag overwriting)
 * - Image scanning on push (vulnerability detection)
 * - Lifecycle policy (limits stored images to control costs)
 */
export class EcrConstruct extends Construct {
  public readonly backendRepository: ecr.Repository;
  public readonly bffRepository: ecr.Repository;
  public readonly frontendRepository: ecr.Repository;
  public readonly repositories: ecr.Repository[];

  private static readonly SERVICE_NAMES = ['backend', 'bff', 'frontend'] as const;

  constructor(scope: Construct, id: string, props: EcrConstructProps) {
    super(scope, id);

    const maxImageCount = props.maxImageCount ?? 10;

    this.backendRepository = this.createRepository('backend', props.environment, maxImageCount);
    this.bffRepository = this.createRepository('bff', props.environment, maxImageCount);
    this.frontendRepository = this.createRepository('frontend', props.environment, maxImageCount);

    this.repositories = [
      this.backendRepository,
      this.bffRepository,
      this.frontendRepository,
    ];
  }

  private createRepository(
    serviceName: string,
    environment: string,
    maxImageCount: number
  ): ecr.Repository {
    const repository = new ecr.Repository(this, `${serviceName}Repo`, {
      repositoryName: `dog-keeper-${environment}/${serviceName}`,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.AES_256,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    // Lifecycle policy: keep only the most recent N images
    repository.addLifecycleRule({
      maxImageCount: maxImageCount,
      rulePriority: 1,
      description: `Keep only the last ${maxImageCount} images`,
    });

    return repository;
  }
}
