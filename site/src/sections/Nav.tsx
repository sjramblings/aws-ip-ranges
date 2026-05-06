import { useEffect, useState } from "react";

const sections = [
  { id: "hero", label: "Top" },
  { id: "timeline", label: "Timeline" },
  { id: "regions", label: "Regions" },
  { id: "services", label: "Services" },
  { id: "compliance", label: "Compliance" },
  { id: "activity", label: "Activity" },
  { id: "explorer", label: "Explorer" },
  { id: "story", label: "Stories" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? "border-b border-ink-300/30 bg-ink-0/80 backdrop-blur" : ""}`}>
      <div className="container-x flex items-center justify-between py-4">
        <a href="#hero" className="flex items-center gap-2.5 font-mono text-sm tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-accent-500 animate-pulse" />
          <span className="text-ink-900">aws-ip-ranges</span>
          <span className="text-ink-500">/</span>
          <span className="text-ink-600">visualized</span>
        </a>
        <nav className="hidden md:flex items-center gap-1">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full px-3 py-1.5 text-xs text-ink-600 hover:text-ink-900 hover:bg-ink-200/40 transition"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <a
          href="https://github.com/sjramblings/aws-ip-ranges"
          target="_blank"
          rel="noreferrer"
          className="pill hover:text-ink-900 transition"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
            <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.4c-2.22.48-2.7-1.06-2.7-1.06-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82A7.6 7.6 0 0 1 8 4.5c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          <span>Source</span>
        </a>
      </div>
    </header>
  );
}
