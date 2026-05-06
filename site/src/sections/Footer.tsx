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
        <p>
          Built by{" "}
          <a
            className="inline-flex items-center gap-1 text-ink-700 hover:text-accent-300 transition"
            href="https://www.linkedin.com/in/stephen-jones-6138069/"
            target="_blank"
            rel="noreferrer"
            aria-label="Stephen Jones on LinkedIn"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden="true">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.65-1.85 3.4-1.85 3.63 0 4.3 2.39 4.3 5.5v6.24zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
            </svg>
            Stephen Jones
          </a>
          {" "}with Bun · Vite · D3 · Recharts. Source on GitHub.
        </p>
        <p className="font-mono">{current.region_count} regions · {current.service_count} services · {(current.total + current.ipv6_total).toLocaleString()} prefixes</p>
      </div>
    </footer>
  );
}
