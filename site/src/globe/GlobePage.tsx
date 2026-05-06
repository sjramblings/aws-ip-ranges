import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { CurrentSnapshot } from "../types";
import { loadCurrent } from "../lib/data";
import { fmt, fmtRelative } from "../lib/format";
import { cn } from "../lib/cn";
import { Footer } from "../sections/Footer";
import { GlobeNav } from "./GlobeNav";
import { Globe } from "./Globe";
import { REGION_COORDS, getGroup } from "./region-coords";

type SortMode = "count" | "alpha";
type GroupFilter = "all" | "Commercial" | "GovCloud" | "China" | "Sovereign" | "Global";

export function GlobePage() {
  const [current, setCurrent] = useState<CurrentSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("count");
  const [filter, setFilter] = useState<GroupFilter>("all");

  useEffect(() => {
    loadCurrent().then(setCurrent).catch((e) => setErr((e as Error).message));
  }, []);

  const ordered = useMemo(() => {
    if (!current) return [];
    const filtered = current.regions.filter((r) => {
      const grp = getGroup(r.region);
      const isPlaced = !!REGION_COORDS[r.region] || r.region === "GLOBAL";
      if (!isPlaced) return false;
      if (filter === "all") return true;
      return grp === filter;
    });
    return [...filtered].sort((a, b) =>
      sort === "count" ? b.count - a.count : a.region.localeCompare(b.region),
    );
  }, [current, sort, filter]);

  const placed = current ? current.regions.filter((r) => !!REGION_COORDS[r.region]).length : 0;
  const unplaced = current ? current.regions.filter((r) => !REGION_COORDS[r.region]).map((r) => r.region) : [];

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-700">
        <div className="text-center">
          <p className="text-accent-500 font-mono text-sm uppercase tracking-widest mb-2">Failed to load</p>
          <p className="text-ink-600">{err}</p>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-700">
          <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse" />
          <span className="font-mono text-sm">loading globe…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <GlobeNav />

      <section id="globe-hero" className="container-x pt-10 md:pt-16 pb-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="h-eyebrow mb-4">{placed} regions on the globe · {fmt.format(current.total + current.ipv6_total)} prefixes</p>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tightest leading-[0.95] text-ink-900">
            AWS, on a{" "}
            <span className="bg-gradient-to-r from-accent-500 to-teal-400 bg-clip-text text-transparent">globe</span>
            <span className="text-accent-500">.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base md:text-lg text-ink-600 leading-relaxed">
            Every announced AWS region, sized by current prefix count. Drag to rotate, click a region or pick one from the list to centre the view.
          </p>
        </motion.div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="pill"><span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />updated {fmtRelative(current.date)}</span>
          <span className="pill font-mono">commit {current.sha.slice(0, 7)}</span>
          <Legend />
        </div>
      </section>

      <section className="container-x flex-1 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 pb-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.1 }} className="card p-3 md:p-5 flex items-center justify-center">
          <Globe regions={current.regions} selected={selected} onSelect={setSelected} />
        </motion.div>

        <motion.aside initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="card p-4 md:p-5 max-h-[760px] flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SortPills value={sort} onChange={setSort} />
            <FilterPills value={filter} onChange={setFilter} />
          </div>

          <p className="text-xs text-ink-600 font-mono mb-3">
            {ordered.length} region{ordered.length === 1 ? "" : "s"}{filter === "all" ? "" : ` · ${filter}`}
          </p>

          <ul className="flex-1 overflow-y-auto pr-1 space-y-1.5">
            {ordered.map((r) => {
              const grp = getGroup(r.region);
              const sel = selected === r.region;
              const isPlaced = !!REGION_COORDS[r.region];
              return (
                <li key={r.region}>
                  <button
                    onClick={() => setSelected(sel ? null : r.region)}
                    disabled={!isPlaced}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition",
                      sel ? "border-accent-500/50 bg-accent-500/10" : "border-ink-300/30 hover:border-ink-400/50 bg-ink-100/30",
                      !isPlaced && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", `group-${grp.toLowerCase()}`)} style={{ background: groupColor(grp) }} />
                    <span className="font-mono text-xs text-ink-700 flex-1 truncate">{r.region}</span>
                    <span className="num-display text-sm font-semibold text-ink-900">{fmt.format(r.count)}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {unplaced.length > 0 && filter === "all" && (
            <div className="mt-3 pt-3 border-t border-ink-300/15 text-xs text-ink-600">
              <p className="font-mono uppercase tracking-[0.18em] mb-1.5">Not placed</p>
              <p className="leading-relaxed">{unplaced.join(" · ")} — non-geographic or not yet mapped to a city centre.</p>
            </div>
          )}
        </motion.aside>
      </section>

      <Footer current={current} />
    </div>
  );
}

function groupColor(g: ReturnType<typeof getGroup>): string {
  switch (g) {
    case "Commercial": return "#FF9900";
    case "GovCloud": return "#22D3D9";
    case "China": return "#FFCD80";
    case "Sovereign": return "#A78BFA";
    case "Global": return "#0FB5BA";
  }
}

function Legend() {
  const items: Array<[ReturnType<typeof getGroup>, string]> = [
    ["Commercial", "commercial"],
    ["GovCloud", "govcloud"],
    ["China", "china"],
    ["Sovereign", "sovereign"],
  ];
  return (
    <>
      {items.map(([k, label]) => (
        <span key={k} className="pill">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: groupColor(k) }} />
          {label}
        </span>
      ))}
    </>
  );
}

function SortPills({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const opts: Array<[SortMode, string]> = [["count", "size"], ["alpha", "A→Z"]];
  return (
    <div className="flex items-center gap-1 rounded-full border border-ink-300/30 bg-ink-100/30 p-0.5">
      {opts.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={cn("rounded-full px-3 py-1 text-xs font-mono transition", value === k ? "bg-accent-500/15 text-accent-300" : "text-ink-600 hover:text-ink-900")}>{label}</button>
      ))}
    </div>
  );
}

function FilterPills({ value, onChange }: { value: GroupFilter; onChange: (v: GroupFilter) => void }) {
  const opts: Array<[GroupFilter, string]> = [
    ["all", "all"],
    ["Commercial", "commercial"],
    ["GovCloud", "govcloud"],
    ["China", "china"],
    ["Sovereign", "sovereign"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {opts.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} className={cn("rounded-full px-2.5 py-1 text-xs font-mono transition border", value === k ? "border-teal-500/40 bg-teal-500/10 text-teal-400" : "border-ink-300/30 bg-ink-100/30 text-ink-600 hover:text-ink-900")}>{label}</button>
      ))}
    </div>
  );
}
