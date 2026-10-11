import { regionLabel } from "@/lib/config";
import { longDate } from "@/lib/format";
import type { Brief, RadarRun } from "@/lib/types";

export function BriefHero({ brief, run }: { brief: Brief; run: RadarRun }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 pb-14 pt-14 md:px-8 md:pb-20 md:pt-20">
        <div data-reveal className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <span className="micro text-fg">TREND//RADAR · Weekly</span>
          <span className="micro text-fg-3">Edition {brief.weekOf}</span>
        </div>
        <div data-reveal className="flex flex-col gap-4">
          <h1 className="display-xl text-[clamp(64px,13vw,210px)]">SUNDAY BRIEF</h1>
          <p className="font-serif text-3xl italic text-fg-2 md:text-5xl">Your week in YouTube.</p>
        </div>
        <dl data-reveal className="grid grid-cols-2 gap-6 border-t border-line pt-6 md:grid-cols-4">
          <div>
            <dt className="micro text-fg-3">Sunday</dt>
            <dd className="mt-1 text-lg font-semibold">{longDate(brief.weekOf + "T06:00:00Z")}</dd>
          </div>
          <div>
            <dt className="micro text-fg-3">Region</dt>
            <dd className="mt-1 text-lg font-semibold">{regionLabel(run.settings.regionCode)}</dd>
          </div>
          <div>
            <dt className="micro text-fg-3">Categories</dt>
            <dd className="mt-1 text-lg font-semibold">{run.settings.categories.map((c) => c.label).join(", ")}</dd>
          </div>
          <div>
            <dt className="micro text-fg-3">Videos analyzed</dt>
            <dd className="tabular mt-1 text-lg font-semibold">{run.videosAnalyzed}</dd>
          </div>
        </dl>
        <div data-reveal className="flex max-w-4xl flex-col gap-4 pt-6">
          <h2 className="font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">{brief.content.headline}</h2>
          <p className="font-serif text-xl leading-relaxed text-fg-2 md:text-2xl">{brief.content.dek}</p>
        </div>
      </div>
    </header>
  );
}
