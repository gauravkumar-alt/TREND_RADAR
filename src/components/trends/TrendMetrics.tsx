import { TrendingDown, TrendingUp, Minus, Hourglass } from "lucide-react";
import { compact, pct, signedPct } from "@/lib/format";
import { formatDurationWords } from "@/lib/youtube/duration";
import { cn } from "@/lib/utils";
import type { MomentumLabel, TrendCluster } from "@/lib/types";

const MOMENTUM_HINT: Record<MomentumLabel, string> = {
  RISING: "More creators are posting about this lately",
  STABLE: "Steady coverage, neither growing nor fading",
  COOLING: "Fewer new uploads lately; the wave may have peaked",
  "BUILDING BASELINE": "Not enough data yet to call a direction",
};

export function MomentumBadge({ momentum, className }: { momentum: MomentumLabel; className?: string }) {
  const map = {
    RISING: { icon: TrendingUp, cls: "border-signal text-signal" },
    STABLE: { icon: Minus, cls: "border-fg-2 text-fg-2" },
    COOLING: { icon: TrendingDown, cls: "border-cool text-cool" },
    "BUILDING BASELINE": { icon: Hourglass, cls: "border-fg-3 text-fg-3" },
  }[momentum];
  const Icon = map.icon;
  return (
    <span title={MOMENTUM_HINT[momentum]} className={cn("micro inline-flex h-6 items-center gap-1.5 border px-2", map.cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {momentum}
    </span>
  );
}

/** Plain-language reading of the momentum evidence. */
export function momentumExplainer(c: TrendCluster): string {
  const m = c.metrics;
  const half = Math.max(1, Math.round(c.momentumSeries.length / 2));
  const days = `${half} day${half === 1 ? "" : "s"}`;
  let coverage: string;
  if (m.coverageGrowth == null) coverage = "Too few uploads yet to tell which way this is heading.";
  else if (Math.abs(m.coverageGrowth) < 0.1) coverage = `About as many uploads in the last ${days} as in the ${days} before.`;
  else coverage = `${m.coverageGrowth > 0 ? "More" : "Fewer"} uploads in the last ${days} than in the ${days} before (${signedPct(m.coverageGrowth)}).`;
  const history =
    m.videosWithHistory >= 2 ? "View growth is measured from daily snapshots." : "View growth will show once a few days of snapshots build up.";
  return `${coverage} ${history}`;
}

/** Row of the key numbers for a topic. */
export function TrendMetrics({ cluster, className }: { cluster: TrendCluster; className?: string }) {
  const m = cluster.metrics;
  const items: [string, string][] = [
    ["Creators", String(m.creatorCount)],
    ["Videos", String(m.videoCount)],
    ["Avg views", compact(m.avgViews)],
    ["Avg length", formatDurationWords(m.avgDurationSeconds)],
    ["Engagement", pct(m.avgEngagementRate, 1)],
  ];
  return (
    <dl className={cn("grid grid-cols-3 gap-px border border-line bg-line sm:grid-cols-5", className)}>
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1 bg-bg p-3 md:p-4">
          <dt className="micro text-fg-3">{k}</dt>
          <dd className="tabular text-lg font-bold md:text-2xl">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
