import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import type { CurrentSnapshot, ServiceSeries } from "../types";
import { fmt, fmtDate, fmtDateShort } from "../lib/format";
import { cn } from "../lib/cn";

interface Props {
  services: ServiceSeries;
  current: CurrentSnapshot;
}

const PALETTE = ["#FF9900", "#0FB5BA", "#FFB84D", "#22D3D9", "#FFCD80", "#0A8A8E", "#FFA61A", "#67E8F9", "#CC7A00", "#155E75"];

export function ServiceComposition({ services, current }: Props) {
  const [mode, setMode] = useState<"absolute" | "share">("absolute");

  const top10 = current.top_services.map((s) => s.service);

  // Build wide-format chart data: one row per date, columns for each top-10 service.
  const chartData = useMemo(() => {
    const dates = new Set<string>();
    for (const sv of top10) for (const p of services[sv] ?? []) dates.add(p.date);
    const sortedDates = [...dates].sort();
    const lookup: Record<string, Record<string, number>> = {};
    for (const sv of top10) {
      lookup[sv] = {};
      for (const p of services[sv] ?? []) lookup[sv]![p.date] = p.count;
    }
    let lastTotal = 0;
    return sortedDates.map((date) => {
      const row: Record<string, number | string> = { date };
      let total = 0;
      for (const sv of top10) {
        const v = lookup[sv]![date] ?? 0;
        row[sv] = v;
        total += v;
      }
      if (total > 0) lastTotal = total;
      if (mode === "share" && lastTotal > 0) {
        for (const sv of top10) {
          row[sv] = ((row[sv] as number) / lastTotal) * 100;
        }
      }
      return row;
    });
  }, [services, top10, mode]);

  // Long-tail crossings — services that crossed 10, 100, or 500 prefix thresholds
  const crossings = useMemo(() => {
    const items: Array<{ service: string; threshold: number; date: string; count: number }> = [];
    for (const [service, points] of Object.entries(services)) {
      for (const t of [10, 100, 500]) {
        const crossed = points.find((p) => p.count >= t);
        const before = points.find((p) => p.count > 0);
        if (crossed && before && crossed.date !== before.date) {
          items.push({ service, threshold: t, date: crossed.date, count: crossed.count });
          break; // only first crossing
        }
      }
    }
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [services]);

  return (
    <section id="services" className="container-x pb-16 md:pb-24">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="h-eyebrow mb-2">Section 04 · service composition</p>
          <h2 className="h-section">Top 10 services, the long tail beneath.</h2>
          <p className="text-ink-600 mt-2 max-w-2xl">
            AMAZON and EC2 are 75% of all prefixes; the long tail is where AWS's actual product launches show up.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-ink-300/30 bg-ink-100/30 p-0.5">
          {(["absolute", "share"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-mono transition",
                mode === m ? "bg-accent-500/15 text-accent-300" : "text-ink-600 hover:text-ink-900",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="card p-4 md:p-6">
        <div className="h-[420px]">
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 6, right: 12, bottom: 8, left: 8 }}>
              <defs>
                {top10.map((sv, i) => (
                  <linearGradient key={sv} id={`svc-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.7} />
                    <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="rgba(58,70,84,0.25)" strokeDasharray="2 4" />
              <XAxis dataKey="date" tickFormatter={(d) => fmtDateShort(d as string)} stroke="rgba(181,188,199,0.5)" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="rgba(181,188,199,0.5)"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => (mode === "share" ? `${(v as number).toFixed(0)}%` : fmt.format(v as number))}
              />
              <Tooltip
                contentStyle={{ background: "#0F141A", border: "1px solid #2A3441", borderRadius: 8, fontSize: 12, maxHeight: 320 }}
                labelFormatter={(d) => fmtDate(d as string)}
                formatter={(v: number, name: string) => [mode === "share" ? `${v.toFixed(1)}%` : fmt.format(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
              {top10.map((sv, i) => (
                <Area
                  key={sv}
                  type="monotone"
                  dataKey={sv}
                  stackId="1"
                  stroke={PALETTE[i % PALETTE.length]}
                  fill={`url(#svc-${i})`}
                  strokeWidth={1}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {crossings.length > 0 && (
        <div className="mt-6">
          <p className="h-eyebrow mb-3">Long-tail crossings · services breaking thresholds</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {crossings.map((c, i) => (
              <motion.div
                key={c.service + c.threshold}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="card p-4"
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-teal-400">{c.threshold}+ prefixes</div>
                <div className="font-mono text-sm text-ink-900 mt-1.5 truncate">{c.service}</div>
                <div className="text-xs text-ink-600 mt-2 font-mono">{fmtDate(c.date)}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
