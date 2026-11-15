import { AwsRegion, EksNodeStrategy, RdsEngine, RdsTier, WorkloadPreset } from '../types/estimator';

export const AWS_REGIONS: Record<
  AwsRegion,
  { name: string; code: string; computeMultiplier: number; dbMultiplier: number; egressPerGb: number }
> = {
  'us-east-1': {
    name: 'US East (N. Virginia)',
    code: 'us-east-1',
    computeMultiplier: 1.0,
    dbMultiplier: 1.0,
    egressPerGb: 0.09,
  },
  'us-west-2': {
    name: 'US West (Oregon)',
    code: 'us-west-2',
    computeMultiplier: 1.0,
    dbMultiplier: 1.0,
    egressPerGb: 0.09,
  },
  'eu-west-1': {
    name: 'Europe (Ireland)',
    code: 'eu-west-1',
    computeMultiplier: 1.08,
    dbMultiplier: 1.1,
    egressPerGb: 0.09,
  },
  'ap-southeast-1': {
    name: 'Asia Pacific (Singapore)',
    code: 'ap-southeast-1',
    computeMultiplier: 1.15,
    dbMultiplier: 1.18,
    egressPerGb: 0.12,
  },
};

export const EKS_NODE_STRATEGIES: Record<
  EksNodeStrategy,
  {
    label: string;
    instanceType: string;
    arch: 'arm64' | 'x86_64';
    vcpu: number;
    memoryGb: number;
    hourlyRate: number;
    capacityType: 'SPOT' | 'ON_DEMAND';
    description: string;
  }
> = {
  'spot-graviton': {
    label: 'Spot + Graviton3',
    instanceType: 'c7g.large',
    arch: 'arm64',
    vcpu: 2,
    memoryGb: 4,
    hourlyRate: 0.026, // ~64% discount off c7g.large On-Demand ($0.0725) + 1 OD fallback factored in engine
    capacityType: 'SPOT',
    description: 'ARM64 .NET 8/9 containers on EC2 Spot with 1 On-Demand system node.',
  },
  'graviton-ondemand': {
    label: 'Graviton3 On-Demand',
    instanceType: 'm7g.large',
    arch: 'arm64',
    vcpu: 2,
    memoryGb: 8,
    hourlyRate: 0.0816,
    capacityType: 'ON_DEMAND',
    description: 'Predictable ARM64 compute with ~20% better price-performance than x86.',
  },
  'x86-ondemand': {
    label: 'x86_64 On-Demand',
    instanceType: 'm6i.large',
    arch: 'x86_64',
    vcpu: 2,
    memoryGb: 8,
    hourlyRate: 0.096,
    capacityType: 'ON_DEMAND',
    description: 'Standard Intel x86_64 nodes for legacy native COM/x86 dependencies.',
  },
};

export const RDS_INSTANCE_CATALOG: Record<
  RdsEngine,
  Record<RdsTier, { instanceClass: string; vcpu: number; ramGb: number; hourlySingleAz: number; storagePerGb: number }>
> = {
  postgres: {
    small: {
      instanceClass: 'db.t4g.medium',
      vcpu: 2,
      ramGb: 4,
      hourlySingleAz: 0.065,
      storagePerGb: 0.115,
    },
    medium: {
      instanceClass: 'db.r6g.large',
      vcpu: 2,
      ramGb: 16,
      hourlySingleAz: 0.26,
      storagePerGb: 0.115,
    },
    large: {
      instanceClass: 'db.r6g.xlarge',
      vcpu: 4,
      ramGb: 32,
      hourlySingleAz: 0.52,
      storagePerGb: 0.115,
    },
    xlarge: {
      instanceClass: 'db.r6g.2xlarge',
      vcpu: 8,
      ramGb: 64,
      hourlySingleAz: 1.04,
      storagePerGb: 0.115,
    },
  },
  sqlserver: {
    small: {
      instanceClass: 'db.t3.medium (Std)',
      vcpu: 2,
      ramGb: 4,
      hourlySingleAz: 0.184,
      storagePerGb: 0.115,
    },
    medium: {
      instanceClass: 'db.m6i.large (Std)',
      vcpu: 2,
      ramGb: 8,
      hourlySingleAz: 0.422,
      storagePerGb: 0.115,
    },
    large: {
      instanceClass: 'db.r6i.xlarge (Std)',
      vcpu: 4,
      ramGb: 32,
      hourlySingleAz: 0.96,
      storagePerGb: 0.115,
    },
    xlarge: {
      instanceClass: 'db.r6i.2xlarge (Std)',
      vcpu: 8,
      ramGb: 64,
      hourlySingleAz: 1.92,
      storagePerGb: 0.115,
    },
  },
};

