import { useMemo } from "react";
import { motion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RegionSeries, TimelinePoint } from "../types";
import { fmt, fmtDate, fmtDateShort, groupBucket } from "../lib/format";

interface Props {
  regions: RegionSeries;
  timeline: TimelinePoint[];
}

interface Row { date: string; Commercial: number; GovCloud: number; China: number; Global: number }

export function ComplianceLens({ regions, timeline }: Props) {
  const data = useMemo<Row[]>(() => {
    const dates = timeline.map((p) => p.date);
    return dates.map((date) => {
      const row: Row = { date, Commercial: 0, GovCloud: 0, China: 0, Global: 0 };
      for (const [region, points] of Object.entries(regions)) {
        const grp = groupBucket(region);
        const onDate = points.find((p) => p.date === date);
        if (onDate) row[grp] += onDate.count;
      }
      return row;
    });
  }, [regions, timeline]);

  const yoy = useMemo(() => {
    if (data.length < 2) return null;
    const last = data[data.length - 1]!;
    let oneYearAgo: Row | undefined;
    for (let i = data.length - 1; i >= 0; i--) {
      const d = data[i]!;
      if (new Date(last.date).getTime() - new Date(d.date).getTime() >= 365 * 86400000) {
        oneYearAgo = d;
        break;
      }
    }
    const baseline = oneYearAgo ?? data[0]!;
    const pct = (cur: number, base: number) => (base > 0 ? ((cur - base) / base) * 100 : 0);
    return {
      Commercial: pct(last.Commercial, baseline.Commercial),
      GovCloud: pct(last.GovCloud, baseline.GovCloud),
      China: pct(last.China, baseline.China),
      Global: pct(last.Global, baseline.Global),
      baseline: baseline.date,
    };
  }, [data]);

  return (
    <section id="compliance" className="container-x pb-16 md:pb-24">
      <header className="mb-6">
        <p className="h-eyebrow mb-2">Section 05 · compliance & edge lens</p>
        <h2 className="h-section">Where AWS is growing fastest.</h2>
        <p className="text-ink-600 mt-2 max-w-2xl">
          GovCloud expansion outpaces commercial — a compliance signal. GLOBAL — the home of CloudFront, Route53, WAF — is growing faster than most regions.
        </p>
      </header>

      {yoy && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {(["Commercial", "GovCloud", "China", "Global"] as const).map((k) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="card p-5"
            >
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-600">{k}</p>
              <p className="num-display text-3xl font-semibold tracking-tightest mt-1.5 text-ink-900">{fmt.format(data[data.length - 1]?.[k] ?? 0)}</p>
              <p className={`text-sm font-mono mt-1 ${yoy[k] >= 0 ? "text-teal-400" : "text-accent-500"}`}>
                {yoy[k] >= 0 ? "+" : ""}
                {yoy[k].toFixed(1)}% YoY
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="card p-4 md:p-6">
        <div className="h-[360px]">
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="rgba(58,70,84,0.25)" strokeDasharray="2 4" />
              <XAxis dataKey="date" tickFormatter={(d) => fmtDateShort(d as string)} stroke="rgba(181,188,199,0.5)" tick={{ fontSize: 11 }} />
              <YAxis stroke="rgba(181,188,199,0.5)" tick={{ fontSize: 11 }} tickFormatter={(v) => fmt.format(v as number)} />
              <Tooltip
                contentStyle={{ background: "#0F141A", border: "1px solid #2A3441", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d) => fmtDate(d as string)}
                formatter={(v: number, name: string) => [fmt.format(v), name]}
              />
              <Line type="monotone" dataKey="Commercial" stroke="#FF9900" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="GovCloud" stroke="#0FB5BA" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="China" stroke="#FFCD80" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Global" stroke="#22D3D9" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {yoy && (
          <p className="text-xs text-ink-600 mt-2 font-mono">
            YoY measured against {fmtDate(yoy.baseline)} baseline
          </p>
        )}
      </motion.div>
    </section>
  );
}
