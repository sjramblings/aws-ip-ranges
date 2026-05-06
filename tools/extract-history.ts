#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ─── paths ────────────────────────────────────────────────────────────────
const REPO_ROOT = resolve(import.meta.dir, "..");
const DATA_OUT = resolve(REPO_ROOT, "site/public/data");
const CACHE_FILE = resolve(REPO_ROOT, "data/.cache/last-extracted-sha");
const TARGET_PATH = "ip-ranges.json";
const MAJOR_DIFF_THRESHOLD = 1500;
const CONCURRENCY = 4;

// ─── types ────────────────────────────────────────────────────────────────
interface Prefix { ip_prefix?: string; ipv6_prefix?: string; region: string; service: string; network_border_group?: string }
interface IpRanges { syncToken: string; createDate: string; prefixes: Prefix[]; ipv6_prefixes: Prefix[] }
interface CommitMeta { sha: string; date: string; timestamp: number }
interface JqOut { total: number; ipv6_total: number; per_region: Record<string, number>; per_service: Record<string, number> }
interface Snapshot extends JqOut {
  date: string; sha: string; region_count: number; service_count: number; diff_size: number; is_major: boolean;
}
interface Event {
  date: string; sha: string; diff_size: number; total: number; delta: number;
  new_regions: string[]; new_services: string[]; narrative: string;
}

// ─── shell helper ─────────────────────────────────────────────────────────
function exec(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<string> {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(cmd, args, { cwd: opts.cwd ?? REPO_ROOT });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => (stdout += b.toString()));
    child.stderr.on("data", (b) => (stderr += b.toString()));
    child.on("error", rejectP);
    child.on("close", (code) => {
      if (code !== 0) rejectP(new Error(`${cmd} ${args.join(" ")} exited ${code}: ${stderr.slice(0, 200)}`));
      else resolveP(stdout);
    });
  });
}

// Pipeline: `git show <sha>:ip-ranges.json | jq -c '<aggregator>'` — run via /bin/sh so the
// shell handles the pipe buffering (Node's pipe() under heavy concurrency can EPIPE).
function execPipeline(gitSha: string): Promise<string> {
  return new Promise((resolveP, rejectP) => {
    const cmd = `git -C "${REPO_ROOT}" show "${gitSha}:${TARGET_PATH}" | jq -c '${JQ_AGGREGATOR.replace(/'/g, "'\\''")}'`;
    const child = spawn("/bin/sh", ["-c", cmd]);
    let out = "";
    let err = "";
    child.stdout.on("data", (b) => (out += b.toString()));
    child.stderr.on("data", (b) => (err += b.toString()));
    child.on("error", rejectP);
    child.on("close", (code) => {
      if (code !== 0) rejectP(new Error(`pipeline exited ${code}: ${err.slice(0, 200)}`));
      else resolveP(out);
    });
  });
}

const JQ_AGGREGATOR = `{
  total: (.prefixes | length),
  ipv6_total: (.ipv6_prefixes | length),
  per_region: (
    [(.prefixes // [])[], (.ipv6_prefixes // [])[]]
    | group_by(.region)
    | map({key: .[0].region, value: length})
    | from_entries
  ),
  per_service: (
    [(.prefixes // [])[], (.ipv6_prefixes // [])[]]
    | group_by(.service)
    | map({key: .[0].service, value: length})
    | from_entries
  )
}`;

async function getCommits(sinceSha?: string): Promise<CommitMeta[]> {
  const range = sinceSha ? `${sinceSha}..HEAD` : "HEAD";
  const out = await exec("git", ["-C", REPO_ROOT, "log", "--reverse", "--pretty=format:%H%x09%ct", range, "--", TARGET_PATH]);
  return out.trim().split("\n").filter(Boolean).map((line) => {
    const [sha, ts] = line.split("\t");
    if (!sha || !ts) throw new Error(`bad git log line: ${line}`);
    const timestamp = Number(ts);
    return { sha, timestamp, date: new Date(timestamp * 1000).toISOString().slice(0, 10) };
  });
}

