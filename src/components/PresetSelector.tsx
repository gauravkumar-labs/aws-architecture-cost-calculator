import { WORKLOAD_PRESETS } from '../data/presets';
import { PresetId, WorkloadPreset } from '../types/estimator';

interface PresetSelectorProps {
  activePresetId: PresetId;
  onSelectPreset: (preset: WorkloadPreset) => void;
}

export function PresetSelector({ activePresetId, onSelectPreset }: PresetSelectorProps) {
  return (
    <section id="presets" aria-labelledby="presets-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="presets-heading" className="text-base font-semibold text-zinc-100 tracking-tight">
            .NET 8/9 Workload Presets
          </h2>
          <p className="text-sm text-zinc-400">
            Load production traffic, latency, queue, and database baselines or adjust controls manually.
          </p>
        </div>
        {activePresetId === 'custom' && (
          <span className="text-xs font-medium text-amber-400 font-mono-tabular">
            Modified custom profile
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {WORKLOAD_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-4 rounded-xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isActive
                  ? 'bg-zinc-900 border-cyan-500/60'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium text-cyan-400 truncate">
                  {preset.dotnetTarget}
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
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                {preset.summary}
              </p>
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
