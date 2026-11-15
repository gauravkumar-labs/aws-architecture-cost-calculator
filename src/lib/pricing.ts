import { AWS_REGIONS, EKS_NODE_STRATEGIES, RDS_INSTANCE_CATALOG } from '../data/presets';
import {
  BreakEvenPoint,
  CostAnalysis,
  EstimatorConfig,
  LineItemBreakdown,
} from '../types/estimator';

const HOURS_PER_MONTH = 730;
const SECONDS_PER_MONTH = 30 * 86400; // 2,592,000

/**
 * Computes AWS monthly costs for a given EstimatorConfig at any override RPS.
 */
export function evaluateAtRps(
  config: EstimatorConfig,
  overrideRps?: number
): {
  lambda: LineItemBreakdown;
  eks: LineItemBreakdown;
  fargate: LineItemBreakdown;
  eksAvgNodes: number;
  eksPeakNodes: number;
  fargateAvgTasks: number;
  fargatePeakTasks: number;
  monthlyRequestsMillions: number;
  effectiveAvgRps: number;
  peakRps: number;
  peakConcurrency: number;
} {
  const baseRps = overrideRps ?? config.rps;
  const region = AWS_REGIONS[config.region];
  const nodeSpec = EKS_NODE_STRATEGIES[config.eksNodeStrategy];
  const rdsSpec = RDS_INSTANCE_CATALOG[config.rdsEngine][config.rdsTier];

  // Traffic profile: burstHoursPerDay at (baseRps * burstMultiplier), remaining hours at baseRps
  const burstFraction = Math.min(Math.max(config.burstHoursPerDay, 0), 24) / 24;
  const steadyFraction = 1 - burstFraction;
  const peakRps = baseRps * config.burstMultiplier;
  const effectiveAvgRps = baseRps * steadyFraction + peakRps * burstFraction;

  const monthlyRequests = effectiveAvgRps * SECONDS_PER_MONTH;
  const monthlyRequestsMillions = monthlyRequests / 1_000_000;
  const peakConcurrency = peakRps * (config.p95DurationMs / 1000);

  // ---------------------------------------------------------------------------
  // 1. SHARED DATA, MESSAGING & NETWORKING
  // ---------------------------------------------------------------------------
  // RDS Database: Primary (1x or 2x if Multi-AZ) + Read Replicas (1x each) + GP3 Storage
  const rdsHourlyUnit = rdsSpec.hourlySingleAz * region.dbMultiplier;
  const primaryMultiplier = config.rdsMultiAz ? 2 : 1;
  const storageMultiplier = config.rdsMultiAz ? 2 : 1;
  const replicaStorageMultiplier = config.rdsReadReplicas;
  const rdsComputeCost =
    rdsHourlyUnit * HOURS_PER_MONTH * (primaryMultiplier + config.rdsReadReplicas);
  const rdsStorageCost =
    config.rdsStorageGb *
    rdsSpec.storagePerGb *
    region.dbMultiplier *
    (storageMultiplier + replicaStorageMultiplier);
  const rdsDatabase = rdsComputeCost + rdsStorageCost;

  // Amazon SQS: Each message typically incurs Send + Receive + Delete (3 API requests)
  const sqsRequestsMillions = config.sqsMillionMsgs * 3;
  const billableSqsMillions = Math.max(0, sqsRequestsMillions - 1); // 1M free tier
  const sqsRatePerMillion = config.sqsQueueType === 'fifo' ? 0.5 : 0.4;
  const sqsMessaging = billableSqsMillions * sqsRatePerMillion;

  // NAT Gateway + Internet Data Egress
  const natHourlyCost = 0.045 * region.computeMultiplier * HOURS_PER_MONTH * config.natGatewayAzCount;
  const natProcessingCost = config.natEgressGb * 0.045 * region.computeMultiplier;
  const billableInternetEgressGb = Math.max(0, config.natEgressGb - 100); // 100 GB free tier
  const internetEgressCost = billableInternetEgressGb * region.egressPerGb;
  const natAndEgress = natHourlyCost + natProcessingCost + internetEgressCost;

  // Application Load Balancer (ALB): $0.0225/hr + LCU charges (~$0.008/LCU-hr)
  // Estimate LCUs from RPS & payload size (~1 LCU handles 25 new conn/s or 2.22 Mbps)
  const avgLcus = Math.max(1, effectiveAvgRps / 25 + config.natEgressGb / 730 / 1);
  const albCost = (0.0225 + 0.008 * avgLcus) * region.computeMultiplier * HOURS_PER_MONTH;

  // ---------------------------------------------------------------------------
  // 2. COMPUTE MODEL A: AWS LAMBDA (.NET 8/9)
  // ---------------------------------------------------------------------------
  // Mean billed duration is typically ~75% of p95 duration; Native AOT avoids JIT cold-start penalty
  const effectiveDurationMs =
    config.dotnetMode === 'native-aot'
      ? config.p95DurationMs * 0.72
      : config.p95DurationMs * 0.82;
  const gbSeconds = monthlyRequests * (config.memoryMb / 1024) * (effectiveDurationMs / 1000);
  const lambdaGbSecRate =
    (config.lambdaArch === 'arm64' ? 0.0000133334 : 0.0000166667) * region.computeMultiplier;
  const lambdaRequestCost = monthlyRequestsMillions * 0.2 * region.computeMultiplier;
  const lambdaDurationCost = gbSeconds * lambdaGbSecRate;

  // Optional Provisioned Concurrency (for latency-sensitive .NET JIT APIs)
  const pcRate =
    (config.lambdaArch === 'arm64' ? 0.0000033333 : 0.0000041667) * region.computeMultiplier;
  const lambdaPcCost =
    config.lambdaProvisionedConcurrency > 0
      ? config.lambdaProvisionedConcurrency *
        (config.memoryMb / 1024) *
        (HOURS_PER_MONTH * 3600) *
        pcRate
      : 0;

  const lambdaCompute = lambdaRequestCost + lambdaDurationCost + lambdaPcCost;
  const lambdaTotal =
    lambdaCompute + albCost + rdsDatabase + sqsMessaging + natAndEgress;

  // ---------------------------------------------------------------------------
  // 3. COMPUTE MODEL B: AMAZON EKS (.NET KESTREL CONTAINERS)
  // ---------------------------------------------------------------------------
  // .NET Kestrel throughput per 1 vCPU depends on p95 latency (I/O-bound vs CPU-bound).
  // Model pod capacity realistically: 1 vCPU handles ~ (1000 / max(20, p95)) * 12 concurrent async reqs,
  // capped by CPU saturation (~140 req/s per vCPU for fast JSON APIs).
  const kestrelRpsPerVcpu = Math.min(160, Math.max(12, (1000 / Math.max(20, config.p95DurationMs)) * 6.5));
  const vcpuCapacityPerPod = config.vcpuPerPod * kestrelRpsPerVcpu * (config.dotnetMode === 'native-aot' ? 1.1 : 1.0);
  const targetUtilization = 0.65;

  const steadyPodsNeeded = Math.max(2, Math.ceil(baseRps / (vcpuCapacityPerPod * targetUtilization)));
  const peakPodsNeeded = Math.max(2, Math.ceil(peakRps / (vcpuCapacityPerPod * targetUtilization)));

  const podMemGb = config.memoryMb / 1024;
  // Account for ~15% kubelet/DaemonSet overhead per node
  const usableNodeVcpu = nodeSpec.vcpu * 0.85;
  const usableNodeMemGb = nodeSpec.memoryGb * 0.85;

  const podsToNodes = (pods: number) => {
    const nodesByCpu = (pods * config.vcpuPerPod) / usableNodeVcpu;
    const nodesByMem = (pods * podMemGb) / usableNodeMemGb;
    return Math.max(2, Math.ceil(Math.max(nodesByCpu, nodesByMem)));
  };

  const steadyNodes = podsToNodes(steadyPodsNeeded);
  const eksPeakNodes = podsToNodes(peakPodsNeeded);
  const eksAvgNodes = steadyNodes * steadyFraction + eksPeakNodes * burstFraction;

  // If Spot + Graviton, keep 1 baseline On-Demand node ($0.0725/hr) for CoreDNS/Karpenter stability
  let eksCompute = 0;
  if (config.eksNodeStrategy === 'spot-graviton') {
    const onDemandSystemNodeCost = 0.0725 * region.computeMultiplier * HOURS_PER_MONTH;
    const spotNodesCount = Math.max(0, eksAvgNodes - 1);
    eksCompute =
      onDemandSystemNodeCost +
      spotNodesCount * nodeSpec.hourlyRate * region.computeMultiplier * HOURS_PER_MONTH;
  } else {
    eksCompute = eksAvgNodes * nodeSpec.hourlyRate * region.computeMultiplier * HOURS_PER_MONTH;
  }

  const eksControlPlane = config.eksControlPlaneEnabled ? 73.0 : 0;
  const eksTotal =
    eksCompute + eksControlPlane + albCost + rdsDatabase + sqsMessaging + natAndEgress;

  // ---------------------------------------------------------------------------
  // 4. COMPUTE MODEL C: AMAZON ECS / AWS FARGATE (OPTIONAL)
  // ---------------------------------------------------------------------------
  const fargateSteadyTasks = steadyPodsNeeded;
  const fargatePeakTasks = peakPodsNeeded;
  const fargateAvgTasks = fargateSteadyTasks * steadyFraction + fargatePeakTasks * burstFraction;

  // Fargate vCPU & GB hourly rates (ARM64 Graviton vs x86)
  const useArm = config.eksNodeStrategy !== 'x86-ondemand';
  const fargateVcpuHr = (useArm ? 0.03238 : 0.04048) * region.computeMultiplier;
  const fargateGbHr = (useArm ? 0.00356 : 0.004445) * region.computeMultiplier;
  const fargateSpotDiscount = 1 - (config.fargateSpotPercent / 100) * 0.7;

  const fargateTaskHourly =
    (config.vcpuPerPod * fargateVcpuHr + podMemGb * fargateGbHr) * fargateSpotDiscount;
  const fargateCompute = fargateAvgTasks * fargateTaskHourly * HOURS_PER_MONTH;
  const fargateTotal =
    fargateCompute + albCost + rdsDatabase + sqsMessaging + natAndEgress;

  return {
    lambda: {
      compute: lambdaCompute,
      controlPlane: 0,
      loadBalancer: albCost,
      rdsDatabase,
      sqsMessaging,
      natAndEgress,
      total: lambdaTotal,
    },
    eks: {
      compute: eksCompute,
      controlPlane: eksControlPlane,
      loadBalancer: albCost,
      rdsDatabase,
      sqsMessaging,
      natAndEgress,
      total: eksTotal,
    },
    fargate: {
      compute: fargateCompute,
      controlPlane: 0,
      loadBalancer: albCost,
      rdsDatabase,
      sqsMessaging,
      natAndEgress,
      total: fargateTotal,
    },
    eksAvgNodes,
    eksPeakNodes,
    fargateAvgTasks,
    fargatePeakTasks,
    monthlyRequestsMillions,
    effectiveAvgRps,
    peakRps,
    peakConcurrency,
  };
}

