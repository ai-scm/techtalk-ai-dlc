#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DogKeeperStack } from '../lib/dog-keeper-stack';
import { testConfig } from '../config/test';

/**
 * CDK Application entry point.
 *
 * Responsibilities:
 * - Load environment configuration
 * - Instantiate the DogKeeperStack
 *
 * No business logic belongs here.
 *
 * Usage:
 *   cdk deploy DogKeeperStack    # Deploy all infrastructure
 *   cdk destroy DogKeeperStack   # Tear down all infrastructure
 *   cdk synth                    # Synthesize CloudFormation template
 *   cdk diff                     # Preview changes
 */
const app = new cdk.App();

// Determine environment from CDK context or default to 'test'
const environmentName = app.node.tryGetContext('environment') ?? 'test';

// Select configuration based on environment
const configMap: Record<string, typeof testConfig> = {
  test: testConfig,
  // Future: production: productionConfig,
};

const config = configMap[environmentName];
if (!config) {
  throw new Error(`Unknown environment: ${environmentName}. Available: ${Object.keys(configMap).join(', ')}`);
}

new DogKeeperStack(app, 'DogKeeperStack', {
  env: {
    account: config.account,
    region: config.region,
  },
  description: `Dog Keeper platform infrastructure - ${config.environment} environment`,
  config: config,
});

app.synth();
