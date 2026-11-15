import { EKS_NODE_STRATEGIES, RDS_INSTANCE_CATALOG, WORKLOAD_PRESETS } from '../data/presets';
import { CostAnalysis, EstimatorConfig } from '../types/estimator';
import { formatCurrency, formatNumber } from './pricing';

export function generateTerraformTfvars(config: EstimatorConfig, analysis: CostAnalysis): string {
  const nodeSpec = EKS_NODE_STRATEGIES[config.eksNodeStrategy];
  const rdsSpec = RDS_INSTANCE_CATALOG[config.rdsEngine][config.rdsTier];
  const cleanRdsInstanceClass = rdsSpec.instanceClass.replace(' (Std)', '');
  const preset = WORKLOAD_PRESETS.find((p) => p.id === config.presetId);
  const projectSlug = preset ? preset.id : 'custom-dotnet-workload';

  const lines = [
    `# ==============================================================================`,
    `# AWS .NET 8/9 Architecture Baseline - Terraform Variables`,
    `# Workload Profile : ${preset ? preset.name : 'Custom .NET Architecture'}`,
    `# Recommended Path : ${analysis.cheapestPlatform.toUpperCase()} (${formatCurrency(
      analysis[analysis.cheapestPlatform].total
    )}/mo estimated)`,
    `# ==============================================================================`,
    ``,
    `aws_region              = "${config.region}"`,
    `project_name            = "${projectSlug}"`,
    `environment             = "production"`,
    `dotnet_runtime_mode     = "${config.dotnetMode}"`,
    ``,
    `# ------------------------------------------------------------------------------`,
    `# Traffic & Sizing Assumptions`,
    `# ------------------------------------------------------------------------------`,
    `baseline_rps            = ${config.rps}`,
    `peak_rps                = ${Math.round(analysis.telemetry.peakRps)}`,
    `p95_duration_ms         = ${config.p95DurationMs}`,
    `monthly_requests_m      = ${analysis.telemetry.monthlyRequestsMillions.toFixed(2)}`,
    ``,
    `# ------------------------------------------------------------------------------`,
    `# Compute: AWS Lambda (.NET 8/9)`,
    `# ------------------------------------------------------------------------------`,
    `lambda_enabled                  = ${analysis.cheapestPlatform === 'lambda'}`,
    `lambda_architecture             = "${config.lambdaArch}"`,
    `lambda_memory_mb                = ${config.memoryMb}`,
    `lambda_provisioned_concurrency  = ${config.lambdaProvisionedConcurrency}`,
    ``,
    `# ------------------------------------------------------------------------------`,
    `# Compute: Amazon EKS (Kubernetes)`,
    `# ------------------------------------------------------------------------------`,
    `eks_enabled                     = ${analysis.cheapestPlatform === 'eks'}`,
    `eks_cluster_version             = "1.31"`,
    `eks_control_plane_monthly_usd   = ${config.eksControlPlaneEnabled ? 73 : 0}`,
    `eks_node_instance_type          = "${nodeSpec.instanceType}"`,
    `eks_node_capacity_type          = "${nodeSpec.capacityType}"`,
    `eks_node_min_size               = 2`,
    `eks_node_desired_size           = ${Math.max(2, Math.round(analysis.telemetry.eksAvgNodes))}`,
    `eks_node_max_size               = ${Math.max(2, analysis.telemetry.eksPeakNodes)}`,
    `eks_pod_cpu_millicores          = ${Math.round(config.vcpuPerPod * 1000)}`,
    `eks_pod_memory_mb               = ${config.memoryMb}`,
    ``,
    `# ------------------------------------------------------------------------------`,
    `# Compute: Amazon ECS / Fargate (Optional)`,
    `# ------------------------------------------------------------------------------`,
    `ecs_fargate_enabled             = ${config.includeEcsFargate && analysis.cheapestPlatform === 'fargate'}`,
    `ecs_fargate_cpu                 = ${Math.round(config.vcpuPerPod * 1024)}`,
    `ecs_fargate_memory_mb           = ${config.memoryMb}`,
    `ecs_fargate_spot_weight         = ${config.fargateSpotPercent}`,
    ``,
    `# ------------------------------------------------------------------------------`,
    `# Data Layer: Amazon RDS`,
    `# ------------------------------------------------------------------------------`,
    `rds_engine                      = "${config.rdsEngine === 'postgres' ? 'postgres' : 'sqlserver-se'}"`,
    `rds_instance_class              = "${cleanRdsInstanceClass}"`,
    `rds_multi_az                    = ${config.rdsMultiAz}`,
    `rds_read_replica_count          = ${config.rdsReadReplicas}`,
    `rds_allocated_storage_gb        = ${config.rdsStorageGb}`,
    ``,
    `# ------------------------------------------------------------------------------`,
    `# Messaging & Networking`,
    `# ------------------------------------------------------------------------------`,
    `sqs_fifo_queue                  = ${config.sqsQueueType === 'fifo'}`,
    `sqs_estimated_monthly_msgs_m    = ${config.sqsMillionMsgs}`,
    `alb_enabled                     = true`,
    `nat_gateway_az_count            = ${config.natGatewayAzCount}`,
    `estimated_monthly_egress_gb     = ${config.natEgressGb}`,
    ``,
    `common_tags = {`,
    `  Workload   = "${projectSlug}"`,
    `  Runtime    = "dotnet-8-9"`,
    `  ManagedBy  = "terraform"`,
    `  EstMonthly = "${Math.round(analysis[analysis.cheapestPlatform].total)}USD"`,
    `}`,
  ];

  return lines.join('\n');
}

