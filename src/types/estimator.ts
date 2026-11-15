export type AwsRegion = 'us-east-1' | 'us-west-2' | 'eu-west-1' | 'ap-southeast-1';

export type DotNetRuntimeMode = 'native-aot' | 'kestrel-jit';

export type EksNodeStrategy = 'spot-graviton' | 'graviton-ondemand' | 'x86-ondemand';

export type LambdaArch = 'arm64' | 'x86_64';

export type RdsEngine = 'postgres' | 'sqlserver';

export type RdsTier = 'small' | 'medium' | 'large' | 'xlarge';

export type SqsQueueType = 'standard' | 'fifo';

export type PresetId = 'spiky-webhook' | 'steady-microservice' | 'enterprise-monolith' | 'custom';

export interface EstimatorConfig {
  presetId: PresetId;
  region: AwsRegion;
  dotnetMode: DotNetRuntimeMode;
  // Traffic & Compute
  rps: number;
  burstMultiplier: number;
  burstHoursPerDay: number;
  p95DurationMs: number;
  memoryMb: number;
  vcpuPerPod: number;
  // Lambda specific
  lambdaArch: LambdaArch;
  lambdaProvisionedConcurrency: number;
  // EKS & ECS specific
  eksControlPlaneEnabled: boolean;
  eksNodeStrategy: EksNodeStrategy;
  includeEcsFargate: boolean;
  fargateSpotPercent: number;
  // Data, Messaging & Network
  rdsEngine: RdsEngine;
  rdsTier: RdsTier;
  rdsMultiAz: boolean;
  rdsReadReplicas: number;
  rdsStorageGb: number;
  sqsMillionMsgs: number;
  sqsQueueType: SqsQueueType;
  natEgressGb: number;
  natGatewayAzCount: 1 | 2;
}

export interface WorkloadPreset {
  id: Exclude<PresetId, 'custom'>;
  name: string;
  subtitle: string;
  dotnetTarget: string;
  recommendedArchLabel: string;
  summary: string;
  productExplanation: string;
  bestFor: string;
  config: Omit<EstimatorConfig, 'presetId'>;
}

export interface LineItemBreakdown {
  compute: number;
  controlPlane: number;
  loadBalancer: number;
  rdsDatabase: number;
  sqsMessaging: number;
  natAndEgress: number;
  total: number;
}

export interface SizingTelemetry {
  monthlyRequestsMillions: number;
  effectiveAvgRps: number;
  peakRps: number;
  peakConcurrency: number;
  eksAvgNodes: number;
  eksPeakNodes: number;
  eksNodeLabel: string;
  fargateAvgTasks: number;
  fargatePeakTasks: number;
  rdsInstanceLabel: string;
}

export interface CostAnalysis {
  lambda: LineItemBreakdown;
  eks: LineItemBreakdown;
  fargate: LineItemBreakdown;
  telemetry: SizingTelemetry;
  cheapestPlatform: 'lambda' | 'eks' | 'fargate';
  breakEvenEksRps: number | null;
  breakEvenFargateRps: number | null;
  lambdaVsEksDelta: number; // positive means EKS is cheaper than Lambda
}

export interface BreakEvenPoint {
  rps: number;
  lambdaTotal: number;
  eksTotal: number;
  fargateTotal: number;
}
