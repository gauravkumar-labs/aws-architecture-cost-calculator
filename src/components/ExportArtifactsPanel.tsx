import { Check, Copy, Download, FileCode2, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { generateMarkdownAdr, generateTerraformTfvars } from '../lib/generators';
import { CostAnalysis, EstimatorConfig } from '../types/estimator';

interface ExportArtifactsPanelProps {
  config: EstimatorConfig;
  analysis: CostAnalysis;
}

type ExportTab = 'tfvars' | 'adr';

export function ExportArtifactsPanel({ config, analysis }: ExportArtifactsPanelProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>('tfvars');
  const [copiedTab, setCopiedTab] = useState<ExportTab | null>(null);

  const tfvarsContent = useMemo(
    () => generateTerraformTfvars(config, analysis),
    [config, analysis]
  );
  const adrContent = useMemo(() => generateMarkdownAdr(config, analysis), [config, analysis]);

  const currentContent = activeTab === 'tfvars' ? tfvarsContent : adrContent;
  const currentFilename =
    activeTab === 'tfvars' ? 'terraform.tfvars' : 'ADR-001-aws-dotnet-architecture.md';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopiedTab(activeTab);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      // Clipboard API fallback omitted for restricted iframe permissions
    }
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="exports"
      aria-labelledby="exports-heading"
      className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="exports-heading" className="text-base font-semibold text-zinc-100">
            Exportable Infrastructure & Decision Artifacts
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Live-generated from your active workload parameters and cost model.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('tfvars')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'tfvars'
                  ? 'bg-zinc-800 text-cyan-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" aria-hidden="true" />
              Terraform .tfvars
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('adr')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'adr'
                  ? 'bg-zinc-800 text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              Markdown ADR
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedTab === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                Copy
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleDownload(currentFilename, currentContent)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download {activeTab === 'tfvars' ? '.tfvars' : '.md'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-950/90 p-5 overflow-x-auto max-h-[420px] overflow-y-auto">
        <pre className="text-xs leading-relaxed text-zinc-300 font-mono-tabular whitespace-pre">
          {currentContent}
        </pre>
      </div>
    </section>
  );
}
