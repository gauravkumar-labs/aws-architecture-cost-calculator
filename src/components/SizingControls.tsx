import { HelpCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
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

const TERM_HINTS: Record<string, string> = {
  dotnetMode:
    'How your .NET code starts up. Native AOT pre-compiles to machine code for near-instant Lambda wakeups; Kestrel JIT optimizes for always-on container speed.',
  rps: 'Requests Per Second — how many API calls or webhooks your app handles each second during normal, steady traffic.',
  burstMultiplier:
    'How many times higher your traffic spikes during rush hours compared to normal traffic (e.g., 14 RPS × 8x = 112 Peak RPS).',
  burstHoursPerDay:
    'How many hours per day your service stays at that peak spike before dropping back to normal baseline traffic.',
  p95DurationMs:
    'How long 95 out of 100 requests take to finish (1,000 ms = 1 second). Using the 95th percentile ignores rare outliers while sizing safely.',
  memoryMb:
    'RAM assigned to each Lambda function or container. On AWS Lambda, raising memory also gives proportionally more CPU power.',
  vcpuPerPod:
    'Virtual CPU cores assigned to each running container on EKS or Fargate (1.0 vCPU = one virtual processor core).',
  lambdaArch:
    'Processor chip type. Graviton2 (ARM64) is ~20% cheaper than x86_64 and works natively with .NET 8/9.',
  lambdaPc:
    'Keeps a set number of Lambda instances pre-warmed 24/7 so users never experience a "cold start" wakeup delay.',
  eksNodeStrategy:
    'Server type for Kubernetes worker nodes. Spot + Graviton3 gives ~65% savings using spare AWS capacity; On-Demand guarantees fixed capacity.',
  eksControlPlane:
    'Flat $73/mo fee AWS charges for managing the Kubernetes "brain" (API server and scheduler) that coordinates your containers.',
  fargate:
    'Serverless containers: AWS runs your Docker containers without you managing EC2 servers or paying the $73/mo EKS control plane fee.',
  fargateSpot:
    'Percentage of Fargate tasks run on spare AWS capacity for up to 70% savings (best for fault-tolerant APIs and queue workers).',
  rdsEngine:
    'Managed relational database. PostgreSQL has no license markup; SQL Server Standard includes Microsoft licensing in the hourly price.',
  rdsTier:
    'CPU and memory size of your database server. Larger tiers handle more concurrent queries and complex joins.',
  rdsMultiAz:
    'Runs a live standby copy of your database in a second data center for automatic failover if one building loses power. Doubles DB cost.',
  rdsReadReplicas:
    'Extra read-only copies of your database that absorb heavy read/reporting queries so your main database stays fast.',
  rdsStorageGb:
    'SSD disk space allocated for database tables, indexes, and transaction logs (Amazon EBS GP3).',
  sqs: 'A waiting line (queue) that buffers background jobs between services. Each message typically triggers 3 API ops (Send, Receive, Delete).',
  sqsType:
    'Standard queues are cheapest ($0.40/M) with best-effort ordering. FIFO ($0.50/M) guarantees strict First-In, First-Out delivery.',
  natEgress:
    'A private router letting servers inside your secure AWS network call external APIs, plus the bandwidth fee for data leaving AWS to the internet.',
  natAz:
    'Running 1 NAT Gateway per Availability Zone avoids cross-AZ failure risks in production ($32.85/mo per AZ before data charges).',
};

interface FieldLabelProps {
  htmlFor?: string;
  label: string;
  hintKey: string;
  isHintOpen: boolean;
  onToggleHint: (key: string) => void;
}

function FieldLabel({ htmlFor, label, hintKey, isHintOpen, onToggleHint }: FieldLabelProps) {
  return (
    <div className="inline-flex items-center gap-1.5 min-w-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-300">
          {label}
        </label>
      ) : (
        <span className="text-xs font-medium text-zinc-300">{label}</span>
      )}
      <button
        type="button"
        onClick={() => onToggleHint(hintKey)}
        aria-expanded={isHintOpen}
        aria-label={`Explain ${label}`}
        title={`What is ${label}?`}
        className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
          isHintOpen ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

interface SliderFieldProps {
  id: string;
  label: string;
  hintKey: string;
  isHintOpen: boolean;
  onToggleHint: (key: string) => void;
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
  hintKey,
  isHintOpen,
  onToggleHint,
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
        <FieldLabel
          htmlFor={id}
          label={label}
          hintKey={hintKey}
          isHintOpen={isHintOpen}
          onToggleHint={onToggleHint}
        />
        <div className="flex items-center gap-1 shrink-0">
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
      {isHintOpen && (
        <p className="text-xs text-zinc-400 leading-relaxed pt-0.5">{TERM_HINTS[hintKey]}</p>
      )}
    </div>
  );
}

