import { WORKLOAD_PRESETS } from '../data/presets';
import { PresetId, WorkloadPreset } from '../types/estimator';

interface PresetSelectorProps {
  activePresetId: PresetId;
  onSelectPreset: (preset: WorkloadPreset) => void;
}

const ARCHITECTURE_GUIDE = [
  {
    title: 'AWS Lambda (Serverless)',
    accentClass: 'text-cyan-400',
    analogy: 'Pay-per-request utility',
    description:
      'Runs your code only when an API call or queue message arrives, then shuts down. Zero server patching and lowest cost for spiky or low-volume traffic, though tied to AWS.',
  },
  {
    title: 'Amazon EKS (Managed Kubernetes)',
    accentClass: 'text-amber-400',
    analogy: 'Dedicated 24/7 container fleet',
    description:
      'Runs always-on containers across managed servers ($73/mo control plane + nodes). Cheapest at high, steady traffic and portable to Azure, Google Cloud, or on-prem, with higher ops effort.',
  },
  {
    title: 'ECS / AWS Fargate (Serverless Containers)',
    accentClass: 'text-emerald-400',
    analogy: 'Middle-ground containers without servers',
    description:
      'Runs standard Docker containers without managing EC2 nodes or paying the $73/mo Kubernetes fee. Great for steady workloads when your team wants container isolation with minimal ops.',
  },
];

export function PresetSelector({ activePresetId, onSelectPreset }: PresetSelectorProps) {
  return (
    <section id="presets" aria-labelledby="presets-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="presets-heading" className="text-base font-semibold text-zinc-100 tracking-tight">
            .NET 8/9 Workload Presets & Architecture Guide
          </h2>
          <p className="text-sm text-zinc-400">
            Choose a real-world scenario below to see which AWS architecture fits best and why.
          </p>
        </div>
        {activePresetId === 'custom' && (
          <span className="text-xs font-medium text-amber-400 font-mono-tabular">
            Modified custom profile
          </span>
        )}
      </div>

      {/* Plain-English Architecture Primer for Product & Non-Technical Stakeholders */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/50 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-200">
            How the 3 Suggested Architectures Differ (In Plain English)
          </span>
          <span className="text-xs text-zinc-500">
            All three share the same database (RDS), queue (SQS), and load balancer (ALB)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800/80">
          {ARCHITECTURE_GUIDE.map((arch) => (
            <div key={arch.title} className="p-4 space-y-1">
              <div className={`text-xs font-semibold ${arch.accentClass}`}>{arch.title}</div>
              <div className="text-xs font-medium text-zinc-200">{arch.analogy}</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{arch.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Preset Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {WORKLOAD_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isActive
                  ? 'bg-zinc-900 border-cyan-500/60'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-cyan-400 truncate">
                    {preset.recommendedArchLabel}
                  </span>
                  {isActive && (
                    <span className="text-xs font-medium text-zinc-200 whitespace-nowrap shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 leading-snug mb-1.5">
                  {preset.name}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed mb-2">
                  {preset.productExplanation}
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                  <span className="text-zinc-300 font-medium">Best for:</span> {preset.bestFor}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400 font-mono-tabular pt-2.5 border-t border-zinc-800/80">
                <span>{preset.config.rps} RPS</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span>{preset.config.burstMultiplier}x burst</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span>{preset.config.p95DurationMs}ms p95</span>
                <span aria-hidden="true" className="text-zinc-600">·</span>
                <span>{preset.config.rdsEngine === 'postgres' ? 'PostgreSQL' : 'SQL Server'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
