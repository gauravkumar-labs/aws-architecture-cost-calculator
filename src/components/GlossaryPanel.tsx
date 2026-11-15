const GLOSSARY_ITEMS = [
  {
    term: 'RPS (Requests Per Second)',
    meaning:
      'How many incoming HTTP calls, API requests, or webhook events your app receives every second during normal traffic.',
  },
  {
    term: 'Peak Burst Multiplier',
    meaning:
      'How many times bigger your traffic spikes get during rush hours compared to normal traffic (for example, 14 RPS × 8x = 112 Peak RPS).',
  },
  {
    term: 'Peak Window Duration',
    meaning:
      'How many hours per day your service stays at that spiked peak rate before dropping back down to baseline traffic.',
  },
  {
    term: 'p95 Execution Duration',
    meaning:
      'How long 95 out of 100 requests take to finish (in milliseconds, where 1,000 ms = 1 second). The slowest 5% are excluded so rare outliers do not distort sizing.',
  },
  {
    term: 'Break-Even RPS',
    meaning:
      'The traffic level where paying for always-on Kubernetes containers (EKS) becomes cheaper per month than paying per request on AWS Lambda.',
  },
  {
    term: 'Lambda Provisioned Concurrency',
    meaning:
      'Keeping a set number of Lambda copies pre-warmed 24/7 so users never experience a startup delay ("cold start") on sudden requests.',
  },
  {
    term: 'EKS Control Plane ($73/mo)',
    meaning:
      'The flat monthly fee AWS charges to run and manage the Kubernetes coordinator ("brain") that schedules and monitors your containers.',
  },
  {
    term: 'Multi-AZ Standby & Read Replicas',
    meaning:
      'Multi-AZ keeps a live backup database in another data center for automatic outage failover (2x cost). Read Replicas are extra read-only copies that offload search/reporting queries.',
  },
  {
    term: 'NAT Gateway & Data Egress',
    meaning:
      'A private network router letting internal AWS servers call external APIs, plus AWS bandwidth fees for outbound data sent to the public internet.',
  },
];

export function GlossaryPanel() {
  return (
    <section
      id="glossary"
      aria-labelledby="glossary-heading"
      className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 id="glossary-heading" className="text-base font-semibold text-zinc-100">
          Cloud Terms in Plain English
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Simple definitions for the traffic, latency, and AWS infrastructure terms used across this estimator.
        </p>
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:gap-px bg-zinc-800/70">
        {GLOSSARY_ITEMS.map((item) => (
          <div key={item.term} className="p-4 bg-zinc-950/90 space-y-1">
            <dt className="text-xs font-semibold text-cyan-300">{item.term}</dt>
            <dd className="text-xs text-zinc-300 leading-relaxed">{item.meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
