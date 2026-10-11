import { formatDurationWords } from "@/lib/youtube/duration";
import { Provenance } from "@/components/shared/Provenance";
import { cn } from "@/lib/utils";
import type { TrendCluster } from "@/lib/types";

export function TrendRecommendation({ cluster }: { cluster: TrendCluster }) {
  const r = cluster.ai.recommendation;
  const rows: { k: string; v: string; kind: "recommendation" | "calculated" | "ai" }[] = [
    { k: "Why now", v: r.reason, kind: "ai" },
    { k: "Format", v: r.format, kind: "recommendation" },
    {
      k: "Suggested length",
      v: cluster.suggestedLengthSeconds ? `~${Math.round(cluster.suggestedLengthSeconds / 60)} min (cluster average ${formatDurationWords(cluster.metrics.avgDurationSeconds)})` : "Not enough duration data",
      kind: "calculated",
    },
    { k: "Confidence", v: `${cluster.confidence} — ${cluster.confidenceReason}`, kind: "calculated" },
  ];
  return (
    <div className="flex flex-col gap-6 border border-signal/50 bg-signal-dim/40 p-5 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span className="micro text-signal">What I would make</span>
        <Provenance kind="recommendation" />
        {!r.shouldCover && <span className="micro border border-cool px-2 py-0.5 text-cool">Analyst says: optional — weaker fit</span>}
      </div>
      <div className="flex flex-col gap-2">
        <span className="micro text-fg-3">Possible title</span>
        <p className="font-serif text-3xl leading-tight md:text-5xl">&ldquo;{r.possibleTitle}&rdquo;</p>
      </div>
      <p className="text-lg text-fg-2">{r.angle}</p>
      <dl className="grid gap-px border border-line bg-line md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.k} className="flex flex-col gap-1.5 bg-bg p-4">
            <dt className="micro flex items-center gap-2 text-fg-3">
              {row.k} <Provenance kind={row.kind} />
            </dt>
            <dd className={cn("text-sm leading-relaxed", row.k === "Format" ? "text-xl font-bold" : "text-fg-2")}>{row.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
