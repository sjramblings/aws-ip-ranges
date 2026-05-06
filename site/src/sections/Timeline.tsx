import { useEffect, useMemo, useRef, useState } from "react";
import { axisBottom, axisLeft } from "d3-axis";
import { scaleLinear, scaleTime } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { extent, max } from "d3-array";
import { select } from "d3-selection";
import { brushX, type D3BrushEvent } from "d3-brush";
import { timeFormat } from "d3-time-format";
import { motion } from "framer-motion";
import type { DataEvent, TimelinePoint } from "../types";
import { fmt, fmtDate } from "../lib/format";

interface Props {
  timeline: TimelinePoint[];
  events: DataEvent[];
}

interface Pt extends TimelinePoint {
  d: Date;
  totalAll: number;
}

const margin = { top: 30, right: 24, bottom: 36, left: 56 };
const fmtTick = timeFormat("%b %y");

export function Timeline({ timeline, events }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 420 });
  const [hover, setHover] = useState<{ pt: Pt; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState<[Date, Date] | null>(null);

  const data: Pt[] = useMemo(
    () => timeline.map((p) => ({ ...p, d: new Date(p.date + "T00:00:00Z"), totalAll: p.total + p.ipv6_total })),
    [timeline],
  );

  // resize
  useEffect(() => {
    const node = ref.current?.parentElement;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        setSize({ w, h: Math.max(380, Math.min(520, w * 0.36)) });
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = select(ref.current!);
    svg.selectAll("*").remove();
    if (!data.length) return;

    const { w, h } = size;
    const innerW = w - margin.left - margin.right;
    const innerH = h - margin.top - margin.bottom;

    const x = scaleTime()
      .domain(zoom ?? (extent(data, (d) => d.d) as [Date, Date]))
      .range([0, innerW]);
    const y = scaleLinear()
      .domain([0, (max(data, (d) => d.totalAll) ?? 0) * 1.06])
      .range([innerH, 0])
      .nice();

    const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // gradient defs
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "tl-area").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#FF9900").attr("stop-opacity", 0.45);
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#FF9900").attr("stop-opacity", 0.02);

    // grid
    root
      .append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(y.ticks(6))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d));

    const ar = area<Pt>()
      .x((d) => x(d.d))
      .y0(innerH)
      .y1((d) => y(d.totalAll))
      .curve(curveMonotoneX);
    const ln = line<Pt>()
      .x((d) => x(d.d))
      .y((d) => y(d.totalAll))
      .curve(curveMonotoneX);

    root.append("path").datum(data).attr("d", ar).attr("fill", "url(#tl-area)");
    root.append("path").datum(data).attr("d", ln).attr("fill", "none").attr("stroke", "#FF9900").attr("stroke-width", 1.5);

    // event markers
    const xDomain = x.domain();
    const visEvents = events.filter((e) => {
      const d = new Date(e.date + "T00:00:00Z");
      return d >= xDomain[0] && d <= xDomain[1];
    });
    const evG = root.append("g");
    evG
      .selectAll("line")
      .data(visEvents)
      .join("line")
      .attr("x1", (e) => x(new Date(e.date + "T00:00:00Z")))
      .attr("x2", (e) => x(new Date(e.date + "T00:00:00Z")))
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", (e) => (e.new_regions.length ? "#0FB5BA" : "#FF9900"))
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2 4")
      .attr("opacity", 0.5);
    evG
      .selectAll("circle")
      .data(visEvents)
      .join("circle")
      .attr("cx", (e) => x(new Date(e.date + "T00:00:00Z")))
      .attr("cy", -8)
      .attr("r", 4)
      .attr("fill", (e) => (e.new_regions.length ? "#0FB5BA" : "#FF9900"));

    // axes
    root
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(axisBottom(x).ticks(8).tickFormat((d) => fmtTick(d as Date)) as never);
    root
      .append("g")
      .attr("class", "axis")
      .call(axisLeft(y).ticks(6).tickFormat((d) => fmt.format(d as number)) as never);

    // hover overlay
    root
      .append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .on("mousemove", function (ev: MouseEvent) {
        // offsetX is relative to the rect itself (which lives inside the translated <g>),
        // so it maps directly into the scale domain without margin subtraction.
        const mx = ev.offsetX;
        const xd = x.invert(mx);
        let nearest = data[0]!;
        let bestDelta = Infinity;
        for (const p of data) {
          const dt = Math.abs(p.d.getTime() - xd.getTime());
          if (dt < bestDelta) {
            bestDelta = dt;
            nearest = p;
          }
        }
        setHover({ pt: nearest, x: x(nearest.d) + margin.left, y: y(nearest.totalAll) + margin.top });
      })
      .on("mouseleave", () => setHover(null));

    // hover crosshair — id'd so the hover effect can update without rebuilding the chart
    const focus = root.append("g").attr("class", "focus").style("display", "none");
    focus.append("circle").attr("r", 5).attr("fill", "#FF9900").attr("stroke", "#0B0F14").attr("stroke-width", 2);

    // brush
    const brushG = root.append("g").attr("class", "brush");
    const br = brushX<unknown>()
      .extent([
        [0, 0],
        [innerW, innerH],
      ])
      .on("end", (ev: D3BrushEvent<unknown>) => {
        if (!ev.selection) {
          setZoom(null);
          return;
        }
        const [x0, x1] = ev.selection as [number, number];
        if (Math.abs(x1 - x0) < 12) {
          setZoom(null);
          return;
        }
        setZoom([x.invert(x0), x.invert(x1)]);
        brushG.call(br.move, null);
      });
    brushG.call(br as never);
    brushG.selectAll(".overlay").attr("cursor", "crosshair");
    brushG.selectAll(".selection").attr("fill", "#FF9900").attr("fill-opacity", 0.08).attr("stroke", "#FF9900").attr("stroke-opacity", 0.5);

    // expose scales on the SVG node so the hover-update effect can reuse them
    (ref.current as unknown as { __x?: typeof x; __y?: typeof y }).__x = x;
    (ref.current as unknown as { __x?: typeof x; __y?: typeof y }).__y = y;
  }, [data, events, size, zoom]);

  // separate hover-only effect — does NOT rebuild the chart
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const focus = select(svg).select<SVGGElement>("g.focus");
    if (focus.empty()) return;
    type Sx = (d: Date) => number;
    type Sy = (n: number) => number;
    const x = (svg as unknown as { __x?: Sx }).__x;
    const y = (svg as unknown as { __y?: Sy }).__y;
    if (!x || !y) return;
    if (hover) {
      focus.style("display", null).attr("transform", `translate(${margin.left + x(hover.pt.d)},${margin.top + y(hover.pt.totalAll)})`);
    } else {
      focus.style("display", "none");
    }
  }, [hover]);

  return (
    <section id="timeline" className="container-x pb-16 md:pb-24">
      <header className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="h-eyebrow mb-2">Section 02 · the long timeline</p>
          <h2 className="h-section">Every commit, every prefix, since {fmtDate(timeline[0]?.date ?? "")}.</h2>
        </div>
        {zoom && (
          <button onClick={() => setZoom(null)} className="pill hover:text-ink-900 transition">
            ✕ reset zoom
          </button>
        )}
      </header>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="card p-4 md:p-6 relative"
      >
        <p className="text-xs text-ink-600 mb-2 font-mono">
          {timeline.length} commits · {events.length} flagged events · drag to zoom
        </p>
        <svg ref={ref} className="chart w-full" width={size.w} height={size.h} />

        {hover && (
          <div
            className="pointer-events-none absolute card px-3 py-2 text-xs text-ink-900 shadow-2xl"
            style={{ left: Math.min(size.w - 200, Math.max(0, hover.x + 10)), top: Math.max(0, hover.y - 60) }}
          >
            <div className="font-mono text-accent-500">{fmtDate(hover.pt.date)}</div>
            <div className="num-display text-base mt-0.5">{fmt.format(hover.pt.totalAll)}</div>
            <div className="text-ink-600 mt-1">
              IPv4 {fmt.format(hover.pt.total)} · IPv6 {fmt.format(hover.pt.ipv6_total)}
            </div>
            <div className="text-ink-600">
              {hover.pt.region_count} regions · {hover.pt.service_count} services
            </div>
            {hover.pt.is_major && <div className="mt-1 text-accent-500">⚡ major event · {fmt.format(hover.pt.diff_size)} lines</div>}
          </div>
        )}
      </motion.div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-600">
        <span className="pill">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          major event (≥1,500 lines)
        </span>
        <span className="pill">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          new region launch
        </span>
      </div>
    </section>
  );
}
