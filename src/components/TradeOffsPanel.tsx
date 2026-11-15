import { EstimatorConfig } from '../types/estimator';

interface TradeOffsPanelProps {
  config: EstimatorConfig;
}

export function TradeOffsPanel({ config }: TradeOffsPanelProps) {
  const showFargate = config.includeEcsFargate;

  const dimensions = [
    {
      topic: 'Multi-Cloud & On-Prem Portability',
      lambda: 'Low — AWS-specific Lambda event handlers, SAM/CDK bindings, and API Gateway/ALB payload contracts.',
      eks: 'High — Standard OCI containers, Helm charts, and K8s manifests run identically on AKS, GKE, or bare-metal OpenShift.',
      fargate: 'Medium — Standard Docker images are portable, though ECS task definitions and service discovery are AWS-native.',
    },
    {
      topic: 'Operational & Patching Burden',
      lambda: 'Zero-Ops — AWS manages OS patching, runtime security, AZ failover, and millisecond microVM scaling.',
      eks: 'High Ops — Platform team owns cluster upgrades, Karpenter/Cluster Autoscaler, CNI IP exhaustion, and Ingress add-ons.',
      fargate: 'Low-Medium Ops — AWS manages underlying VM host patching; team manages ECS task definitions and Blue/Green deploys.',
    },
    {
      topic: '.NET 8/9 Cold Starts & Execution Model',
      lambda:
        config.dotnetMode === 'native-aot'
          ? 'Native AOT keeps cold starts ~45–80ms, though reflection-heavy libraries (WCF, legacy EF6) require trimming.'
          : 'Kestrel JIT incurs 450ms–1.2s cold starts unless Provisioned Concurrency is funded.',
      eks: 'Zero cold starts for steady traffic; full .NET 9 JIT dynamic PGO, SignalR WebSockets, gRPC streaming, and BackgroundServices.',
      fargate: 'Zero request cold starts; 20–40s task scale-out warmup, supports long-running workers and full .NET JIT.',
    },
    {
      topic: 'RDS Connection Pooling & Data Tier',
      lambda:
        config.rdsEngine === 'sqlserver'
          ? 'High concurrency bursts exhaust SQL Server connection limits; requires strict pool caps or external pooling.'
          : 'Requires RDS Proxy ($0.015/vCPU-hr) or PgBouncer under spiky Lambda concurrency to protect PostgreSQL.',
      eks: 'Kestrel pods maintain persistent Npgsql / SqlClient connection pools across a bounded replica count.',
      fargate: 'Bounded task counts keep Npgsql / SqlClient connection pools predictable without extra proxy infrastructure.',
    },
    {
      topic: 'FinOps Predictability & Cost Ceiling',
      lambda: 'Pay-per-ms avoids idle waste during off-peak hours, but DDoS or runaway loops can spike bills.',
      eks: 'Flat, predictable ceiling with Savings Plans or Spot + Graviton; $73/mo control plane amortizes across services.',
      fargate: 'No $73/mo control plane fee; linear per-task billing with optional Fargate Spot (up to 70% discount).',
    },
  ];

  return (
    <section
      id="trade-offs"
      aria-labelledby="tradeoffs-heading"
      className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 id="tradeoffs-heading" className="text-base font-semibold text-zinc-100">
          Operational & Portability Trade-Offs (.NET 8/9)
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Architectural constraints beyond raw compute dollars: Kubernetes portability, zero-ops velocity, and database pooling.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-medium text-zinc-400">
              <th className="py-3 px-5 w-48">Dimension</th>
              <th className="py-3 px-4 text-cyan-400">AWS Lambda</th>
              <th className="py-3 px-4 text-amber-400">Amazon EKS</th>
              {showFargate && <th className="py-3 px-5 text-emerald-400">ECS / Fargate</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70 text-xs leading-relaxed">
            {dimensions.map((row) => (
              <tr key={row.topic} className="align-top hover:bg-zinc-800/20 transition-colors">
                <td className="py-3.5 px-5 font-semibold text-zinc-200">{row.topic}</td>
                <td className="py-3.5 px-4 text-zinc-300">{row.lambda}</td>
                <td className="py-3.5 px-4 text-zinc-300">{row.eks}</td>
                {showFargate && <td className="py-3.5 px-5 text-zinc-300">{row.fargate}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
