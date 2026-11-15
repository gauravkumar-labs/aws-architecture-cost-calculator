/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { BreakEvenChart } from './components/BreakEvenChart';
import { CostComparisonPanel } from './components/CostComparisonPanel';
import { ExportArtifactsPanel } from './components/ExportArtifactsPanel';
import { PresetSelector } from './components/PresetSelector';
import { SizingControls } from './components/SizingControls';
import { TradeOffsPanel } from './components/TradeOffsPanel';
import { WORKLOAD_PRESETS } from './data/presets';
import { analyzeArchitectureCosts } from './lib/pricing';
import { EstimatorConfig, WorkloadPreset } from './types/estimator';

const INITIAL_PRESET = WORKLOAD_PRESETS[0];

const DEFAULT_CONFIG: EstimatorConfig = {
  presetId: INITIAL_PRESET.id,
  ...INITIAL_PRESET.config,
};

export default function App() {
  const [config, setConfig] = useState<EstimatorConfig>(DEFAULT_CONFIG);

  const analysis = useMemo(() => analyzeArchitectureCosts(config), [config]);

  const handleSelectPreset = (preset: WorkloadPreset) => {
    setConfig({
      presetId: preset.id,
      ...preset.config,
    });
  };

  const handlePatchConfig = (patch: Partial<EstimatorConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...patch,
      presetId: 'custom',
    }));
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const scrollToExports = () => {
    const el = document.getElementById('exports');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/90 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-base sm:text-lg font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0"
          >
            AWS Cost & Architecture Estimator
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-400"
          >
            <a
              href="#presets"
              className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0"
            >
              Presets
            </a>
            <a
              href="#cost-breakdown"
              className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0"
            >
              Cost Breakdown
            </a>
            <a
              href="#break-even"
              className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0"
            >
              Break-Even
            </a>
            <a
              href="#trade-offs"
              className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0"
            >
              Trade-Offs
            </a>
            <a
              href="#exports"
              className="hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0"
            >
              Exports
            </a>
          </nav>

          <button
            type="button"
            onClick={scrollToExports}
            className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Export Artifacts
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Compact Editorial Intro */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 [text-wrap:balance]">
              .NET 8/9 Cloud Cost & Architecture Modeling
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Compare serverless AWS Lambda against containerized Amazon EKS and optional ECS Fargate
              alongside Amazon RDS, SQS, ALB, and NAT Gateway egress. Tune traffic bursts, find the
              exact RPS break-even point, and export ready-to-apply Terraform and ADR baselines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 font-mono-tabular shrink-0">
            <span>{config.region}</span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span>{config.dotnetMode === 'native-aot' ? '.NET Native AOT' : '.NET Kestrel JIT'}</span>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <span>730 hrs/mo</span>
          </div>
        </section>

        {/* Workload Presets */}
        <PresetSelector activePresetId={config.presetId} onSelectPreset={handleSelectPreset} />

        {/* Two-Column Modeling Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] gap-6 items-start">
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            <SizingControls
              config={config}
              onChange={handlePatchConfig}
              onReset={handleReset}
            />
          </div>

          <div className="space-y-8 min-w-0">
            <CostComparisonPanel config={config} analysis={analysis} />
            <BreakEvenChart config={config} analysis={analysis} />
            <TradeOffsPanel config={config} />
            <ExportArtifactsPanel config={config} analysis={analysis} />
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-zinc-800/80 py-6 mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-zinc-500">
          <span>
            AWS Cost & Architecture Estimator · Modeled using AWS public on-demand/spot unit rates (730 hrs/mo).
          </span>
          <span>Verify final enterprise discounts and Savings Plans in AWS Pricing Calculator.</span>
        </div>
      </footer>
    </div>
  );
}
