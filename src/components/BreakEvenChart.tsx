import { useMemo, useState } from 'react';
import { buildBreakEvenSeries, formatCurrency } from '../lib/pricing';
import { CostAnalysis, EstimatorConfig } from '../types/estimator';

interface BreakEvenChartProps {
  config: EstimatorConfig;
  analysis: CostAnalysis;
}

export function BreakEvenChart({ config, analysis }: BreakEvenChartProps) {
  const series = useMemo(() => buildBreakEvenSeries(config), [config]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 760;
  const height = 290;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 40;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxRps = series[series.length - 1]?.rps ?? 500;
  const minCost = Math.min(
    ...series.flatMap((p) =>
      config.includeEcsFargate
        ? [p.lambdaTotal, p.eksTotal, p.fargateTotal]
        : [p.lambdaTotal, p.eksTotal]
    )
  );
  const maxCost = Math.max(
    ...series.flatMap((p) =>
      config.includeEcsFargate
        ? [p.lambdaTotal, p.eksTotal, p.fargateTotal]
        : [p.lambdaTotal, p.eksTotal]
    )
  );

  const yMin = Math.max(0, Math.floor(minCost * 0.85));
  const yMax = Math.max(yMin + 100, Math.ceil(maxCost * 1.08));

  const xScale = (rps: number) => padLeft + (rps / maxRps) * plotW;
  const yScale = (cost: number) =>
    padTop + plotH - ((cost - yMin) / Math.max(1, yMax - yMin)) * plotH;

  const toPath = (values: number[]) =>
    values
      .map((val, idx) => {
        const x = xScale(series[idx].rps).toFixed(1);
        const y = yScale(val).toFixed(1);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

  const lambdaPath = toPath(series.map((p) => p.lambdaTotal));
  const eksPath = toPath(series.map((p) => p.eksTotal));
  const fargatePath = toPath(series.map((p) => p.fargateTotal));

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(yMin + ((yMax - yMin) / yTicks) * i)
  );

  const xTickCount = 5;
  const xTickValues = Array.from({ length: xTickCount + 1 }, (_, i) =>
    Math.round((maxRps / xTickCount) * i)
  );

  const currentRpsX = xScale(Math.min(maxRps, config.rps));
  const breakEvenRps = analysis.breakEvenEksRps;
  const breakEvenInRange = breakEvenRps !== null && breakEvenRps <= maxRps;
  const breakEvenX = breakEvenInRange ? xScale(breakEvenRps) : null;

  const hoveredPoint = hoverIdx !== null ? series[hoverIdx] : null;

  return (
    <section
      id="break-even"
      aria-labelledby="breakeven-heading"
      className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="breakeven-heading" className="text-base font-semibold text-zinc-100">
            Break-Even RPS Curve (Monthly Total Cost vs. Baseline Traffic)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Holds current burst ({config.burstMultiplier}x), duration ({config.p95DurationMs}ms), memory (
            {config.memoryMb} MB), RDS, SQS, and NAT egress constant while sweeping baseline RPS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-cyan-300">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
            Lambda
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <span className="w-3 h-0.5 bg-amber-400 inline-block" />
            EKS
          </span>
          {config.includeEcsFargate && (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
              ECS Fargate
            </span>
          )}
        </div>
      </div>

      {/* Break-even summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs">
        <div className="text-zinc-300">
          {breakEvenRps !== null ? (
            <>
              EKS becomes cheaper than Lambda at{' '}
              <span className="font-semibold text-amber-400 font-mono-tabular">
                {breakEvenRps} baseline RPS
              </span>
              {analysis.breakEvenFargateRps !== null && config.includeEcsFargate && (
                <>
                  {' · '}Fargate crosses Lambda at{' '}
                  <span className="font-semibold text-emerald-400 font-mono-tabular">
                    {analysis.breakEvenFargateRps} RPS
                  </span>
                </>
              )}
            </>
          ) : (
            <span>
              Lambda stays cheaper than EKS across the 1–1,200 RPS sweep under current burst and latency settings.
            </span>
          )}
        </div>

        {hoveredPoint ? (
          <div className="flex flex-wrap items-center gap-3 font-mono-tabular text-zinc-200">
            <span className="text-zinc-400">@ {hoveredPoint.rps} RPS:</span>
            <span className="text-cyan-400">Lambda {formatCurrency(hoveredPoint.lambdaTotal)}</span>
            <span className="text-amber-400">EKS {formatCurrency(hoveredPoint.eksTotal)}</span>
            {config.includeEcsFargate && (
              <span className="text-emerald-400">
                Fargate {formatCurrency(hoveredPoint.fargateTotal)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-zinc-500">Hover chart to inspect cost at any RPS</span>
        )}
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[540px] select-none"
          role="img"
          aria-label="Break-even RPS monthly cost comparison line chart"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal Gridlines & Y Axis Labels */}
          {yTickValues.map((val) => {
            const y = yScale(val);
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#27272a"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-zinc-500 text-[11px] font-mono-tabular"
                >
                  {formatCurrency(val)}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {xTickValues.map((rpsVal) => {
            const x = xScale(rpsVal);
            return (
              <g key={rpsVal}>
                <line
                  x1={x}
                  y1={padTop + plotH}
                  x2={x}
                  y2={padTop + plotH + 5}
                  stroke="#3f3f46"
                />
                <text
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-zinc-500 text-[11px] font-mono-tabular"
                >
                  {rpsVal} RPS
                </text>
              </g>
            );
          })}

          {/* Current RPS Vertical Marker */}
          <line
            x1={currentRpsX}
            y1={padTop}
            x2={currentRpsX}
            y2={padTop + plotH}
            stroke="#52525b"
            strokeWidth={1.25}
            strokeDasharray="4 4"
          />
          <text
            x={Math.min(width - padRight - 40, currentRpsX + 6)}
            y={padTop + 12}
            className="fill-zinc-300 text-[10px] font-mono-tabular"
          >
            Current ({config.rps} RPS)
          </text>

          {/* Break-Even Crossover Vertical Marker */}
          {breakEvenX !== null && breakEvenRps !== null && (
            <g>
              <line
                x1={breakEvenX}
                y1={padTop}
                x2={breakEvenX}
                y2={padTop + plotH}
                stroke="#f59e0b"
                strokeOpacity={0.5}
                strokeWidth={1.25}
                strokeDasharray="2 3"
              />
              <text
                x={Math.min(width - padRight - 65, breakEvenX + 6)}
                y={padTop + plotH - 8}
                className="fill-amber-400 text-[10px] font-mono-tabular font-semibold"
              >
                Break-even: {breakEvenRps} RPS
              </text>
            </g>
          )}

          {/* Curves */}
          {config.includeEcsFargate && (
            <path
              d={fargatePath}
              fill="none"
              stroke="#10b981"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}
          <path d={eksPath} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeLinecap="round" />
          <path d={lambdaPath} fill="none" stroke="#22d3ee" strokeWidth={2.5} strokeLinecap="round" />

          {/* Hover Crosshair & Points */}
          {hoveredPoint && hoverIdx !== null && (
            <g>
              <line
                x1={xScale(hoveredPoint.rps)}
                y1={padTop}
                x2={xScale(hoveredPoint.rps)}
                y2={padTop + plotH}
                stroke="#a1a1aa"
                strokeWidth={1}
              />
              <circle
                cx={xScale(hoveredPoint.rps)}
                cy={yScale(hoveredPoint.lambdaTotal)}
                r={4.5}
                fill="#22d3ee"
                stroke="#09090b"
                strokeWidth={2}
              />
              <circle
                cx={xScale(hoveredPoint.rps)}
                cy={yScale(hoveredPoint.eksTotal)}
                r={4.5}
                fill="#f59e0b"
                stroke="#09090b"
                strokeWidth={2}
              />
              {config.includeEcsFargate && (
                <circle
                  cx={xScale(hoveredPoint.rps)}
                  cy={yScale(hoveredPoint.fargateTotal)}
                  r={4.5}
                  fill="#10b981"
                  stroke="#09090b"
                  strokeWidth={2}
                />
              )}
            </g>
          )}

          {/* Invisible Interactive Hover Columns */}
          {series.map((pt, idx) => {
            const colW = plotW / series.length;
            const x = xScale(pt.rps) - colW / 2;
            return (
              <rect
                key={pt.rps}
                x={Math.max(padLeft, x)}
                y={padTop}
                width={colW}
                height={plotH}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIdx(idx)}
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}