/**
 * Computes full cost analysis including break-even RPS curves.
 */
export function analyzeArchitectureCosts(config: EstimatorConfig): CostAnalysis {
  const current = evaluateAtRps(config);
  const nodeSpec = EKS_NODE_STRATEGIES[config.eksNodeStrategy];
  const rdsSpec = RDS_INSTANCE_CATALOG[config.rdsEngine][config.rdsTier];

  // Sweep RPS from 1 to 1000 to find exact crossover points
  let breakEvenEksRps: number | null = null;
  let breakEvenFargateRps: number | null = null;

  for (let r = 1; r <= 1200; r += 2) {
    const sample = evaluateAtRps(config, r);
    if (breakEvenEksRps === null && sample.eks.total <= sample.lambda.total) {
      breakEvenEksRps = r;
    }
    if (breakEvenFargateRps === null && sample.fargate.total <= sample.lambda.total) {
      breakEvenFargateRps = r;
    }
    if (breakEvenEksRps !== null && breakEvenFargateRps !== null) break;
  }

  let cheapestPlatform: 'lambda' | 'eks' | 'fargate' = 'lambda';
  const candidates: Array<{ id: 'lambda' | 'eks' | 'fargate'; total: number }> = [
    { id: 'lambda', total: current.lambda.total },
    { id: 'eks', total: current.eks.total },
  ];
  if (config.includeEcsFargate) {
    candidates.push({ id: 'fargate', total: current.fargate.total });
  }
  candidates.sort((a, b) => a.total - b.total);
  cheapestPlatform = candidates[0].id;

  return {
    lambda: current.lambda,
    eks: current.eks,
    fargate: current.fargate,
    telemetry: {
      monthlyRequestsMillions: current.monthlyRequestsMillions,
      effectiveAvgRps: current.effectiveAvgRps,
      peakRps: current.peakRps,
      peakConcurrency: current.peakConcurrency,
      eksAvgNodes: current.eksAvgNodes,
      eksPeakNodes: current.eksPeakNodes,
      eksNodeLabel: `${nodeSpec.instanceType} (${nodeSpec.capacityType === 'SPOT' ? 'Spot/OD' : 'On-Demand'})`,
      fargateAvgTasks: current.fargateAvgTasks,
      fargatePeakTasks: current.fargatePeakTasks,
      rdsInstanceLabel: rdsSpec.instanceClass,
    },
    cheapestPlatform,
    breakEvenEksRps,
    breakEvenFargateRps,
    lambdaVsEksDelta: current.lambda.total - current.eks.total,
  };
}

/**
 * Generates smooth chart points for the Break-Even RPS visualization.
 */
export function buildBreakEvenSeries(config: EstimatorConfig): BreakEvenPoint[] {
  const maxRps = Math.max(300, Math.min(1000, Math.ceil(config.rps * 2.2 / 50) * 50));
  const steps = 28;
  const points: BreakEvenPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const rps = Math.max(1, Math.round((maxRps / steps) * i));
    const evalResult = evaluateAtRps(config, rps);
    points.push({
      rps,
      lambdaTotal: Math.round(evalResult.lambda.total),
      eksTotal: Math.round(evalResult.eks.total),
      fargateTotal: Math.round(evalResult.fargate.total),
    });
  }

  return points;
}

export function formatCurrency(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
