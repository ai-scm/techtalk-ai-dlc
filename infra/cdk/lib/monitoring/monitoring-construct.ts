import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cdk from 'aws-cdk-lib';
import { MonitoringConstructProps } from '../shared/types';

/**
 * MonitoringConstruct creates CloudWatch Log Groups for all services.
 *
 * Each service gets its own log group with configurable retention.
 * Retention defaults to 7 days to minimize costs for the POC.
 */
export class MonitoringConstruct extends Construct {
  public readonly backendLogGroup: logs.LogGroup;
  public readonly bffLogGroup: logs.LogGroup;
  public readonly frontendLogGroup: logs.LogGroup;
  public readonly eksLogGroup: logs.LogGroup;
  public readonly logGroups: logs.LogGroup[];

  private static readonly SERVICE_NAMES = ['backend', 'bff', 'frontend', 'eks'] as const;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const retentionDays = props.logRetentionDays ?? 7;
    const retention = this.mapRetentionDays(retentionDays);

    this.backendLogGroup = this.createLogGroup('backend', props.environment, retention);
    this.bffLogGroup = this.createLogGroup('bff', props.environment, retention);
    this.frontendLogGroup = this.createLogGroup('frontend', props.environment, retention);
    this.eksLogGroup = this.createLogGroup('eks', props.environment, retention);

    this.logGroups = [
      this.backendLogGroup,
      this.bffLogGroup,
      this.frontendLogGroup,
      this.eksLogGroup,
    ];
  }

  private createLogGroup(
    serviceName: string,
    environment: string,
    retention: logs.RetentionDays
  ): logs.LogGroup {
    return new logs.LogGroup(this, `${serviceName}LogGroup`, {
      logGroupName: `/dog-keeper/${environment}/${serviceName}`,
      retention: retention,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  /**
   * Maps a numeric retention value to the CDK RetentionDays enum.
   */
  private mapRetentionDays(days: number): logs.RetentionDays {
    const mapping: Record<number, logs.RetentionDays> = {
      1: logs.RetentionDays.ONE_DAY,
      3: logs.RetentionDays.THREE_DAYS,
      5: logs.RetentionDays.FIVE_DAYS,
      7: logs.RetentionDays.ONE_WEEK,
      14: logs.RetentionDays.TWO_WEEKS,
      30: logs.RetentionDays.ONE_MONTH,
      60: logs.RetentionDays.TWO_MONTHS,
      90: logs.RetentionDays.THREE_MONTHS,
      365: logs.RetentionDays.ONE_YEAR,
    };

    return mapping[days] ?? logs.RetentionDays.ONE_WEEK;
  }
}
