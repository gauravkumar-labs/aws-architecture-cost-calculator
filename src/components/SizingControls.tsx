import { RotateCcw } from 'lucide-react';
import { AWS_REGIONS, EKS_NODE_STRATEGIES, RDS_INSTANCE_CATALOG } from '../data/presets';
import {
  AwsRegion,
  DotNetRuntimeMode,
  EksNodeStrategy,
  EstimatorConfig,
  LambdaArch,
  RdsEngine,
  RdsTier,
  SqsQueueType,
} from '../types/estimator';

interface SizingControlsProps {
  config: EstimatorConfig;
  onChange: (patch: Partial<EstimatorConfig>) => void;
  onReset: () => void;
}

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  accent?: 'cyan' | 'amber';
  onChange: (val: number) => void;
}

function SliderField({
  id,
  label,
  value,
  min,
  max,
  step,
  unit,
  accent = 'cyan',
  onChange,
}: SliderFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-zinc-300">
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            id={`${id}-num`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) {
                onChange(Math.min(max, Math.max(min, parsed)));
              }
            }}
            aria-label={`${label} numeric input`}
            className="w-16 px-1.5 py-0.5 text-right text-xs font-mono-tabular bg-zinc-950 border border-zinc-800 rounded text-zinc-100 focus:outline-none focus:border-cyan-500"
          />
          <span className="text-xs text-zinc-500 font-mono-tabular w-9">{unit}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full estimator-slider ${accent === 'amber' ? 'amber-slider' : ''}`}
      />
    </div>
  );
}

export function SizingControls({ config, onChange, onReset }: SizingControlsProps) {
  const rdsCatalog = RDS_INSTANCE_CATALOG[config.rdsEngine];

  return (
    <aside
      aria-label="Sizing and infrastructure controls"
      className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6"
    >
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Sizing Parameters</h2>
          <p className="text-xs text-zinc-400">Live monthly cost drivers</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg hover:text-zinc-100 hover:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>

      {/* Environment & Runtime */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
          Region & .NET Runtime
        </h3>

        <div className="space-y-1.5">
          <label htmlFor="aws-region" className="block text-xs font-medium text-zinc-300">
            AWS Region
          </label>
          <select
            id="aws-region"
            value={config.region}
            onChange={(e) => onChange({ region: e.target.value as AwsRegion })}
            className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500"
          >
            {Object.values(AWS_REGIONS).map((reg) => (
              <option key={reg.code} value={reg.code}>
                {reg.code} — {reg.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-300">.NET Compilation Mode</span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            {(
              [
                { id: 'native-aot', label: 'Native AOT' },
                { id: 'kestrel-jit', label: 'Kestrel JIT' },
              ] as Array<{ id: DotNetRuntimeMode; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ dotnetMode: opt.id })}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.dotnetMode === opt.id
                    ? 'bg-zinc-800 text-cyan-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Traffic & Compute Envelope */}
      <div className="space-y-4 pt-4 border-t border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
          Traffic & Compute Profile
        </h3>

        <SliderField
          id="rps-slider"
          label="Baseline Traffic"
          value={config.rps}
          min={1}
          max={600}
          step={1}
          unit="RPS"
          onChange={(val) => onChange({ rps: val })}
        />

        <SliderField
          id="burst-slider"
          label="Peak Burst Multiplier"
          value={config.burstMultiplier}
          min={1}
          max={12}
          step={0.5}
          unit="x"
          onChange={(val) => onChange({ burstMultiplier: val })}
        />

        <SliderField
          id="burst-hours-slider"
          label="Peak Window Duration"
          value={config.burstHoursPerDay}
          min={1}
          max={12}
          step={1}
          unit="hr/d"
          onChange={(val) => onChange({ burstHoursPerDay: val })}
        />

        <SliderField
          id="duration-slider"
          label="p95 Execution Duration"
          value={config.p95DurationMs}
          min={15}
          max={1000}
          step={5}
          unit="ms"
          onChange={(val) => onChange({ p95DurationMs: val })}
        />

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-300">Memory Allocation</span>
          <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            {[256, 512, 1024, 2048].map((mem) => (
              <button
                key={mem}
                type="button"
                onClick={() => onChange({ memoryMb: mem })}
                className={`py-1.5 text-xs font-mono-tabular font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.memoryMb === mem
                    ? 'bg-zinc-800 text-cyan-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mem >= 1024 ? `${mem / 1024}GB` : `${mem}MB`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-300">Container vCPU per Pod / Task</span>
          <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            {[0.25, 0.5, 1.0, 2.0].map((cpu) => (
              <button
                key={cpu}
                type="button"
                onClick={() => onChange({ vcpuPerPod: cpu })}
                className={`py-1.5 text-xs font-mono-tabular font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.vcpuPerPod === cpu
                    ? 'bg-zinc-800 text-amber-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cpu}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Compute Platform Options */}
      <div className="space-y-3.5 pt-4 border-t border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
          Lambda, EKS & Fargate Options
        </h3>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-300">Lambda Architecture</span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            {(
              [
                { id: 'arm64', label: 'Graviton2 (arm64)' },
                { id: 'x86_64', label: 'x86_64' },
              ] as Array<{ id: LambdaArch; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ lambdaArch: opt.id })}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.lambdaArch === opt.id
                    ? 'bg-zinc-800 text-cyan-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <SliderField
          id="pc-slider"
          label="Lambda Provisioned Concurrency"
          value={config.lambdaProvisionedConcurrency}
          min={0}
          max={100}
          step={5}
          unit="warm"
          onChange={(val) => onChange({ lambdaProvisionedConcurrency: val })}
        />

        <div className="space-y-1.5">
          <label htmlFor="eks-node-strategy" className="block text-xs font-medium text-zinc-300">
            EKS Worker Node Strategy
          </label>
          <select
            id="eks-node-strategy"
            value={config.eksNodeStrategy}
            onChange={(e) => onChange({ eksNodeStrategy: e.target.value as EksNodeStrategy })}
            className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
          >
            {(Object.keys(EKS_NODE_STRATEGIES) as EksNodeStrategy[]).map((key) => {
              const strat = EKS_NODE_STRATEGIES[key];
              return (
                <option key={key} value={key}>
                  {strat.label} ({strat.instanceType})
                </option>
              );
            })}
          </select>
        </div>

        <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
          <span className="text-xs font-medium text-zinc-300">
            Include EKS Control Plane ($73/mo)
          </span>
          <input
            type="checkbox"
            checked={config.eksControlPlaneEnabled}
            onChange={(e) => onChange({ eksControlPlaneEnabled: e.target.checked })}
            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
          <span className="text-xs font-medium text-zinc-300">
            Compare ECS / AWS Fargate
          </span>
          <input
            type="checkbox"
            checked={config.includeEcsFargate}
            onChange={(e) => onChange({ includeEcsFargate: e.target.checked })}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
        </label>

        {config.includeEcsFargate && (
          <SliderField
            id="fargate-spot-slider"
            label="Fargate Spot Allocation"
            value={config.fargateSpotPercent}
            min={0}
            max={80}
            step={10}
            unit="%"
            onChange={(val) => onChange({ fargateSpotPercent: val })}
          />
        )}
      </div>

      {/* RDS, SQS & NAT Egress */}
      <div className="space-y-3.5 pt-4 border-t border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
          RDS, SQS & NAT Egress
        </h3>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-300">Amazon RDS Engine</span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            {(
              [
                { id: 'postgres', label: 'PostgreSQL 16' },
                { id: 'sqlserver', label: 'SQL Server Std' },
              ] as Array<{ id: RdsEngine; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ rdsEngine: opt.id })}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.rdsEngine === opt.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="rds-tier" className="block text-xs font-medium text-zinc-300">
            RDS Instance Size
          </label>
          <select
            id="rds-tier"
            value={config.rdsTier}
            onChange={(e) => onChange({ rdsTier: e.target.value as RdsTier })}
            className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-cyan-500"
          >
            {(['small', 'medium', 'large', 'xlarge'] as RdsTier[]).map((tier) => {
              const spec = rdsCatalog[tier];
              return (
                <option key={tier} value={tier}>
                  {spec.instanceClass} ({spec.vcpu} vCPU / {spec.ramGb} GB)
                </option>
              );
            })}
          </select>
        </div>

        <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
          <span className="text-xs font-medium text-zinc-300">
            Multi-AZ Synchronous Standby (2x)
          </span>
          <input
            type="checkbox"
            checked={config.rdsMultiAz}
            onChange={(e) => onChange({ rdsMultiAz: e.target.checked })}
            className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
          />
        </label>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-300">RDS Read Replicas</span>
          <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            {[0, 1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onChange({ rdsReadReplicas: count })}
                className={`py-1.5 text-xs font-mono-tabular font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.rdsReadReplicas === count
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <SliderField
          id="rds-storage-slider"
          label="RDS GP3 Storage"
          value={config.rdsStorageGb}
          min={50}
          max={2000}
          step={50}
          unit="GB"
          onChange={(val) => onChange({ rdsStorageGb: val })}
        />

        <SliderField
          id="sqs-slider"
          label="Amazon SQS Volume"
          value={config.sqsMillionMsgs}
          min={0}
          max={500}
          step={5}
          unit="M/mo"
          onChange={(val) => onChange({ sqsMillionMsgs: val })}
        />

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-300">SQS Queue Semantics</span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            {(
              [
                { id: 'standard', label: 'Standard ($0.40/M)' },
                { id: 'fifo', label: 'FIFO ($0.50/M)' },
              ] as Array<{ id: SqsQueueType; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ sqsQueueType: opt.id })}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.sqsQueueType === opt.id
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <SliderField
          id="egress-slider"
          label="NAT Gateway & Egress"
          value={config.natEgressGb}
          min={0}
          max={5000}
          step={25}
          unit="GB"
          accent="amber"
          onChange={(val) => onChange({ natEgressGb: val })}
        />

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-300">NAT Gateway Availability Zones</span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            {([1, 2] as const).map((az) => (
              <button
                key={az}
                type="button"
                onClick={() => onChange({ natGatewayAzCount: az })}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  config.natGatewayAzCount === az
                    ? 'bg-zinc-800 text-amber-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {az} AZ (${(az * 32.85).toFixed(0)}/mo)
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