async function getDiffSize(sha: string): Promise<number> {
  const out = await exec("git", ["-C", REPO_ROOT, "show", "--shortstat", "--format=", sha, "--", TARGET_PATH]);
  let total = 0;
  for (const m of out.matchAll(/(\d+) (insertion|deletion)/g)) total += Number(m[1]);
  return total;
}

async function processCommit(c: CommitMeta): Promise<Snapshot | null> {
  try {
    const [jqText, diff_size] = await Promise.all([execPipeline(c.sha), getDiffSize(c.sha)]);
    const jq = JSON.parse(jqText) as JqOut;
    return {
      date: c.date, sha: c.sha, diff_size,
      is_major: diff_size >= MAJOR_DIFF_THRESHOLD,
      total: jq.total, ipv6_total: jq.ipv6_total,
      per_region: jq.per_region, per_service: jq.per_service,
      region_count: Object.keys(jq.per_region).length,
      service_count: Object.keys(jq.per_service).length,
    };
  } catch (e) {
    console.warn(`  ! ${c.sha.slice(0, 7)}: ${(e as Error).message.slice(0, 100)}`);
    return null;
  }
}

async function processInBatches<T, U>(items: T[], fn: (t: T) => Promise<U>, n: number): Promise<U[]> {
  const out: U[] = [];
  for (let i = 0; i < items.length; i += n) {
    const batch = items.slice(i, i + n);
    const results = await Promise.all(batch.map(fn));
    out.push(...results);
    if (i % (n * 10) === 0 || i + n >= items.length) {
      const pct = Math.min(100, Math.round(((i + n) / items.length) * 100));
      console.log(`  progress: ${Math.min(i + n, items.length)}/${items.length} (${pct}%)`);
    }
  }
  return out;
}

function buildNarrative(s: Snapshot, prev: Snapshot | undefined, newRegions: string[], newServices: string[]): string {
  const parts: string[] = [];
  parts.push(`${s.diff_size.toLocaleString()} lines changed`);
  if (prev) {
    const delta = s.total + s.ipv6_total - (prev.total + prev.ipv6_total);
    if (delta > 0) parts.push(`+${delta} prefixes`);
    else if (delta < 0) parts.push(`${delta} prefixes`);
  }
  if (newRegions.length) parts.push(`new region${newRegions.length > 1 ? "s" : ""}: ${newRegions.join(", ")}`);
  if (newServices.length) parts.push(`new service${newServices.length > 1 ? "s" : ""}: ${newServices.join(", ")}`);
  return parts.join(" · ");
}

async function ensureDir(file: string) { await mkdir(dirname(file), { recursive: true }); }

