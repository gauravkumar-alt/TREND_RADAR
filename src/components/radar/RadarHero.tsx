"use client";
import Link from "next/link";
import { useRef } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { heroIntro } from "@/lib/animations/presets";
import { regionLabel } from "@/lib/config";
import { ago, istDateTime, longDate } from "@/lib/format";
import { RunRadarButton } from "@/components/shared/RunRadarButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RadarSignalField } from "./RadarSignalField";
import type { RadarRun } from "@/lib/types";

interface Props {
  run: RadarRun | null;
  regionCode: string;
  categories: string[];
  failure: { at: string; message: string } | null;
}

export function RadarHero({ run, regionCode, categories, failure }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MEDIA.desktop}, ${MEDIA.mobile}`, () => {
        if (root.current) heroIntro(root.current);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const tags = [regionLabel(regionCode), ...categories];
  return (
    <section ref={root} className="relative flex min-h-[calc(100svh-3.5rem)] flex-col overflow-hidden border-b border-line" aria-labelledby="hero-title">
      <div data-hero-grid className="grid-lines grid-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="pointer-events-none absolute right-[-18vw] top-1/2 w-[86vw] max-w-[900px] -translate-y-1/2 opacity-90 md:right-[-6vw] md:w-[58vw]" aria-hidden={!run}>
        <RadarSignalField run={run} className="h-auto w-full" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-between gap-10 px-4 pb-8 pt-8 md:px-8 md:pt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span data-hero-meta className="micro flex items-center gap-2 text-fg-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-signal" />
            </span>
            Live radar · {longDate(new Date().toISOString())}
          </span>
          <span data-hero-meta className="micro text-fg-3">
            Issue {run ? run.id.slice(0, 6).toUpperCase() : "—"}
          </span>
        </div>

        <div className="flex flex-col gap-6">
          <h1 id="hero-title" className="display-xl text-[clamp(64px,15.5vw,268px)]">
            <span data-hero-line className="block overflow-hidden">
              <span className="block">
                TREND<span className="text-signal">{"//"}</span>
              </span>
            </span>
            <span data-hero-line className="block overflow-hidden">
              <span className="block">RADAR</span>
            </span>
          </h1>
          <div className="flex max-w-2xl flex-col gap-3">
            <p data-hero-tagline className="font-serif text-3xl italic leading-tight text-fg md:text-5xl">
              Know what&apos;s about to trend.
            </p>
            <p data-hero-tagline className="text-base text-fg-2 md:text-lg">
              Pattern-level intelligence for your next video.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Scan scope">
            {tags.map((t) => (
              <li key={t} data-hero-meta className="micro border border-line-2 px-2.5 py-1.5 text-fg-2">
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-8 border-t border-line pt-6 md:flex-row md:items-end md:justify-between">
          <dl className="grid grid-cols-3 gap-6 md:gap-14">
            <div data-hero-meta className="flex flex-col gap-1">
              <dt className="micro text-fg-3">{failure ? "Last successful scan" : "Last scan"}</dt>
              <dd className="tabular text-lg font-semibold md:text-2xl">{run ? ago(run.completedAt) : "Never"}</dd>
              {run && <dd className="micro text-fg-3">{istDateTime(run.completedAt)} IST</dd>}
            </div>
            <div data-hero-meta className="flex flex-col gap-1">
              <dt className="micro text-fg-3">Videos analyzed</dt>
              <dd className="tabular text-lg font-semibold md:text-2xl">{run ? run.videosAnalyzed : "—"}</dd>
              {run && <dd className="micro text-fg-3">of {run.videosFetched} fetched</dd>}
            </div>
            <div data-hero-meta className="flex flex-col gap-1">
              <dt className="micro text-fg-3">Active signals</dt>
              <dd className="tabular text-lg font-semibold text-signal md:text-2xl">{run ? run.clusters.length : "—"}</dd>
              {run && <dd className="micro text-fg-3">topic clusters</dd>}
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <span data-hero-cta>
              <RunRadarButton size="lg" overrides={run ? { force: true } : undefined} />
            </span>
            <Link data-hero-cta href="/trends" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
              Explore trends <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>

        {failure && (
          <p role="status" className="micro border border-cool/40 bg-cool/5 px-3 py-2 text-cool">
            Showing the last successful scan · newest attempt failed {ago(failure.at)}: {failure.message}
          </p>
        )}
        {run && (
          <a href="#story" data-hero-meta className="micro flex items-center gap-2 self-start text-fg-3 hover:text-fg">
            <ArrowDown className="size-3.5" aria-hidden /> Scroll the story
          </a>
        )}
      </div>
    </section>
  );
}
