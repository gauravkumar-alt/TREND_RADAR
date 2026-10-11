"use client";
import Link from "next/link";
import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import { ScrollTrigger } from "@/lib/animations/gsap";
import { useCurrentRun } from "@/components/shared/RadarProvider";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { MomentumBadge } from "@/components/trends/TrendMetrics";
import { RadarHero } from "./RadarHero";
import { StatementSection, TopicReveal } from "./StatementSection";
import { ScrollVideoReel } from "./ScrollVideoReel";
import { TrendFormation } from "./TrendFormation";
import { MomentumSection } from "./MomentumSection";
import { WhyNowSection } from "./WhyNowSection";
import { RecommendationSection } from "./RecommendationSection";
import type { RadarRun } from "@/lib/types";

interface Props {
  serverRun: RadarRun | null;
  failure: { at: string; message: string } | null;
  regionCode: string;
  categories: string[];
  creatorName: string;
  dbError: string | null;
  missing: string[];
}

/** The Live Radar story: hero → statement → reel → pattern → formation → momentum → why now → what to make. */
export function RadarExperience({ serverRun, failure, regionCode, categories, creatorName, dbError, missing }: Props) {
  const run = useCurrentRun(serverRun);
  const top = run?.clusters[0];
  const topVideos = top ? top.videoIds.map((id) => run!.videos[id]).filter(Boolean) : [];
  const reel = run ? run.reelVideoIds.map((id) => run.videos[id]).filter(Boolean) : [];

  // Pinned sections change page height once images/fonts settle; re-measure.
  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => clearTimeout(t);
  }, [run?.id]);

  return (
    <div key={run?.id ?? "empty"}>
      <RadarHero run={run} regionCode={run?.settings.regionCode ?? regionCode} categories={run?.settings.categories.map((c) => c.label) ?? categories} failure={failure} />

      {(missing.length > 0 || dbError) && (
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-6 md:px-8">
          {missing.length > 0 && <ErrorState compact title="Setup needed" message={`Missing server keys: ${missing.join(", ")}. Add them to the environment to run live scans.`} />}
          {dbError && <ErrorState compact title="History unavailable" message={dbError} />}
        </div>
      )}

      {!run || !top ? (
        <EmptyState
          title={run ? "NO STRONG SIGNALS YET." : "THE RADAR HASN'T SCANNED YET."}
          body={run ? "Try expanding your lookback window or adding another category." : "Run the radar to pull live YouTube data for your categories and find this week's conversations."}
        />
      ) : (
        <>
          <StatementSection />
          <ScrollVideoReel videos={reel} signals={run.signals} />
          <TopicReveal />
          <TrendFormation cluster={top} videos={topVideos} />
          <MomentumSection cluster={top} />
          <WhyNowSection cluster={top} videos={topVideos} />
          <RecommendationSection cluster={top} creatorName={run.settings.creatorName || creatorName} />
          {run.clusters.length > 1 && (
            <section className="mx-auto max-w-[1600px] px-4 py-20 md:px-8" aria-labelledby="also-title">
              <h2 id="also-title" className="micro mb-6 text-fg-3">
                Also on the radar this week
              </h2>
              <ol className="border-t border-line">
                {run.clusters.slice(1).map((c) => (
                  <li key={c.id} className="border-b border-line">
                    <Link href={`/trends#${c.id}`} className="group grid grid-cols-[48px_1fr_auto] items-center gap-4 py-6 md:grid-cols-[80px_1fr_auto_auto] md:gap-8">
                      <span className="micro tabular text-fg-3">{String(c.rank).padStart(2, "0")}</span>
                      <span className="font-display text-2xl font-bold tracking-tight group-hover:text-signal md:text-5xl">{c.ai.name}</span>
                      <span className="hidden md:block">
                        <MomentumBadge momentum={c.momentum} />
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular text-xl font-semibold text-signal md:text-3xl">{c.score}</span>
                        <ArrowUpRight className="size-5 text-fg-3 group-hover:text-fg" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
