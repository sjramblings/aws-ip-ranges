import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { scaleSequential } from "d3-scale";
import { interpolateLab } from "d3-interpolate";
import { timeDay, timeMonday, timeSunday, timeWeek } from "d3-time";
import { timeFormat } from "d3-time-format";
import { select } from "d3-selection";
import type { TimelinePoint } from "../types";
import { fmt, fmtDate } from "../lib/format";

interface Props {
  timeline: TimelinePoint[];
}

const cellSize = 12;
const cellGap = 3;
const monthLabelHeight = 18;
const dayLabelWidth = 18;

export function ActivityCalendar({ timeline }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ date: string; diff: number; total: number; x: number; y: number } | null>(null);

  // last 365 days
  const yearAgo = timeDay.offset(new Date(), -365);
  const cells = useMemo(() => {
    const map = new Map<string, TimelinePoint>();
    for (const p of timeline) map.set(p.date, p);
    const days = timeDay.range(timeMonday(yearAgo), timeSunday(timeDay.offset(new Date(), 1)));
    return days.map((d) => {
      const iso = timeFormat("%Y-%m-%d")(d);
      const pt = map.get(iso);
      return { d, iso, diff: pt?.diff_size ?? 0, total: pt ? pt.total + pt.ipv6_total : 0, has: !!pt };
    });
  }, [timeline]);

  const max = useMemo(() => Math.max(...cells.map((c) => c.diff), 1), [cells]);
  const color = useMemo(
    () =>
      scaleSequential<string>()
        .domain([0, max])
        .interpolator((t) => interpolateLab("rgba(30,39,51,0.4)", "#FF9900")(Math.pow(t, 0.4))),
    [max],
  );

  useEffect(() => {
    const svg = select(ref.current!);
    svg.selectAll("*").remove();
    if (!cells.length) return;

    const startMonday = timeMonday(cells[0]!.d);
    const weekIndex = (d: Date) => Math.floor((timeMonday(d).getTime() - startMonday.getTime()) / (7 * 86400000));
    const totalWeeks = weekIndex(cells[cells.length - 1]!.d) + 1;
    const width = dayLabelWidth + totalWeeks * (cellSize + cellGap);
    const height = monthLabelHeight + 7 * (cellSize + cellGap);

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g").attr("transform", `translate(${dayLabelWidth},${monthLabelHeight})`);

    g.selectAll("rect")
      .data(cells)
      .join("rect")
      .attr("x", (c) => weekIndex(c.d) * (cellSize + cellGap))
      .attr("y", (c) => c.d.getDay() === 0 ? 6 * (cellSize + cellGap) : (c.d.getDay() - 1) * (cellSize + cellGap))
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("rx", 2)
      .attr("fill", (c) => (c.has ? color(c.diff) : "rgba(30,39,51,0.25)"))
      .style("cursor", "pointer")
      .on("mousemove", (ev: MouseEvent, c) => {
        const rect = ref.current!.getBoundingClientRect();
        setHover({
          date: c.iso,
          diff: c.diff,
          total: c.total,
          x: ev.clientX - rect.left,
          y: ev.clientY - rect.top,
        });
      })
      .on("mouseleave", () => setHover(null));

    // month labels
    const monthFmt = timeFormat("%b");
    const months = timeWeek.range(startMonday, cells[cells.length - 1]!.d).filter((d) => d.getDate() <= 7);
    svg
      .append("g")
      .attr("transform", `translate(${dayLabelWidth},${monthLabelHeight - 4})`)
      .selectAll("text")
      .data(months)
      .join("text")
      .attr("x", (d) => weekIndex(d) * (cellSize + cellGap))
      .attr("font-size", 10)
      .attr("fill", "rgba(181,188,199,0.7)")
      .text((d) => monthFmt(d));

    // day labels (Mon, Wed, Fri)
    svg
      .append("g")
      .attr("transform", `translate(0,${monthLabelHeight})`)
      .selectAll("text")
      .data(["Mon", "Wed", "Fri"])
      .join("text")
      .attr("x", 0)
      .attr("y", (_d, i) => (i * 2 + 0.7) * (cellSize + cellGap))
      .attr("font-size", 9)
      .attr("fill", "rgba(181,188,199,0.5)")
      .text((d) => d);
  }, [cells, color]);

  return (
    <section id="activity" className="container-x pb-16 md:pb-24">
      <header className="mb-6">
        <p className="h-eyebrow mb-2">Section 06 · activity calendar</p>
        <h2 className="h-section">Daily diff size, last 365 days.</h2>
        <p className="text-ink-600 mt-2 max-w-2xl">
          Brighter cells are bigger commits. Empty cells = no AWS publication that day. Reveals AWS's actual rhythm — quiet weekends, occasional big batches.
        </p>
      </header>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="card p-5 md:p-7 relative overflow-x-auto">
        <svg ref={ref} className="chart w-full max-w-full" preserveAspectRatio="xMinYMid meet" />
        {hover && (
          <div
            className="pointer-events-none absolute card px-3 py-2 text-xs"
            style={{ left: Math.min(hover.x + 12, 600), top: hover.y + 12 }}
          >
            <div className="font-mono text-accent-500">{fmtDate(hover.date)}</div>
            {hover.diff > 0 ? (
              <>
                <div className="num-display text-base mt-0.5 text-ink-900">{fmt.format(hover.diff)} lines</div>
                <div className="text-ink-600">{fmt.format(hover.total)} prefixes total</div>
              </>
            ) : (
              <div className="text-ink-600 mt-0.5">no commit</div>
            )}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3 text-[11px] text-ink-600 font-mono">
          <span>less</span>
          <div className="flex gap-1">
            {[0.05, 0.2, 0.4, 0.6, 0.85].map((t) => (
              <span key={t} className="block h-3 w-3 rounded-sm" style={{ background: color(max * t) }} />
            ))}
          </div>
          <span>more</span>
          <span className="ml-auto">max {fmt.format(max)} lines</span>
        </div>
      </motion.div>
    </section>
  );
}
