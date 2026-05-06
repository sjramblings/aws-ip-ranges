export const fmt = new Intl.NumberFormat("en-US");

export const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export const fmtDateShort = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "2-digit" });

export const fmtRelative = (iso: string) => {
  const ms = Date.now() - new Date(iso + "T00:00:00Z").getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${(days / 365).toFixed(1)} years ago`;
};

export const groupBucket = (region: string): "Commercial" | "GovCloud" | "China" | "Global" => {
  if (region === "GLOBAL") return "Global";
  if (region.startsWith("us-gov-")) return "GovCloud";
  if (region.startsWith("cn-")) return "China";
  return "Commercial";
};
