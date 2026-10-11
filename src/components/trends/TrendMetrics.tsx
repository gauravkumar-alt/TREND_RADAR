import { TrendingDown, TrendingUp, Minus, Hourglass } from "lucide-react";
import { compact, pct, signedPct } from "@/lib/format";
import { formatDurationWords } from "@/lib/youtube/duration";
import { Provenance } from "@/components/shared/Provenance";
import { cn } from "@/lib/utils";
import type { MomentumLabel, TrendCluster } from "@/lib/types";

export function MomentumBadge({ momentum, className }: { momentum: MomentumLabel; className?: string }) {
  const map = {
    RISING: { icon: TrendingUp, cls: "border-signal text-signal" },
    STABLE: { icon: Minus, cls: "border-fg-2 text-fg-2" },
    COOLING: { icon: TrendingDown, cls: "border-cool text-cool" },
    "BUILDING BASELINE": { icon: Hourglass, cls: "border-fg-3 text-fg-3" },
  }[momentum];
  const Icon = map.icon;
  return (
    <span className={cn("micro inline-flex h-6 items-center gap-1.5 border px-2", map.cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {momentum}
    </span>
  );
}

export function momentumExplainer(c: TrendCluster): string {
  const m = c.metrics;
  const coverage =
    m.coverageGrowth == null
      ? "Too few uploads to compare the two halves of the window."
      : `Uploads in the newer half of the window are ${signedPct(m.coverageGrowth)} vs the older half.`;
  const history =
    m.videosWithHistory >= 2
      ? `${m.videosWithHistory} videos have stored snapshots, so view velocity is measured, not estimated.`
      : "View velocity history is still building a baseline: it needs a second daily snapshot of these videos.";
  return `${coverage} ${history}`;
}

/** Compact row of the calculated metrics for a cluster. */
export function TrendMetrics({ cluster, className }: { cluster: TrendCluster; className?: string }) {
  const m = cluster.metrics;
  // [label, text, raw value for the count-up, count format]
  const items: [string, string, number | null, string][] = [
    ["Trend score", String(cluster.score), cluster.score, "int"],
    ["Creators", String(m.creatorCount), m.creatorCount, "int"],
    ["Videos", String(m.videoCount), m.videoCount, "int"],
    ["Avg views", compact(m.avgViews), m.avgViews, "compact"],
    ["Avg duration", formatDurationWords(m.avgDurationSeconds), m.avgDurationSeconds, "duration"],
    ["Engagement", pct(m.avgEngagementRate, 1), m.avgEngagementRate, "pct1"],
  ];
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Provenance kind="calculated" />
        <span className="micro text-fg-3">from {m.videoCount} live videos</span>
      </div>
      <dl className="grid grid-cols-3 gap-px border border-line bg-line md:grid-cols-6">
        {items.map(([k, v, raw, fmt]) => (
          <div key={k} data-topic-metric className="flex flex-col gap-1 bg-bg p-3 md:p-4">
            <dt className="micro text-fg-3">{k}</dt>
            <dd {...(raw != null ? { "data-count": raw, "data-fmt": fmt } : {})} className={cn("tabular text-xl font-bold md:text-2xl", k === "Trend score" && "text-signal")}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
