import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { CurrentSnapshot, Prefix } from "../types";
import { fmt } from "../lib/format";
import { cn } from "../lib/cn";

interface Row {
  prefix: string;
  family: "IPv4" | "IPv6";
  region: string;
  service: string;
  borderGroup: string;
}

interface Props {
  current: CurrentSnapshot;
}

const PAGE_SIZE = 25;

export function PrefixExplorer({ current }: Props) {
  const allRows = useMemo<Row[]>(() => {
    const v4 = current.prefixes.map<Row>((p: Prefix) => ({
      prefix: p.ip_prefix ?? "",
      family: "IPv4",
      region: p.region,
      service: p.service,
      borderGroup: p.network_border_group ?? "",
    }));
    const v6 = current.ipv6_prefixes.map<Row>((p: Prefix) => ({
      prefix: p.ipv6_prefix ?? "",
      family: "IPv6",
      region: p.region,
      service: p.service,
      borderGroup: p.network_border_group ?? "",
    }));
    return [...v4, ...v6];
  }, [current]);

  const allRegions = useMemo(() => Array.from(new Set(allRows.map((r) => r.region))).sort(), [allRows]);
  const allServices = useMemo(() => Array.from(new Set(allRows.map((r) => r.service))).sort(), [allRows]);

  const [search, setSearch] = useState("");
  const [region, setRegion] = useState<string>("all");
  const [service, setService] = useState<string>("all");
  const [family, setFamily] = useState<"all" | "IPv4" | "IPv6">("all");
  const [sorting, setSorting] = useState<SortingState>([]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allRows.filter((r) => {
      if (region !== "all" && r.region !== region) return false;
      if (service !== "all" && r.service !== service) return false;
      if (family !== "all" && r.family !== family) return false;
      if (q && !(r.prefix.toLowerCase().includes(q) || r.region.toLowerCase().includes(q) || r.service.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [allRows, search, region, service, family]);

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: "prefix", header: "Prefix", cell: ({ getValue }) => <span className="font-mono text-ink-900">{getValue<string>()}</span> },
      {
        accessorKey: "family",
        header: "Family",
        cell: ({ getValue }) => {
          const v = getValue<string>();
          return <span className={cn("pill !py-0.5 !px-2 text-[10px]", v === "IPv4" ? "border-accent-500/40 text-accent-300" : "border-teal-500/40 text-teal-400")}>{v}</span>;
        },
      },
      { accessorKey: "region", header: "Region", cell: ({ getValue }) => <span className="font-mono text-xs text-ink-700">{getValue<string>()}</span> },
      { accessorKey: "service", header: "Service", cell: ({ getValue }) => <span className="font-mono text-xs text-ink-700">{getValue<string>()}</span> },
      { accessorKey: "borderGroup", header: "Border Group", cell: ({ getValue }) => <span className="font-mono text-xs text-ink-600">{getValue<string>()}</span> },
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  const exportCsv = () => {
    const rows = ["prefix,family,region,service,network_border_group", ...filtered.map((r) => [r.prefix, r.family, r.region, r.service, r.borderGroup].join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aws-ip-prefixes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="explorer" className="container-x pb-16 md:pb-24">
      <header className="mb-6">
        <p className="h-eyebrow mb-2">Section 07 · prefix explorer</p>
        <h2 className="h-section">Every IP prefix, today.</h2>
        <p className="text-ink-600 mt-2 max-w-2xl">
          {fmt.format(allRows.length)} prefixes from the live snapshot. Filter, sort, export.
        </p>
      </header>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="card p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="search"
            placeholder="search prefix · region · service"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-full bg-ink-100/30 border border-ink-300/30 px-4 py-2 text-sm text-ink-900 placeholder-ink-500 focus:outline-none focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 transition font-mono"
          />
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-full bg-ink-100/30 border border-ink-300/30 px-3 py-2 text-xs font-mono text-ink-700">
            <option value="all">all regions</option>
            {allRegions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select value={service} onChange={(e) => setService(e.target.value)} className="rounded-full bg-ink-100/30 border border-ink-300/30 px-3 py-2 text-xs font-mono text-ink-700">
            <option value="all">all services</option>
            {allServices.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-full border border-ink-300/30 bg-ink-100/30 p-0.5">
            {(["all", "IPv4", "IPv6"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFamily(f)}
                className={cn("rounded-full px-3 py-1 text-xs font-mono transition", family === f ? "bg-accent-500/15 text-accent-300" : "text-ink-600 hover:text-ink-900")}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            className="ml-auto pill hover:text-ink-900 transition"
          >
            ↓ export CSV
          </button>
        </div>

        <p className="text-xs text-ink-600 font-mono mb-3">
          showing {fmt.format(filtered.length)} of {fmt.format(allRows.length)}
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-ink-300/30">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className="text-left text-[10px] font-mono uppercase tracking-[0.18em] text-ink-600 py-2 px-3 cursor-pointer select-none hover:text-ink-900"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <span className="ml-1 text-accent-500">
                        {{ asc: "↑", desc: "↓" }[h.column.getIsSorted() as string] ?? ""}
                      </span>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr key={row.id} className={cn("border-b border-ink-300/15 hover:bg-ink-100/40 transition", i % 2 === 1 && "bg-ink-100/15")}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-2 px-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-ink-600 font-mono">
          <span>
            page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="pill disabled:opacity-30 hover:text-ink-900">← prev</button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="pill disabled:opacity-30 hover:text-ink-900">next →</button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
