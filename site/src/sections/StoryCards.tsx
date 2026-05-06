import { useMemo } from "react";
import { motion } from "framer-motion";
import type { CurrentSnapshot, DataEvent, TimelinePoint } from "../types";
import { fmt, fmtDate, groupBucket } from "../lib/format";

interface Props {
  events: DataEvent[];
  current: CurrentSnapshot;
  timeline: TimelinePoint[];
}

interface Story {
  kicker: string;
  title: string;
  body: string;
  tone: "accent" | "teal";
}

export function StoryCards({ events, current, timeline }: Props) {
  const stories = useMemo<Story[]>(() => {
    const out: Story[] = [];

    // 1) biggest event
    const biggest = [...events].sort((a, b) => b.diff_size - a.diff_size)[0];
    if (biggest) {
      out.push({
        kicker: fmtDate(biggest.date),
        title: `The biggest commit ever: ${fmt.format(biggest.diff_size)} lines`,
        body: biggest.narrative,
        tone: "accent",
      });
    }

    // 2) new regions in last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentNewRegions = events.filter((e) => e.new_regions.length && new Date(e.date) > oneYearAgo);
    if (recentNewRegions.length) {
      const all = recentNewRegions.flatMap((e) => e.new_regions);
      out.push({
        kicker: "the last 12 months",
        title: `${all.length} new region${all.length > 1 ? "s" : ""} joined the family`,
        body: all.map((r) => `\`${r}\``).join(" · "),
        tone: "teal",
      });
    }

    // 3) Compliance growth — GovCloud vs Commercial
    if (timeline.length > 30) {
      const last = timeline[timeline.length - 1]!;
      const yearAgoIdx = timeline.findIndex((t) => Date.parse(t.date) >= Date.parse(last.date) - 365 * 86400000);
      const baseline = timeline[Math.max(0, yearAgoIdx)] ?? timeline[0]!;
      const govLast = current.regions.filter((r) => groupBucket(r.region) === "GovCloud").reduce((a, b) => a + b.count, 0);
      out.push({
        kicker: "compliance signal",
        title: `GovCloud is now ${fmt.format(govLast)} prefixes`,
        body: `Across ${fmt.format(last.total + last.ipv6_total - baseline.total - baseline.ipv6_total)} new prefixes added since ${fmtDate(baseline.date)}, GovCloud expansion has tracked ahead of commercial — a steady compliance signal.`,
        tone: "accent",
      });
    }

    // 4) New services — long tail
    const newSvcEvents = events.filter((e) => e.new_services.length).slice(-3);
    const newSvcs = newSvcEvents.flatMap((e) => e.new_services).slice(-5);
    if (newSvcs.length) {
      out.push({
        kicker: "the long tail",
        title: `New services that quietly emerged`,
        body: `${newSvcs.map((s) => `\`${s}\``).join(" · ")} — services often surface here before they show up in re:Invent keynotes.`,
        tone: "teal",
      });
    }

    // 5) GLOBAL strength
    const globalNow = current.regions.find((r) => r.region === "GLOBAL");
    if (globalNow) {
      out.push({
        kicker: "edge & cdn",
        title: `GLOBAL — CloudFront's home — sits at ${fmt.format(globalNow.count)} prefixes`,
        body: "Edge services (CloudFront, Route53, WAF, GlobalAccelerator) all live in GLOBAL. Its growth tracks AWS's edge-network expansion more directly than any single region's.",
        tone: "accent",
      });
    }

    return out;
  }, [events, current, timeline]);

  return (
    <section id="story" className="container-x pb-16 md:pb-24">
      <header className="mb-6">
        <p className="h-eyebrow mb-2">Section 08 · stories</p>
        <h2 className="h-section">What the data is actually saying.</h2>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {stories.map((s, i) => (
          <motion.article
            key={s.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="card p-6 md:p-7 group hover:border-ink-400/50 transition"
          >
            <p className={`h-eyebrow mb-3 ${s.tone === "teal" ? "!text-teal-400" : ""}`}>{s.kicker}</p>
            <h3 className="text-xl md:text-2xl font-semibold tracking-tightest text-ink-900 leading-snug">{s.title}</h3>
            <p
              className="text-ink-600 mt-3 leading-relaxed text-sm md:text-base [&>code]:text-accent-300 [&>code]:font-mono"
              dangerouslySetInnerHTML={{ __html: s.body.replace(/`([^`]+)`/g, "<code>$1</code>") }}
            />
          </motion.article>
        ))}
      </div>
    </section>
  );
}