export function generateMarkdownAdr(config: EstimatorConfig, analysis: CostAnalysis): string {
  const preset = WORKLOAD_PRESETS.find((p) => p.id === config.presetId);
  const nodeSpec = EKS_NODE_STRATEGIES[config.eksNodeStrategy];
  const rdsSpec = RDS_INSTANCE_CATALOG[config.rdsEngine][config.rdsTier];
  const recommended =
    analysis.cheapestPlatform === 'lambda'
      ? 'AWS Lambda (.NET Native AOT / Serverless)'
      : analysis.cheapestPlatform === 'eks'
        ? `Amazon EKS (${nodeSpec.label})`
        : 'Amazon ECS on AWS Fargate';

  const breakEvenText =
    analysis.breakEvenEksRps !== null
      ? `**${analysis.breakEvenEksRps} RPS** (above this sustained baseline, EKS becomes more cost-effective than Lambda)`
      : `**>1,200 RPS** (Lambda remains cheaper across the evaluated 1–1,200 RPS sweep)`;

  const deltaMonthly = Math.abs(analysis.lambdaVsEksDelta);
  const cheaperComparison =
    analysis.lambdaVsEksDelta > 0
      ? `EKS saves **${formatCurrency(deltaMonthly)}/mo** (${formatCurrency(deltaMonthly * 12)}/yr) compared to Lambda at ${config.rps} baseline RPS.`
      : `Lambda saves **${formatCurrency(deltaMonthly)}/mo** (${formatCurrency(deltaMonthly * 12)}/yr) compared to EKS at ${config.rps} baseline RPS.`;

  return `# ADR-001: AWS Compute & Persistence Architecture for ${preset ? preset.name : 'Custom .NET 8/9 Workload'}

- **Status**: Proposed
- **Date**: ${new Date().toISOString().slice(0, 10)}
- **Region**: \`${config.region}\`
- **Target Runtime**: ${config.dotnetMode === 'native-aot' ? '.NET 8/9 Native AOT' : '.NET 8/9 ASP.NET Core Kestrel (JIT)'}

## 1. Context & Workload Profile

We are sizing AWS infrastructure for a .NET 8/9 service with the following production traffic and resource envelope:

| Metric | Modeled Value |
| :--- | :--- |
| Baseline / Peak Traffic | ${config.rps} RPS baseline · ${formatNumber(analysis.telemetry.peakRps, 0)} RPS peak (${config.burstMultiplier}x for ${config.burstHoursPerDay}h/day) |
| Monthly Invocations | ${formatNumber(analysis.telemetry.monthlyRequestsMillions, 1)}M requests / month |
| Latency & Footprint | ${config.p95DurationMs} ms p95 · ${config.memoryMb} MB RAM · ${config.vcpuPerPod} vCPU per unit |
| Persistence (RDS) | ${config.rdsEngine === 'postgres' ? 'PostgreSQL 16' : 'SQL Server Standard'} · \`${rdsSpec.instanceClass}\` · ${config.rdsMultiAz ? 'Multi-AZ' : 'Single-AZ'} · ${config.rdsReadReplicas} Read Replica(s) · ${config.rdsStorageGb} GB GP3 |
| Messaging & Network | ${config.sqsMillionMsgs}M SQS msgs/mo (${config.sqsQueueType.toUpperCase()}) · ${config.natEgressGb} GB egress (${config.natGatewayAzCount} NAT GW AZs) |

## 2. Decision

Adopt **${recommended}** as the primary compute platform for this workload.

- **Monthly Cost Comparison**:
  - **AWS Lambda**: ${formatCurrency(analysis.lambda.total)}/mo (Compute: ${formatCurrency(analysis.lambda.compute)})
  - **Amazon EKS**: ${formatCurrency(analysis.eks.total)}/mo (Compute: ${formatCurrency(analysis.eks.compute)}, Control Plane: ${formatCurrency(analysis.eks.controlPlane)})${
    config.includeEcsFargate
      ? `\n  - **Amazon ECS / Fargate**: ${formatCurrency(analysis.fargate.total)}/mo (Compute: ${formatCurrency(analysis.fargate.compute)})`
      : ''
  }
- **Cost Delta**: ${cheaperComparison}
- **Break-Even Threshold**: ${breakEvenText}

## 3. Architectural Rationale

1. **Compute Economics**: ${
    analysis.cheapestPlatform === 'lambda'
      ? `With a ${config.burstMultiplier}x burst profile over ${config.burstHoursPerDay}h/day and ${config.rps} baseline RPS, per-millisecond billing avoids paying for idle cluster capacity.`
      : `At ${config.rps} baseline RPS and ${config.memoryMb} MB memory allocation, sustained container execution on ${nodeSpec.label} amortizes the ${
          config.eksControlPlaneEnabled ? '$73/mo EKS control plane' : 'cluster overhead'
        } and delivers predictable unit economics.`
  }
2. **.NET 8/9 Runtime Fit**: ${
    config.dotnetMode === 'native-aot'
      ? `Native AOT eliminates JIT warm-up overhead, keeping Lambda cold starts under ~60ms and reducing container RSS memory.`
      : `Kestrel JIT maximizes steady-state throughput and supports full EF Core dynamic compilation, SignalR, and gRPC without AOT trimming constraints.`
  }
3. **Database & Egress Hygiene**: RDS (${formatCurrency(analysis.lambda.rdsDatabase)}/mo) and NAT/Egress (${formatCurrency(
    analysis.lambda.natAndEgress
  )}/mo) dominate fixed baseline spend regardless of compute choice. Use VPC Gateway/Interface Endpoints for SQS and ECR to avoid unnecessary NAT Gateway data processing fees ($0.045/GB).

## 4. Consequences & Mitigations

- **Portability**: ${
    analysis.cheapestPlatform === 'eks'
      ? 'Standard Kubernetes manifests and Helm charts preserve multi-cloud (AKS/GKE) and on-premises portability.'
      : analysis.cheapestPlatform === 'lambda'
        ? 'Lambda event bindings introduce AWS-specific coupling; isolate domain logic inside MediatR/Clean Architecture handlers so HTTP/SQS adapters stay thin.'
        : 'ECS task definitions are AWS-native, though standard OCI Docker images keep application code portable to Kubernetes if needed.'
  }
- **Operational Ownership**: ${
    analysis.cheapestPlatform === 'eks'
      ? 'Platform engineering must manage EKS upgrades, Karpenter node pools, and CNI IP exhaustion.'
      : 'Minimal host patching; focus observability on CloudWatch/OpenTelemetry traces and RDS connection pooling (RDS Proxy or Npgsql pooling).'
  }
`;
}
