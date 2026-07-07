import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { NetworkingConstructProps } from '../shared/types';

/**
 * NetworkingConstruct imports an existing VPC and subnets,
 * and creates security groups for EKS and ALB.
 *
 * The VPC and subnets must already exist in the AWS account.
 * Their IDs are provided via configuration.
 */
export class NetworkingConstruct extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly eksSecurityGroup: ec2.SecurityGroup;
  public readonly albSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkingConstructProps) {
    super(scope, id);

    // Import existing VPC
    this.vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcId: props.vpcId,
    });

    // Import private subnets
    this.privateSubnets = props.privateSubnetIds.map((subnetId, index) =>
      ec2.Subnet.fromSubnetId(this, `PrivateSubnet${index}`, subnetId)
    );

    // Import public subnets
    this.publicSubnets = props.publicSubnetIds.map((subnetId, index) =>
      ec2.Subnet.fromSubnetId(this, `PublicSubnet${index}`, subnetId)
    );

    // Security Group for EKS cluster
    this.eksSecurityGroup = new ec2.SecurityGroup(this, 'EksSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `dog-keeper-${props.environment}-eks-sg`,
      description: 'Security group for EKS cluster communication',
      allowAllOutbound: true,
    });

    // Allow internal pod communication
    this.eksSecurityGroup.addIngressRule(
      this.eksSecurityGroup,
      ec2.Port.allTraffic(),
      'Allow all traffic between cluster nodes'
    );

    // Security Group for ALB
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `dog-keeper-${props.environment}-alb-sg`,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    // Allow HTTP and HTTPS from internet
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP from internet'
    );
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS from internet'
    );

    // Allow ALB to communicate with EKS pods
    this.eksSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow ALB to reach frontend pods'
    );
    this.eksSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(8001),
      'Allow ALB to reach BFF pods'
    );
    this.eksSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(8000),
      'Allow ALB to reach backend pods'
    );
  }
}
