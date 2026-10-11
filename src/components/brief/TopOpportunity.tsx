import Image from "next/image";
import { ytUrl } from "@/lib/format";
import { Provenance } from "@/components/shared/Provenance";
import { MomentumBadge } from "@/components/trends/TrendMetrics";
import type { Brief, RadarRun } from "@/lib/types";

export function TopOpportunity({ brief, run }: { brief: Brief; run: RadarRun }) {
  const c = run.clusters.find((x) => x.id === brief.content.topStory.clusterId);
  if (!c) return null;
  const lead = run.videos[c.videoIds[0]];
  return (
    <section className="border-b border-line" aria-labelledby="top-title">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-6">
          <span data-reveal className="micro text-signal">The one to watch</span>
          <h2 id="top-title" data-reveal className="display-xl text-[clamp(44px,7vw,112px)]">
            {c.ai.name}
          </h2>
          <div data-reveal className="flex flex-col gap-3">
            <span className="micro flex items-center gap-2 text-fg-3">
              Why it matters <Provenance kind="ai" />
            </span>
            <p className="font-serif text-2xl leading-snug md:text-3xl">{brief.content.topStory.whyItMatters}</p>
          </div>
          <div data-reveal className="flex flex-col gap-2 border-l-2 border-signal pl-5">
            <span className="micro flex items-center gap-2 text-signal">
              Recommended action <Provenance kind="recommendation" />
            </span>
            <p className="text-lg text-fg">{brief.content.topStory.recommendedAction}</p>
          </div>
        </div>
        <aside data-reveal className="flex flex-col gap-6 border border-line p-5">
          {lead && (
            <a href={ytUrl(lead.id)} target="_blank" rel="noopener noreferrer" className="group relative block aspect-video overflow-hidden bg-bg-3" aria-label={`Lead evidence: ${lead.title} (opens YouTube)`}>
              <Image src={lead.thumbnailUrl} alt="" fill sizes="420px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            </a>
          )}
          <div className="flex items-center gap-2">
            <MomentumBadge momentum={c.momentum} />
            <Provenance kind="calculated" />
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="micro text-fg-3">Creators</dt>
              <dd className="tabular text-3xl font-bold">{c.metrics.creatorCount}</dd>
            </div>
            <div>
              <dt className="micro text-fg-3">Videos</dt>
              <dd className="tabular text-3xl font-bold">{c.metrics.videoCount}</dd>
            </div>
            <div>
              <dt className="micro text-fg-3">Trend score</dt>
              <dd className="tabular text-3xl font-bold text-signal">{c.score}</dd>
            </div>
            <div>
              <dt className="micro text-fg-3">Last 72h</dt>
              <dd className="tabular text-3xl font-bold">{c.metrics.recentUploads}</dd>
            </div>
          </dl>
          <p className="text-sm text-fg-3">
            Creator coverage: {c.creators.slice(0, 5).map((x) => x.channelTitle).join(", ")}
            {c.creators.length > 5 ? ` and ${c.creators.length - 5} more` : ""}.
          </p>
        </aside>
      </div>
    </section>
  );
}
