export interface TimelinePoint {
  date: string;
  sha: string;
  total: number;
  ipv6_total: number;
  region_count: number;
  service_count: number;
  diff_size: number;
  is_major: boolean;
}

export interface RegionSeries {
  [region: string]: Array<{ date: string; count: number }>;
}

export interface ServiceSeries {
  [service: string]: Array<{ date: string; count: number }>;
}

export interface DataEvent {
  date: string;
  sha: string;
  diff_size: number;
  total: number;
  delta: number;
  new_regions: string[];
  new_services: string[];
  narrative: string;
}

export interface Prefix {
  ip_prefix?: string;
  ipv6_prefix?: string;
  region: string;
  service: string;
  network_border_group?: string;
}

export interface CurrentSnapshot {
  date: string;
  sha: string;
  total: number;
  ipv6_total: number;
  region_count: number;
  service_count: number;
  sync_token: string;
  create_date: string;
  prefixes: Prefix[];
  ipv6_prefixes: Prefix[];
  top_services: Array<{ service: string; count: number }>;
  regions: Array<{ region: string; count: number }>;
}
