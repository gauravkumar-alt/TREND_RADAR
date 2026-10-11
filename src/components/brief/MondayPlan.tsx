import { Provenance } from "@/components/shared/Provenance";
import type { Brief, RadarRun } from "@/lib/types";

export function MondayPlan({ brief, run }: { brief: Brief; run: RadarRun }) {
  const p = brief.content.mondayPlan;
  const c = run.clusters.find((x) => x.id === p.clusterId);
  const rows: [string, string][] = [
    ["Film this", p.film],
    ["Format", p.format],
    ["Angle", p.angle],
    ["Title", `“${p.title}”`],
    ["Why", p.why],
  ];
  return (
    <section className="bg-signal text-signal-ink" aria-labelledby="monday-title">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 py-20 md:px-8 md:py-28">
        <div data-reveal className="flex flex-wrap items-center gap-3">
          <span className="micro">Final answer</span>
          <Provenance kind="recommendation" className="border-signal-ink bg-signal-ink text-signal" />
        </div>
        <h2 id="monday-title" data-reveal className="display-xl text-[clamp(64px,12vw,200px)]">
          MONDAY MORNING
        </h2>
        <dl className="flex flex-col border-t-2 border-signal-ink">
          {rows.map(([k, v]) => (
            <div key={k} data-reveal className="grid gap-2 border-b border-signal-ink/30 py-5 md:grid-cols-[200px_1fr] md:gap-8">
              <dt className="micro pt-1">{k}:</dt>
              <dd className={k === "Film this" ? "font-display text-3xl font-bold leading-tight md:text-5xl" : k === "Title" ? "font-serif text-2xl md:text-4xl" : "text-lg md:text-xl"}>{v}</dd>
            </div>
          ))}
        </dl>
        {c && (
          <p data-reveal className="micro">
            Backed by {c.metrics.creatorCount} creators · {c.metrics.videoCount} videos · {c.momentum.toLowerCase()} · score {c.score}/100
            {c.suggestedLengthSeconds ? ` · aim for about ${Math.round(c.suggestedLengthSeconds / 60)} min` : ""}
          </p>
        )}
      </div>
    </section>
  );
}
