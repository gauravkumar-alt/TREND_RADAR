import Image from "next/image";
import { compact, ytUrl } from "@/lib/format";
import { formatDurationWords } from "@/lib/youtube/duration";
import { Provenance } from "@/components/shared/Provenance";
import { MomentumBadge } from "@/components/trends/TrendMetrics";
import type { RadarRun, TrendCluster } from "@/lib/types";

export function BriefCluster({ cluster, run, index, whyNow, recommendation }: { cluster: TrendCluster; run: RadarRun; index: number; whyNow: string; recommendation: string }) {
  const evidence = cluster.videoIds.slice(0, 3).map((id) => run.videos[id]).filter(Boolean);
  return (
    <article className="grid gap-8 border-t border-line py-14 md:grid-cols-[160px_1fr] md:py-20" aria-labelledby={`brief-${cluster.id}`}>
      <div data-reveal className="flex items-start gap-4 md:flex-col">
        <span data-parallax className="display-xl tabular block text-7xl text-signal md:text-9xl">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="flex flex-col gap-8">
        <div data-reveal className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <MomentumBadge momentum={cluster.momentum} />
            <span className="micro tabular text-fg-3">
              Score {cluster.score} · {cluster.metrics.creatorCount} creators · {cluster.metrics.videoCount} videos · avg {formatDurationWords(cluster.metrics.avgDurationSeconds)}
            </span>
          </div>
          <h3 id={`brief-${cluster.id}`} data-rise className="font-display text-4xl font-bold leading-[1.02] tracking-tight md:text-6xl">
            {cluster.ai.name}
          </h3>
        </div>
        <div data-reveal className="flex flex-col gap-3">
          <span className="micro flex items-center gap-2 text-fg-3">
            Why now <Provenance kind="ai" />
          </span>
          <p className="max-w-3xl font-serif text-xl leading-relaxed text-fg md:text-2xl">{whyNow}</p>
        </div>
        <div data-reveal className="flex flex-col gap-3">
          <span className="micro flex items-center gap-2 text-fg-3">
            Evidence <Provenance kind="observed" />
          </span>
          <ul className="grid gap-4 sm:grid-cols-3">
            {evidence.map((v) => (
              <li key={v.id}>
                <a href={ytUrl(v.id)} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-2" aria-label={`${v.title} (opens YouTube)`}>
                  <span className="relative block aspect-video overflow-hidden bg-bg-3">
                    <Image src={v.thumbnailUrl} alt="" fill sizes="(min-width: 640px) 30vw, 100vw" className="object-cover" />
                  </span>
                  <span className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-signal">{v.title}</span>
                  <span className="micro text-fg-3">
                    {v.channelTitle} · {compact(v.views)} views
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div data-reveal className="flex flex-col gap-2 border-l-2 border-signal pl-5">
          <span className="micro flex items-center gap-2 text-signal">
            Recommendation <Provenance kind="recommendation" />
          </span>
          <p className="text-lg">{recommendation}</p>
          <p className="micro text-fg-3">Possible title: &ldquo;{cluster.ai.recommendation.possibleTitle}&rdquo;</p>
        </div>
      </div>
    </article>
  );
}
