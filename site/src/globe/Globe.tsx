import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule10 } from "d3-geo";
import { drag, type D3DragEvent } from "d3-drag";
import { select } from "d3-selection";
import { scaleSqrt } from "d3-scale";
import { feature } from "topojson-client";
import type { GeometryObject, Topology } from "topojson-specification";
import { REGION_COORDS, getGroup } from "./region-coords";
import { fmt } from "../lib/format";

interface RegionDot {
  region: string;
  count: number;
  lng: number;
  lat: number;
  group: ReturnType<typeof getGroup>;
}

interface Props {
  regions: Array<{ region: string; count: number }>;
  selected: string | null;
  onSelect: (region: string | null) => void;
}

const GROUP_COLORS: Record<ReturnType<typeof getGroup>, string> = {
  Commercial: "#FF9900",
  GovCloud: "#22D3D9",
  China: "#FFCD80",
  Sovereign: "#A78BFA",
  Global: "#0FB5BA",
};

interface RotationTarget {
  lambda: number;
  phi: number;
}

export function Globe({ regions, selected, onSelect }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 760, h: 760 });
  const [topology, setTopology] = useState<Topology | null>(null);
  const [topologyErr, setTopologyErr] = useState<string | null>(null);
  const [rotation, setRotation] = useState<[number, number]>([20, -10]);
  const [hover, setHover] = useState<{ region: string; x: number; y: number } | null>(null);

  const dots = useMemo<RegionDot[]>(
    () =>
      regions
        .map((r) => {
          const coord = REGION_COORDS[r.region];
          if (!coord) return null;
          return { region: r.region, count: r.count, lng: coord[0], lat: coord[1], group: getGroup(r.region) };
        })
        .filter((d): d is RegionDot => d !== null),
    [regions],
  );

  const scale = useMemo(() => {
    const max = dots.reduce((m, d) => Math.max(m, d.count), 1);
    return scaleSqrt().domain([0, max]).range([2.5, 12]);
  }, [dots]);

  // Resize observer — keep the globe square and centred
  useEffect(() => {
    const node = ref.current?.parentElement;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.min(e.contentRect.width, 760);
        setSize({ w, h: w });
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Load topology once
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}world-land-110m.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`world topology load failed: ${r.status}`);
        return r.json();
      })
      .then((t: Topology) => setTopology(t))
      .catch((e) => setTopologyErr((e as Error).message));
  }, []);

  // Auto-rotate to selected region
  useEffect(() => {
    if (!selected) return;
    const c = REGION_COORDS[selected];
    if (!c) return;
    const target: RotationTarget = { lambda: -c[0], phi: -c[1] };
    let raf = 0;
    const start = performance.now();
    const dur = 700;
    const [l0, p0] = rotation;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const lambda = l0 + (target.lambda - l0) * eased;
      const phi = p0 + (target.phi - p0) * eased;
      setRotation([lambda, phi]);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // intentionally not depending on `rotation` — we use it as a starting snapshot
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Build the projection / path
  const { path, projection } = useMemo(() => {
    const projection = geoOrthographic()
      .scale(size.w / 2 - 12)
      .translate([size.w / 2, size.h / 2])
      .clipAngle(90)
      .rotate([rotation[0], rotation[1]]);
    const path = geoPath(projection);
    return { path, projection };
  }, [size, rotation]);

  // Drag-to-rotate. Accumulate per-event pointer deltas (`ev.dx` / `ev.dy`) onto
  // the previous rotation via the functional setState — using the absolute
  // `ev.x` / `ev.y` (drag-container coordinates) jumps the globe at drag-start
  // because those are positions, not movements (codex P1 on PR #5). Effect
  // binds once and reads no closure state, so drag stays smooth across renders.
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const sensitivity = 0.4;
    const dragBehavior = drag<SVGSVGElement, unknown>()
      .on("drag", function (ev: D3DragEvent<SVGSVGElement, unknown, unknown>) {
        setRotation((prev) => [
          prev[0] + ev.dx * sensitivity,
          Math.max(-90, Math.min(90, prev[1] - ev.dy * sensitivity)),
        ]);
      });
    select(svg).call(dragBehavior as never);
    return () => {
      select(svg).on(".drag", null);
    };
  }, []);

  // Compute land + graticule paths
  const landPath = useMemo(() => {
    if (!topology) return null;
    const obj = topology.objects.land as GeometryObject;
    const land = feature(topology, obj) as unknown as GeoJSON.Feature;
    return path(land) ?? "";
  }, [topology, path]);

  const graticulePath = useMemo(() => path(geoGraticule10()) ?? "", [path]);
  const spherePath = useMemo(() => path({ type: "Sphere" }) ?? "", [path]);
  const haloRadius = (size.w / 2) - 12;

  // Determine visible side of globe for each pin: with clipAngle(90) the projection
  // returns null for points on the far hemisphere, so a successful projection IS the
  // visibility check.

  return (
    <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
      {topologyErr && (
        <div className="absolute inset-0 flex items-center justify-center text-ink-600 text-sm">
          {topologyErr}
        </div>
      )}
      <svg
        ref={ref}
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        className="cursor-grab active:cursor-grabbing select-none touch-none"
        style={{ display: "block", margin: "0 auto" }}
      >
        <defs>
          <radialGradient id="globe-shade" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#0F141A" stopOpacity={0.0} />
            <stop offset="70%" stopColor="#0B0F14" stopOpacity={0.65} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.95} />
          </radialGradient>
          <radialGradient id="globe-halo" cx="50%" cy="50%" r="50%">
            <stop offset="92%" stopColor="#FF9900" stopOpacity={0} />
            <stop offset="100%" stopColor="#FF9900" stopOpacity={0.18} />
          </radialGradient>
          <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* halo */}
        <circle cx={size.w / 2} cy={size.h / 2} r={haloRadius + 8} fill="url(#globe-halo)" />

        {/* sphere fill */}
        <path d={spherePath} fill="#0F141A" stroke="rgba(58,70,84,0.5)" strokeWidth={1} />

        {/* graticule */}
        <path d={graticulePath} fill="none" stroke="rgba(58,70,84,0.35)" strokeWidth={0.5} />

        {/* land */}
        {landPath && <path d={landPath} fill="#1E2733" stroke="rgba(15,181,186,0.35)" strokeWidth={0.5} />}

        {/* spherical shade overlay */}
        <path d={spherePath} fill="url(#globe-shade)" pointerEvents="none" />

        {/* region dots */}
        <g>
          {dots.map((d) => {
            const projected = projection([d.lng, d.lat]);
            if (!projected) return null; // far hemisphere — clipped by clipAngle(90)
            const [px, py] = projected;
            const r = scale(d.count);
            const sel = selected === d.region;
            const color = GROUP_COLORS[d.group];
            return (
              <g
                key={d.region}
                transform={`translate(${px},${py})`}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => setHover({ region: d.region, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(sel ? null : d.region)}
              >
                <circle r={r * 1.6} fill={color} opacity={sel ? 0.3 : 0.18} filter="url(#dot-glow)" />
                <circle r={r} fill={color} opacity={0.95} stroke="#0B0F14" strokeWidth={sel ? 2 : 1} />
                {sel && (
                  <>
                    <circle r={r + 6} fill="none" stroke={color} strokeWidth={1.2} opacity={0.6}>
                      <animate attributeName="r" values={`${r + 4};${r + 14};${r + 4}`} dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {hover && (() => {
        const dot = dots.find((d) => d.region === hover.region);
        if (!dot) return null;
        const [px, py] = projection([dot.lng, dot.lat]) ?? [0, 0];
        return (
          <div
            className="pointer-events-none absolute card px-3 py-2 text-xs shadow-2xl"
            style={{
              left: Math.min(size.w - 200, Math.max(0, px + 14)),
              top: Math.max(0, py - 36),
            }}
          >
            <div className="font-mono text-accent-500">{dot.region}</div>
            <div className="num-display text-base mt-0.5 text-ink-900">{fmt.format(dot.count)}</div>
            <div className="text-ink-600">prefixes · {dot.group.toLowerCase()}</div>
          </div>
        );
      })()}
    </div>
  );
}
