import { useEffect, useState } from "react";
import type { CurrentSnapshot, DataEvent, RegionSeries, ServiceSeries, TimelinePoint } from "./types";
import { loadCurrent, loadEvents, loadRegions, loadServices, loadTimeline } from "./lib/data";
import { Hero } from "./sections/Hero";
import { Timeline } from "./sections/Timeline";
import { RegionAtlas } from "./sections/RegionAtlas";
import { ServiceComposition } from "./sections/ServiceComposition";
import { ComplianceLens } from "./sections/ComplianceLens";
import { ActivityCalendar } from "./sections/ActivityCalendar";
import { PrefixExplorer } from "./sections/PrefixExplorer";
import { StoryCards } from "./sections/StoryCards";
import { Footer } from "./sections/Footer";
import { Nav } from "./sections/Nav";

interface Bundle {
  current: CurrentSnapshot;
  timeline: TimelinePoint[];
  regions: RegionSeries;
  services: ServiceSeries;
  events: DataEvent[];
}

export function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadCurrent(), loadTimeline(), loadRegions(), loadServices(), loadEvents()])
      .then(([current, timeline, regions, services, events]) => setBundle({ current, timeline, regions, services, events }))
      .catch((e) => setErr((e as Error).message));
  }, []);

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

  if (!bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-700">
          <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse" />
          <span className="font-mono text-sm">loading data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <Hero current={bundle.current} timeline={bundle.timeline} />
      <Timeline timeline={bundle.timeline} events={bundle.events} />
      <RegionAtlas regions={bundle.regions} current={bundle.current} />
      <ServiceComposition services={bundle.services} current={bundle.current} />
      <ComplianceLens regions={bundle.regions} timeline={bundle.timeline} />
      <ActivityCalendar timeline={bundle.timeline} />
      <PrefixExplorer current={bundle.current} />
      <StoryCards events={bundle.events} current={bundle.current} timeline={bundle.timeline} />
      <Footer current={bundle.current} />
    </div>
  );
}
