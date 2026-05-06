import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CurrentSnapshot, RegionSeries } from "../types";
import { fmt, fmtDate, groupBucket } from "../lib/format";
import { cn } from "../lib/cn";

interface Props {
  regions: RegionSeries;
  current: CurrentSnapshot;
}

type SortMode = "size" | "growth" | "alpha" | "newest";

const groupOrder: Record<string, number> = { Commercial: 0, GovCloud: 1, China: 2, Global: 3 };

export function RegionAtlas({ regions, current }: Props) {
  const [sort, setSort] = useState<SortMode>("size");
  const [filter, setFilter] = useState<"all" | "Commercial" | "GovCloud" | "China" | "Global">("all");
  const [selected, setSelected] = useState<string>(current.regions[0]?.region ?? "us-east-1");

  const summary = useMemo(() => {
    return Object.entries(regions).map(([region, points]) => {
      const first = points[0];
      const last = points[points.length - 1];
      const firstSeen = first?.date ?? "";
      const current = last?.count ?? 0;
      const growth = first ? current - first.count : 0;
      const growthPct = first && first.count > 0 ? (growth / first.count) * 100 : current > 0 ? 100 : 0;
      return { region, current, firstSeen, growth, growthPct, group: groupBucket(region) };
    });
  }, [regions]);

  const ordered = useMemo(() => {
    const filtered = filter === "all" ? summary : summary.filter((r) => r.group === filter);
    return [...filtered].sort((a, b) => {
      if (sort === "size") return b.current - a.current;
      if (sort === "growth") return b.growthPct - a.growthPct;
      if (sort === "newest") return b.firstSeen.localeCompare(a.firstSeen);
      if (sort === "alpha") return a.region.localeCompare(b.region);
      return 0;
    });
  }, [summary, sort, filter]);

  const selectedSeries = regions[selected] ?? [];
  const selectedSummary = summary.find((s) => s.region === selected);

  const max = Math.max(...summary.map((s) => s.current));

  return (
    <section id="regions" className="container-x pb-16 md:pb-24">
      <header className="mb-6">
        <p className="h-eyebrow mb-2">Section 03 · region atlas</p>
        <h2 className="h-section">{Object.keys(regions).length} regions and counting.</h2>
        <p className="text-ink-600 mt-2 max-w-2xl">
          Heat shows current prefix weight per region. Newer regions emerge near the bottom — `sa-west-1`, `us-south-1`, `mx-central-1` joined the family in the last year.
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="card p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <SortPills value={sort} onChange={setSort} />
            <FilterPills value={filter} onChange={setFilter} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {ordered.map((r) => {
              const intensity = max > 0 ? r.current / max : 0;
              const fresh = (Date.now() - new Date(r.firstSeen + "T00:00:00Z").getTime()) / 86400000 < 365;
              return (
                <button
                  key={r.region}
                  onClick={() => setSelected(r.region)}
                  className={cn(
                    "group relative text-left rounded-xl border p-3 transition",
                    selected === r.region
                      ? "border-accent-500/50 bg-accent-500/10"
                      : "border-ink-300/30 hover:border-ink-400/50 bg-ink-100/30",
                  )}
                >
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, rgba(255,153,0,${intensity * 0.16}) 0%, transparent 70%)`,
                    }}
                  />
                  <div className="relative">
                    <div className="font-mono text-xs text-ink-700 truncate">{r.region}</div>
                    <div className="num-display text-xl font-semibold text-ink-900 mt-1">{fmt.format(r.current)}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={cn("text-[10px] font-mono", r.growth >= 0 ? "text-teal-400" : "text-accent-500")}>
                        {r.growth >= 0 ? "+" : ""}
                        {fmt.format(r.growth)}
                      </span>
                      {fresh && <span className="text-[9px] font-mono text-accent-500 uppercase tracking-wider">NEW</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.aside initial={{ opacity: 0, x: 8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="card p-5 md:p-6">
          {selectedSummary && (
            <>
              <p className="h-eyebrow mb-2">{selectedSummary.group}</p>
              <h3 className="text-2xl font-semibold tracking-tightest font-mono text-ink-900">{selectedSummary.region}</h3>
              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <Stat label="Prefixes" value={fmt.format(selectedSummary.current)} />
                <Stat label="Growth" value={`${selectedSummary.growth >= 0 ? "+" : ""}${fmt.format(selectedSummary.growth)}`} accent={selectedSummary.growth >= 0 ? "teal" : "accent"} />
                <Stat label="First seen" value={fmtDate(selectedSummary.firstSeen)} />
                <Stat label="Growth %" value={`${selectedSummary.growthPct.toFixed(0)}%`} />
              </div>
              <div className="h-32 mt-6">
                <ResponsiveContainer>
                  <AreaChart data={selectedSeries} margin={{ top: 4, right: 6, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="region-mini" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0FB5BA" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#0FB5BA" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, "dataMax"]} />
                    <Tooltip
                      contentStyle={{ background: "#0F141A", border: "1px solid #2A3441", borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(v) => fmtDate(v as string)}
                      formatter={(v: number) => [fmt.format(v), "prefixes"]}
                    />
                    <Area type="monotone" dataKey="count" stroke="#0FB5BA" strokeWidth={1.5} fill="url(#region-mini)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-ink-600 mt-4">
                Click any region card on the left to inspect.
              </p>
            </>
          )}
        </motion.aside>
      </div>
    </section>
  );
}

function SortPills({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const opts: Array<[SortMode, string]> = [
    ["size", "size"],
    ["growth", "growth"],
    ["newest", "newest"],
    ["alpha", "A→Z"],
  ];
  return (
    <div className="flex items-center gap-1 rounded-full border border-ink-300/30 bg-ink-100/30 p-0.5">
      {opts.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-mono transition",
            value === k ? "bg-accent-500/15 text-accent-300" : "text-ink-600 hover:text-ink-900",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FilterPills({ value, onChange }: { value: "all" | "Commercial" | "GovCloud" | "China" | "Global"; onChange: (v: "all" | "Commercial" | "GovCloud" | "China" | "Global") => void }) {
  const opts: Array<["all" | "Commercial" | "GovCloud" | "China" | "Global", string]> = [
    ["all", "all"],
    ["Commercial", "commercial"],
    ["GovCloud", "govcloud"],
    ["China", "china"],
    ["Global", "global"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {opts.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-mono transition border",
            value === k ? "border-teal-500/40 bg-teal-500/10 text-teal-400" : "border-ink-300/30 bg-ink-100/30 text-ink-600 hover:text-ink-900",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "teal" | "accent" }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-600">{label}</p>
      <p className={cn("num-display text-base font-semibold mt-0.5", accent === "teal" ? "text-teal-400" : accent === "accent" ? "text-accent-500" : "text-ink-900")}>{value}</p>
    </div>
  );
}

// ensure the groupOrder constant is referenced (used implicitly in alpha sort? — kept for future use)
void groupOrder;
