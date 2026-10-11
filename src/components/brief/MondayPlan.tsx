import { formatDurationWords } from "@/lib/youtube/duration";
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
    <section data-monday className="bg-signal text-signal-ink min-[900px]:flex min-[900px]:min-h-[calc(100svh-3.5rem)] min-[900px]:items-center" aria-labelledby="monday-title">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-20 md:px-8 md:py-16">
        <div data-reveal className="flex flex-wrap items-center gap-3">
          <span className="micro">Final answer</span>
          <Provenance kind="recommendation" className="border-signal-ink bg-signal-ink text-signal" />
        </div>
        <h2 id="monday-title" data-monday-title className="display-xl text-[clamp(56px,9vw,150px)]">
          MONDAY MORNING
        </h2>
        <dl className="relative flex flex-col">
          <span data-monday-rule className="absolute inset-x-0 top-0 h-0.5 bg-signal-ink" aria-hidden />
          {rows.map(([k, v]) => (
            <div key={k} data-monday-row className="grid gap-2 border-b border-signal-ink/30 py-3.5 md:grid-cols-[200px_1fr] md:gap-8">
              <dt className="micro pt-1">{k}:</dt>
              <dd className={k === "Film this" ? "font-display text-3xl font-bold leading-tight md:text-4xl" : k === "Title" ? "font-serif text-2xl md:text-3xl" : "text-lg"}>{v}</dd>
            </div>
          ))}
        </dl>
        {c && (
          <p data-monday-foot className="micro">
            Backed by: {c.metrics.creatorCount} creators · {c.metrics.videoCount} videos · momentum {c.momentum} · trend score {c.score} · aim for ~
            {c.suggestedLengthSeconds ? Math.round(c.suggestedLengthSeconds / 60) : "—"} min (calculated; cluster average {formatDurationWords(c.metrics.avgDurationSeconds)})
          </p>
        )}
      </div>
    </section>
  );
}