export const WORKLOAD_PRESETS: WorkloadPreset[] = [
  {
    id: 'spiky-webhook',
    name: 'Spiky Lead-Processing Webhook API',
    subtitle: 'Burst-heavy ingestion',
    dotnetTarget: '.NET 8 Native AOT Minimal API',
    summary: 'Low steady baseline with sudden 8x marketing campaign spikes, SQS buffering, and lean PostgreSQL persistence.',
    config: {
      region: 'us-east-1',
      dotnetMode: 'native-aot',
      rps: 14,
      burstMultiplier: 8.0,
      burstHoursPerDay: 3,
      p95DurationMs: 85,
      memoryMb: 512,
      vcpuPerPod: 0.5,
      lambdaArch: 'arm64',
      lambdaProvisionedConcurrency: 0,
      eksControlPlaneEnabled: true,
      eksNodeStrategy: 'spot-graviton',
      includeEcsFargate: true,
      fargateSpotPercent: 50,
      rdsEngine: 'postgres',
      rdsTier: 'small',
      rdsMultiAz: false,
      rdsReadReplicas: 0,
      rdsStorageGb: 100,
      sqsMillionMsgs: 22,
      sqsQueueType: 'standard',
      natEgressGb: 120,
      natGatewayAzCount: 1,
    },
  },
  {
    id: 'steady-microservice',
    name: 'Steady High-Throughput B2B Microservice',
    subtitle: 'Sustained API & worker mesh',
    dotnetTarget: '.NET 9 ASP.NET Core Kestrel + EF Core',
    summary: 'Consistent 24/7 partner API traffic at 180 RPS with low burst variance, Multi-AZ PostgreSQL, and 1 read replica.',
    config: {
      region: 'us-east-1',
      dotnetMode: 'kestrel-jit',
      rps: 180,
      burstMultiplier: 1.8,
      burstHoursPerDay: 4,
      p95DurationMs: 50,
      memoryMb: 1024,
      vcpuPerPod: 1.0,
      lambdaArch: 'arm64',
      lambdaProvisionedConcurrency: 10,
      eksControlPlaneEnabled: true,
      eksNodeStrategy: 'spot-graviton',
      includeEcsFargate: true,
      fargateSpotPercent: 30,
      rdsEngine: 'postgres',
      rdsTier: 'large',
      rdsMultiAz: true,
      rdsReadReplicas: 1,
      rdsStorageGb: 500,
      sqsMillionMsgs: 140,
      sqsQueueType: 'standard',
      natEgressGb: 850,
      natGatewayAzCount: 2,
    },
  },
  {
    id: 'enterprise-monolith',
    name: 'Enterprise Monolith Migration',
    subtitle: 'Legacy WCF / MVC containerization',
    dotnetTarget: '.NET 8 Modular Monolith (Containers)',
    summary: 'Heavy 2 GB memory footprint, 240ms p95 latency, SQL Server Multi-AZ + read replica, and strict portability requirements.',
    config: {
      region: 'us-east-1',
      dotnetMode: 'kestrel-jit',
      rps: 65,
      burstMultiplier: 2.5,
      burstHoursPerDay: 5,
      p95DurationMs: 240,
      memoryMb: 2048,
      vcpuPerPod: 2.0,
      lambdaArch: 'x86_64',
      lambdaProvisionedConcurrency: 20,
      eksControlPlaneEnabled: true,
      eksNodeStrategy: 'graviton-ondemand',
      includeEcsFargate: true,
      fargateSpotPercent: 0,
      rdsEngine: 'sqlserver',
      rdsTier: 'large',
      rdsMultiAz: true,
      rdsReadReplicas: 1,
      rdsStorageGb: 1200,
      sqsMillionMsgs: 45,
      sqsQueueType: 'fifo',
      natEgressGb: 600,
      natGatewayAzCount: 2,
    },
  },
];
