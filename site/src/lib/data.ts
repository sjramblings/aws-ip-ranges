import type { CurrentSnapshot, DataEvent, RegionSeries, ServiceSeries, TimelinePoint } from "../types";

const BASE = `${import.meta.env.BASE_URL}data/`;

async function fetchJson<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}${name}`);
  if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const loadTimeline = () => fetchJson<TimelinePoint[]>("timeline.json");
export const loadRegions = () => fetchJson<RegionSeries>("regions.json");
export const loadServices = () => fetchJson<ServiceSeries>("services.json");
export const loadEvents = () => fetchJson<DataEvent[]>("events.json");
export const loadCurrent = () => fetchJson<CurrentSnapshot>("current.json");