export function SizingControls({ config, onChange, onReset }: SizingControlsProps) {
  const rdsCatalog = RDS_INSTANCE_CATALOG[config.rdsEngine];
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({});
  const [showAllHints, setShowAllHints] = useState(false);

  const toggleHint = (key: string) => {
    setOpenHints((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllHints = () => {
    const next = !showAllHints;
    setShowAllHints(next);
    const updated: Record<string, boolean> = {};
    for (const k of Object.keys(TERM_HINTS)) {
      updated[k] = next;
    }
    setOpenHints(updated);
  };

  const isHintVisible = (key: string) => Boolean(openHints[key]);

  return (
    <aside
      aria-label="Sizing and infrastructure controls"
      className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-6"
    >
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Sizing Parameters</h2>
          <p className="text-xs text-zinc-400">Click ? for plain-English info</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleAllHints}
            className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showAllHints
                ? 'text-cyan-300 bg-zinc-950 border-cyan-500/50'
                : 'text-zinc-300 bg-zinc-950 border-zinc-800 hover:text-zinc-100 hover:border-zinc-700'
            }`}
          >
            {showAllHints ? 'Hide hints' : 'Show hints'}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg hover:text-zinc-100 hover:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
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
          <FieldLabel
            label=".NET Compilation Mode"
            hintKey="dotnetMode"
            isHintOpen={isHintVisible('dotnetMode')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('dotnetMode') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.dotnetMode}</p>
          )}
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
          hintKey="rps"
          isHintOpen={isHintVisible('rps')}
          onToggleHint={toggleHint}
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
          hintKey="burstMultiplier"
          isHintOpen={isHintVisible('burstMultiplier')}
          onToggleHint={toggleHint}
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
          hintKey="burstHoursPerDay"
          isHintOpen={isHintVisible('burstHoursPerDay')}
          onToggleHint={toggleHint}
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
          hintKey="p95DurationMs"
          isHintOpen={isHintVisible('p95DurationMs')}
          onToggleHint={toggleHint}
          value={config.p95DurationMs}
          min={15}
          max={1000}
          step={5}
          unit="ms"
          onChange={(val) => onChange({ p95DurationMs: val })}
        />

        <div className="space-y-1.5">
          <FieldLabel
            label="Memory Allocation"
            hintKey="memoryMb"
            isHintOpen={isHintVisible('memoryMb')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('memoryMb') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.memoryMb}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <FieldLabel
            label="Container vCPU per Pod / Task"
            hintKey="vcpuPerPod"
            isHintOpen={isHintVisible('vcpuPerPod')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('vcpuPerPod') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.vcpuPerPod}</p>
          )}
        </div>
      </div>

      {/* Compute Platform Options */}
      <div className="space-y-3.5 pt-4 border-t border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide">
          Lambda, EKS & Fargate Options
        </h3>

        <div className="space-y-1.5">
          <FieldLabel
            label="Lambda Architecture"
            hintKey="lambdaArch"
            isHintOpen={isHintVisible('lambdaArch')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('lambdaArch') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.lambdaArch}</p>
          )}
        </div>

        <SliderField
          id="pc-slider"
          label="Lambda Provisioned Concurrency"
          hintKey="lambdaPc"
          isHintOpen={isHintVisible('lambdaPc')}
          onToggleHint={toggleHint}
          value={config.lambdaProvisionedConcurrency}
          min={0}
          max={100}
          step={5}
          unit="warm"
          onChange={(val) => onChange({ lambdaProvisionedConcurrency: val })}
        />

        <div className="space-y-1.5">
          <FieldLabel
            htmlFor="eks-node-strategy"
            label="EKS Worker Node Strategy"
            hintKey="eksNodeStrategy"
            isHintOpen={isHintVisible('eksNodeStrategy')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('eksNodeStrategy') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.eksNodeStrategy}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 py-1">
            <FieldLabel
              htmlFor="eks-cp-toggle"
              label="Include EKS Control Plane ($73/mo)"
              hintKey="eksControlPlane"
              isHintOpen={isHintVisible('eksControlPlane')}
              onToggleHint={toggleHint}
            />
            <input
              id="eks-cp-toggle"
              type="checkbox"
              checked={config.eksControlPlaneEnabled}
              onChange={(e) => onChange({ eksControlPlaneEnabled: e.target.checked })}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer shrink-0"
            />
          </div>
          {isHintVisible('eksControlPlane') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.eksControlPlane}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 py-1">
            <FieldLabel
              htmlFor="fargate-toggle"
              label="Compare ECS / AWS Fargate"
              hintKey="fargate"
              isHintOpen={isHintVisible('fargate')}
              onToggleHint={toggleHint}
            />
            <input
              id="fargate-toggle"
              type="checkbox"
              checked={config.includeEcsFargate}
              onChange={(e) => onChange({ includeEcsFargate: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
            />
          </div>
          {isHintVisible('fargate') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.fargate}</p>
          )}
        </div>

        {config.includeEcsFargate && (
          <SliderField
            id="fargate-spot-slider"
            label="Fargate Spot Allocation"
            hintKey="fargateSpot"
            isHintOpen={isHintVisible('fargateSpot')}
            onToggleHint={toggleHint}
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
          <FieldLabel
            label="Amazon RDS Engine"
            hintKey="rdsEngine"
            isHintOpen={isHintVisible('rdsEngine')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('rdsEngine') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.rdsEngine}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <FieldLabel
            htmlFor="rds-tier"
            label="RDS Instance Size"
            hintKey="rdsTier"
            isHintOpen={isHintVisible('rdsTier')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('rdsTier') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.rdsTier}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3 py-1">
            <FieldLabel
              htmlFor="rds-multiaz-toggle"
              label="Multi-AZ Synchronous Standby (2x)"
              hintKey="rdsMultiAz"
              isHintOpen={isHintVisible('rdsMultiAz')}
              onToggleHint={toggleHint}
            />
            <input
              id="rds-multiaz-toggle"
              type="checkbox"
              checked={config.rdsMultiAz}
              onChange={(e) => onChange({ rdsMultiAz: e.target.checked })}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer shrink-0"
            />
          </div>
          {isHintVisible('rdsMultiAz') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.rdsMultiAz}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <FieldLabel
            label="RDS Read Replicas"
            hintKey="rdsReadReplicas"
            isHintOpen={isHintVisible('rdsReadReplicas')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('rdsReadReplicas') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.rdsReadReplicas}</p>
          )}
        </div>

        <SliderField
          id="rds-storage-slider"
          label="RDS GP3 Storage"
          hintKey="rdsStorageGb"
          isHintOpen={isHintVisible('rdsStorageGb')}
          onToggleHint={toggleHint}
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
          hintKey="sqs"
          isHintOpen={isHintVisible('sqs')}
          onToggleHint={toggleHint}
          value={config.sqsMillionMsgs}
          min={0}
          max={500}
          step={5}
          unit="M/mo"
          onChange={(val) => onChange({ sqsMillionMsgs: val })}
        />

        <div className="space-y-1.5">
          <FieldLabel
            label="SQS Queue Semantics"
            hintKey="sqsType"
            isHintOpen={isHintVisible('sqsType')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('sqsType') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.sqsType}</p>
          )}
        </div>

        <SliderField
          id="egress-slider"
          label="NAT Gateway & Egress"
          hintKey="natEgress"
          isHintOpen={isHintVisible('natEgress')}
          onToggleHint={toggleHint}
          value={config.natEgressGb}
          min={0}
          max={5000}
          step={25}
          unit="GB"
          accent="amber"
          onChange={(val) => onChange({ natEgressGb: val })}
        />

        <div className="space-y-1.5">
          <FieldLabel
            label="NAT Gateway Availability Zones"
            hintKey="natAz"
            isHintOpen={isHintVisible('natAz')}
            onToggleHint={toggleHint}
          />
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
          {isHintVisible('natAz') && (
            <p className="text-xs text-zinc-400 leading-relaxed">{TERM_HINTS.natAz}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
