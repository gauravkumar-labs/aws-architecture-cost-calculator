import { formatCurrency, formatNumber } from '../lib/pricing';
import { CostAnalysis, EstimatorConfig } from '../types/estimator';

interface CostComparisonPanelProps {
  config: EstimatorConfig;
  analysis: CostAnalysis;
}

export function CostComparisonPanel({ config, analysis }: CostComparisonPanelProps) {
  const { lambda, eks, fargate, telemetry, cheapestPlatform, breakEvenEksRps, lambdaVsEksDelta } =
    analysis;

  const showFargate = config.includeEcsFargate;

  const rows: Array<{
    label: string;
    detail: string;
    lambdaVal: number;
    eksVal: number;
    fargateVal: number;
  }> = [
    {
      label: 'Compute Execution',
      detail: `${formatNumber(telemetry.monthlyRequestsMillions, 1)}M reqs/mo · ${
        config.lambdaArch === 'arm64' ? 'Graviton' : 'x86'
      } vs ${telemetry.eksAvgNodes.toFixed(1)} avg nodes`,
      lambdaVal: lambda.compute,
      eksVal: eks.compute,
      fargateVal: fargate.compute,
    },
    {
      label: 'Cluster Control Plane',
      detail: config.eksControlPlaneEnabled
        ? 'EKS managed control plane ($0.10/hr)'
        : 'EKS control plane excluded',
      lambdaVal: lambda.controlPlane,
      eksVal: eks.controlPlane,
      fargateVal: fargate.controlPlane,
    },
    {
      label: 'Application Load Balancer',
      detail: 'ALB base ($16.20/mo) + LCU throughput',
      lambdaVal: lambda.loadBalancer,
      eksVal: eks.loadBalancer,
      fargateVal: fargate.loadBalancer,
    },
    {
      label: 'Amazon RDS Database',
      detail: `${telemetry.rdsInstanceLabel} · ${config.rdsMultiAz ? 'Multi-AZ' : 'Single-AZ'}${
        config.rdsReadReplicas > 0 ? ` + ${config.rdsReadReplicas} replica(s)` : ''
      } · ${config.rdsStorageGb} GB`,
      lambdaVal: lambda.rdsDatabase,
      eksVal: eks.rdsDatabase,
      fargateVal: fargate.rdsDatabase,
    },
    {
      label: 'Amazon SQS Messaging',
      detail: `${config.sqsMillionMsgs}M msgs/mo (${config.sqsQueueType.toUpperCase()}, 3 API ops/msg)`,
      lambdaVal: lambda.sqsMessaging,
      eksVal: eks.sqsMessaging,
      fargateVal: fargate.sqsMessaging,
    },
    {
      label: 'NAT Gateway & Data Egress',
      detail: `${config.natGatewayAzCount} AZ NAT GW + ${config.natEgressGb} GB transfer`,
      lambdaVal: lambda.natAndEgress,
      eksVal: eks.natAndEgress,
      fargateVal: fargate.natAndEgress,
    },
  ];

  const computeBarShares = (breakdown: typeof lambda) => {
    const total = Math.max(1, breakdown.total);
    return {
      computePct: ((breakdown.compute + breakdown.controlPlane) / total) * 100,
      dataPct: ((breakdown.rdsDatabase + breakdown.sqsMessaging) / total) * 100,
      networkPct: ((breakdown.loadBalancer + breakdown.natAndEgress) / total) * 100,
    };
  };

  const lambdaShares = computeBarShares(lambda);
  const eksShares = computeBarShares(eks);
  const fargateShares = computeBarShares(fargate);

  return (
    <section id="cost-breakdown" aria-labelledby="cost-heading" className="space-y-6">
      {/* Top 4-column KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            cheapestPlatform === 'lambda'
              ? 'bg-zinc-900 border-cyan-500/60'
              : 'bg-zinc-900/60 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-cyan-400">AWS Lambda</span>
            {cheapestPlatform === 'lambda' && (
              <span className="text-xs font-medium text-cyan-300">Lowest Cost</span>
            )}
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono-tabular">
            {formatCurrency(lambda.total)}
            <span className="text-xs font-normal text-zinc-400">/mo</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono-tabular mt-1">
            Compute {formatCurrency(lambda.compute)} · Peak {formatNumber(telemetry.peakConcurrency, 0)}{' '}
            conc.
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            cheapestPlatform === 'eks'
              ? 'bg-zinc-900 border-amber-500/60'
              : 'bg-zinc-900/60 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-medium text-amber-400">Amazon EKS</span>
            {cheapestPlatform === 'eks' && (
              <span className="text-xs font-medium text-amber-300">Lowest Cost</span>
            )}
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono-tabular">
            {formatCurrency(eks.total)}
            <span className="text-xs font-normal text-zinc-400">/mo</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono-tabular mt-1">
            {telemetry.eksAvgNodes.toFixed(1)} avg / {telemetry.eksPeakNodes} peak nodes
          </p>
        </div>

        {showFargate ? (
          <div
            className={`p-4 rounded-xl border ${
              cheapestPlatform === 'fargate'
                ? 'bg-zinc-900 border-emerald-500/60'
                : 'bg-zinc-900/60 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-emerald-400">ECS / Fargate</span>
              {cheapestPlatform === 'fargate' && (
                <span className="text-xs font-medium text-emerald-300">Lowest Cost</span>
              )}
            </div>
            <div className="text-2xl font-bold text-zinc-100 font-mono-tabular">
              {formatCurrency(fargate.total)}
              <span className="text-xs font-normal text-zinc-400">/mo</span>
            </div>
            <p className="text-xs text-zinc-400 font-mono-tabular mt-1">
              {telemetry.fargateAvgTasks.toFixed(1)} avg / {telemetry.fargatePeakTasks} peak tasks
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl border bg-zinc-900/60 border-zinc-800">
            <div className="text-xs font-medium text-zinc-400 mb-1">Lambda vs EKS Delta</div>
            <div className="text-2xl font-bold text-zinc-100 font-mono-tabular">
              {lambdaVsEksDelta >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(lambdaVsEksDelta))}
              <span className="text-xs font-normal text-zinc-400">/mo</span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {lambdaVsEksDelta >= 0 ? 'EKS saves vs Lambda' : 'Lambda saves vs EKS'}
            </p>
          </div>
        )}

        <div className="p-4 rounded-xl border bg-zinc-900/60 border-zinc-800">
          <div className="text-xs font-medium text-zinc-400 mb-1">EKS Break-Even Point</div>
          <div className="text-2xl font-bold text-zinc-100 font-mono-tabular">
            {breakEvenEksRps !== null ? `${breakEvenEksRps} RPS` : '>1,200 RPS'}
          </div>
          <p className="text-xs text-zinc-400 font-mono-tabular mt-1">
            Current: {config.rps} RPS · Peak {formatNumber(telemetry.peakRps, 0)} RPS
          </p>
        </div>
      </div>

      {/* Side-by-Side Cost Breakdown Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="cost-heading" className="text-base font-semibold text-zinc-100">
              Side-by-Side Monthly Cost Breakdown
            </h2>
            <p className="text-xs text-zinc-400">
              Itemized monthly run-rate across compute, control plane, load balancing, RDS, SQS, and NAT egress.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono-tabular">
            730 hrs/mo · {config.region}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-medium text-zinc-400 bg-zinc-950/50">
                <th className="py-3 px-5">Service Component</th>
                <th className="py-3 px-4 text-right text-cyan-400 whitespace-nowrap">
                  AWS Lambda
                </th>
                <th className="py-3 px-4 text-right text-amber-400 whitespace-nowrap">
                  Amazon EKS
                </th>
                {showFargate && (
                  <th className="py-3 px-5 text-right text-emerald-400 whitespace-nowrap">
                    ECS / Fargate
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 text-sm">
              {rows.map((row) => (
                <tr key={row.label} className="hover:bg-zinc-800/25 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-medium text-zinc-200 text-xs sm:text-sm">
                      {row.label}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{row.detail}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-zinc-200 whitespace-nowrap">
                    {formatCurrency(row.lambdaVal, 2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-zinc-200 whitespace-nowrap">
                    {formatCurrency(row.eksVal, 2)}
                  </td>
                  {showFargate && (
                    <td className="py-3 px-5 text-right font-mono-tabular text-zinc-200 whitespace-nowrap">
                      {formatCurrency(row.fargateVal, 2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 bg-zinc-950/70">
                <td className="py-3.5 px-5 font-semibold text-zinc-100">
                  Total Monthly Estimated Cost
                  <div className="text-xs font-normal text-zinc-400">
                    Annualized 12-month run-rate shown below
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="text-base font-bold text-cyan-400 font-mono-tabular">
                    {formatCurrency(lambda.total)}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono-tabular">
                    {formatCurrency(lambda.total * 12)}/yr
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="text-base font-bold text-amber-400 font-mono-tabular">
                    {formatCurrency(eks.total)}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono-tabular">
                    {formatCurrency(eks.total * 12)}/yr
                  </div>
                </td>
                {showFargate && (
                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                    <div className="text-base font-bold text-emerald-400 font-mono-tabular">
                      {formatCurrency(fargate.total)}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono-tabular">
                      {formatCurrency(fargate.total * 12)}/yr
                    </div>
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Stacked Cost Composition Bars */}
        <div className="px-5 py-4 border-t border-zinc-800 space-y-3 bg-zinc-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">Monthly Spend Composition</span>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 inline-block" />
                Compute & Control Plane
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                RDS & SQS
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-500 inline-block" />
                ALB & NAT Egress
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { name: 'Lambda', shares: lambdaShares, total: lambda.total },
              { name: 'EKS', shares: eksShares, total: eks.total },
              ...(showFargate
                ? [{ name: 'Fargate', shares: fargateShares, total: fargate.total }]
                : []),
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-16 text-xs font-medium text-zinc-300 shrink-0">
                  {item.name}
                </span>
                <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${item.shares.computePct}%` }}
                    className="bg-cyan-500 h-full"
                    title={`Compute & Control Plane: ${item.shares.computePct.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${item.shares.dataPct}%` }}
                    className="bg-amber-500 h-full"
                    title={`RDS & SQS: ${item.shares.dataPct.toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${item.shares.networkPct}%` }}
                    className="bg-zinc-500 h-full"
                    title={`ALB & NAT Egress: ${item.shares.networkPct.toFixed(1)}%`}
                  />
                </div>
                <span className="w-16 text-right text-xs font-mono-tabular text-zinc-400 shrink-0">
                  {item.shares.computePct.toFixed(0)}% comp
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
