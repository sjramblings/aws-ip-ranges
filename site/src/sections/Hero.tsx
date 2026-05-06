import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { CurrentSnapshot, TimelinePoint } from "../types";
import { fmt, fmtRelative } from "../lib/format";

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <span ref={ref} className="num-display">
      {fmt.format(v)}
      {suffix}
    </span>
  );
}

interface Props {
  current: CurrentSnapshot;
  timeline: TimelinePoint[];
}

export function Hero({ current, timeline }: Props) {
  // sample timeline to 100 points for the sparkline
  const sample = timeline.filter((_, i) => i % Math.max(1, Math.floor(timeline.length / 100)) === 0).map((p) => ({ date: p.date, total: p.total + p.ipv6_total }));

  // derive every time-bound phrase from the data so the copy never goes stale
  const firstDate = timeline[0]?.date ?? current.date;
  const firstD = new Date(firstDate + "T00:00:00Z");
  const lastD = new Date(current.date + "T00:00:00Z");
  const monthsSpan = Math.max(1, Math.round((lastD.getTime() - firstD.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
  const sinceLabel = firstD.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstYear = firstD.getUTCFullYear();
  const lastYear = lastD.getUTCFullYear();
  const yearSpan = firstYear === lastYear ? `${firstYear}` : `${firstYear} → today`;

  return (
    <section id="hero" className="container-x pt-12 md:pt-20 pb-16 md:pb-24">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="h-eyebrow mb-5">{monthsSpan} months of daily snapshots, in motion</p>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tightest leading-[0.95] text-ink-900">
          AWS IP Ranges,
          <br />
          <span className="bg-gradient-to-r from-accent-500 to-teal-400 bg-clip-text text-transparent">visualized</span>
          <span className="text-accent-500">.</span>
        </h1>
        <p className="mt-7 max-w-2xl text-lg md:text-xl text-ink-600 leading-relaxed">
          Every AWS IP prefix, every service, every region — captured daily since {sinceLabel}.
          Built from <a className="text-accent-500 hover:text-accent-300 underline-offset-4 hover:underline" href="https://github.com/sjramblings/aws-ip-ranges">{current.region_count}+ regions of git history</a>, rendered as the picture AWS doesn't ship.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
      >
        <Stat label="IPv4 prefixes" value={current.total} />
        <Stat label="IPv6 prefixes" value={current.ipv6_total} />
        <Stat label="Regions" value={current.region_count} />
        <Stat label="Services" value={current.service_count} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="mt-8 card p-5 md:p-6"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="h-eyebrow">Total prefix growth · {yearSpan}</p>
          <p className="text-xs text-ink-600 font-mono">
            +{fmt.format((current.total + current.ipv6_total) - (timeline[0]?.total ?? 0) - (timeline[0]?.ipv6_total ?? 0))} since first snapshot
          </p>
        </div>
        <div className="h-24">
          <ResponsiveContainer>
            <AreaChart data={sample}>
              <defs>
                <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF9900" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#FF9900" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="total" stroke="#FF9900" strokeWidth={1.5} fill="url(#hero-spark)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <span className="pill">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          updated {fmtRelative(current.date)}
        </span>
        <span className="pill font-mono">commit {current.sha.slice(0, 7)}</span>
        <span className="pill">syncToken {current.sync_token.slice(-8)}</span>
      </motion.div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5 md:p-7">
      <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-600 mb-2">{label}</p>
      <p className="text-3xl md:text-5xl font-semibold tracking-tightest text-ink-900">
        <CountUp to={value} />
      </p>
    </div>
  );
}
