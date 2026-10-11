import { compact } from "@/lib/format";
import { Provenance } from "@/components/shared/Provenance";
import type { FormatShare } from "@/lib/types";

/** Percentages are only shown when at least 3 videos were classified; otherwise counts only. */
export function FormatBreakdown({ formats }: { formats: FormatShare[] }) {
  const classified = formats.reduce((a, f) => a + f.count, 0);
  const showPct = classified >= 3;
  if (!formats.length) return <p className="text-sm text-fg-3">No format classifications for this cluster.</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Provenance kind="ai" />
        <span className="micro text-fg-3">labels per video</span>
        <Provenance kind="calculated" />
        <span className="micro text-fg-3">shares + views/hour</span>
      </div>
      <ul className="flex flex-col gap-3">
        {formats.map((f) => (
          <li key={f.format} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 md:grid-cols-[140px_1fr_140px]">
            <span className="text-sm font-medium">{f.format}</span>
            <span className="relative h-2 bg-bg-3" aria-hidden>
              <span data-bar className="absolute inset-y-0 left-0 bg-signal" style={{ width: `${Math.max(4, f.share * 100)}%` }} />
            </span>
            <span className="micro tabular text-right text-fg-2">
              {showPct ? `${Math.round(f.share * 100)}%` : `${f.count} video${f.count > 1 ? "s" : ""}`}
              <span className="hidden text-fg-3 md:inline"> · {compact(f.avgViewsPerHour)}/h</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-fg-3">
        {classified} video{classified === 1 ? "" : "s"} classified.{!showPct && " Too few to show percentages."}
      </p>
    </div>
  );
}