// ─── main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 extract-history starting…");
  const cachedSha = existsSync(CACHE_FILE) ? (await readFile(CACHE_FILE, "utf8")).trim() : undefined;
  const commits = await getCommits(cachedSha);
  console.log(`  ${commits.length} commits to process${cachedSha ? ` (incremental from ${cachedSha.slice(0, 7)})` : " (full history)"}`);
  if (!commits.length && !cachedSha) throw new Error(`No commits found touching ${TARGET_PATH}`);

  let priorSnapshots: Snapshot[] = [];
  const priorTimelinePath = resolve(REPO_ROOT, "data/.cache/snapshots-cache.json");
  if (cachedSha && existsSync(priorTimelinePath)) {
    priorSnapshots = JSON.parse(await readFile(priorTimelinePath, "utf8"));
  }

  console.log(`📦 reading commits with concurrency=${CONCURRENCY}…`);
  const newSnapshots = (await processInBatches(commits, processCommit, CONCURRENCY)).filter((x): x is Snapshot => x !== null);
  const allSnapshots = [...priorSnapshots, ...newSnapshots].sort((a, b) => a.date.localeCompare(b.date));

  // Persist full snapshots cache (used for incremental rebuilds; not served to the site)
  await ensureDir(priorTimelinePath);
  await writeFile(priorTimelinePath, JSON.stringify(allSnapshots));

  // ─── timeline.json (drop heavy per_region/per_service from each row) ──
  const timeline = allSnapshots.map(({ per_region: _pr, per_service: _ps, ...rest }) => rest);
  await writeFile(resolve(DATA_OUT, "timeline.json"), JSON.stringify(timeline));
  console.log(`  ✓ timeline.json (${timeline.length} entries)`);

  // ─── regions.json ─────────────────────────────────────────────────────
  const regions: Record<string, Array<{ date: string; count: number }>> = {};
  for (const s of allSnapshots) {
    for (const [region, count] of Object.entries(s.per_region)) {
      (regions[region] ??= []).push({ date: s.date, count });
    }
  }
  await writeFile(resolve(DATA_OUT, "regions.json"), JSON.stringify(regions));
  console.log(`  ✓ regions.json (${Object.keys(regions).length} regions)`);

  // ─── services.json ────────────────────────────────────────────────────
  const services: Record<string, Array<{ date: string; count: number }>> = {};
  for (const s of allSnapshots) {
    for (const [service, count] of Object.entries(s.per_service)) {
      (services[service] ??= []).push({ date: s.date, count });
    }
  }
  await writeFile(resolve(DATA_OUT, "services.json"), JSON.stringify(services));
  console.log(`  ✓ services.json (${Object.keys(services).length} services)`);

  // ─── events.json ──────────────────────────────────────────────────────
  const events: Event[] = [];
  const seenRegions = new Set<string>();
  const seenServices = new Set<string>();
  for (let i = 0; i < allSnapshots.length; i++) {
    const s = allSnapshots[i]!;
    const prev = i > 0 ? allSnapshots[i - 1] : undefined;
    const newRegions = Object.keys(s.per_region).filter((r) => !seenRegions.has(r));
    const newServices = Object.keys(s.per_service).filter((sv) => !seenServices.has(sv));
    newRegions.forEach((r) => seenRegions.add(r));
    newServices.forEach((sv) => seenServices.add(sv));
    if (s.is_major || newRegions.length || newServices.length) {
      events.push({
        date: s.date, sha: s.sha, diff_size: s.diff_size,
        total: s.total + s.ipv6_total,
        delta: prev ? s.total + s.ipv6_total - (prev.total + prev.ipv6_total) : 0,
        new_regions: newRegions, new_services: newServices,
        narrative: buildNarrative(s, prev, newRegions, newServices),
      });
    }
  }
  await writeFile(resolve(DATA_OUT, "events.json"), JSON.stringify(events));
  console.log(`  ✓ events.json (${events.length} events flagged)`);

  // ─── current.json — re-read live ip-ranges.json for full prefix list ──
  const latest = allSnapshots[allSnapshots.length - 1];
  if (!latest) throw new Error("no snapshots produced");
  const liveText = await readFile(resolve(REPO_ROOT, TARGET_PATH), "utf8");
  const live = JSON.parse(liveText) as IpRanges;
  const current = {
    date: latest.date, sha: latest.sha,
    total: latest.total, ipv6_total: latest.ipv6_total,
    region_count: latest.region_count, service_count: latest.service_count,
    sync_token: live.syncToken, create_date: live.createDate,
    prefixes: live.prefixes, ipv6_prefixes: live.ipv6_prefixes,
    top_services: Object.entries(latest.per_service).sort(([, a], [, b]) => b - a).slice(0, 10).map(([service, count]) => ({ service, count })),
    regions: Object.entries(latest.per_region).sort(([, a], [, b]) => b - a).map(([region, count]) => ({ region, count })),
  };
  await writeFile(resolve(DATA_OUT, "current.json"), JSON.stringify(current));
  console.log(`  ✓ current.json (${current.total + current.ipv6_total} live prefixes)`);

  // ─── update cache ─────────────────────────────────────────────────────
  if (commits.length) {
    await ensureDir(CACHE_FILE);
    await writeFile(CACHE_FILE, commits[commits.length - 1]!.sha);
    console.log(`  ✓ cache updated → ${commits[commits.length - 1]!.sha.slice(0, 7)}`);
  }

  console.log("✅ done.");
}

main().catch((e) => {
  console.error("❌ extract-history failed:", e);
  process.exit(1);
});
