import type { CurrentSnapshot } from "../types";
import { fmtDate } from "../lib/format";

interface Props {
  current: CurrentSnapshot;
}

export function Footer({ current }: Props) {
  return (
    <footer className="container-x border-t border-ink-300/30 py-10 md:py-14 mt-8">
      <div className="grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-500 mb-3">aws-ip-ranges</p>
          <p className="text-ink-600 max-w-xs leading-relaxed">
            A visualization of AWS's <code className="font-mono text-accent-300">ip-ranges.json</code> over time, sourced from the daily-mirror repository.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-600 mb-3">data</p>
          <ul className="space-y-1.5 text-ink-700">
            <li>Snapshot: <span className="font-mono text-ink-900">{fmtDate(current.date)}</span></li>
            <li>Sync token: <span className="font-mono text-ink-900">{current.sync_token}</span></li>
            <li>Commit: <span className="font-mono text-ink-900">{current.sha.slice(0, 7)}</span></li>
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-600 mb-3">links</p>
          <ul className="space-y-1.5 text-ink-700">
            <li><a className="hover:text-accent-300 transition" href="https://github.com/sjramblings/aws-ip-ranges" target="_blank" rel="noreferrer">github.com/sjramblings/aws-ip-ranges</a></li>
            <li><a className="hover:text-accent-300 transition" href="https://ip-ranges.amazonaws.com/ip-ranges.json" target="_blank" rel="noreferrer">official ip-ranges.json</a></li>
            <li><a className="hover:text-accent-300 transition" href="https://docs.aws.amazon.com/general/latest/gr/aws-ip-ranges.html" target="_blank" rel="noreferrer">aws-ip-ranges docs</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-ink-300/15 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-600">
        <p>Built with Bun · Vite · D3 · Recharts. Source on GitHub.</p>
        <p className="font-mono">{current.region_count} regions · {current.service_count} services · {(current.total + current.ipv6_total).toLocaleString()} prefixes</p>
      </div>
    </footer>
  );
}
