"use client";
import { useRef } from "react";
import { gsap, scheduleRefresh, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { briefIntro, mondayScene, parallaxNumbers, revealEach, revealOnScroll, riseOnScroll } from "@/lib/animations/presets";
import { ago, istDateTime } from "@/lib/format";
import { useRadar } from "@/components/shared/RadarProvider";
import { BriefHero } from "./BriefHero";
import { TopOpportunity } from "./TopOpportunity";
import { BriefCluster } from "./BriefCluster";
import { MondayPlan } from "./MondayPlan";
import { GenerateBriefButton, SendBriefButton } from "./BriefActions";
import type { Brief, RadarRun } from "@/lib/types";

interface Props {
  brief: Brief;
  run: RadarRun;
  emailConfigured: boolean;
  recipient: string;
  lastDelivery: { at: string; status: string; recipient: string } | null;
}

export function BriefExperience({ brief, run, emailConfigured, recipient, lastDelivery }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { run: sessionRun } = useRadar();
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const build = (desktop: boolean) => {
        const root = ref.current;
        if (!root) return;
        const mast = root.querySelector<HTMLElement>("[data-brief-mast]");
        if (mast) briefIntro(mast);
        riseOnScroll(root);
        revealOnScroll(root.querySelectorAll("[data-reveal]"), { y: 28, stagger: 0.06 });
        if (desktop) {
          parallaxNumbers(root);
          const monday = root.querySelector<HTMLElement>("[data-monday]");
          // Pin only when the whole plan fits on screen; otherwise let it scroll with simple reveals.
          if (monday && monday.offsetHeight <= window.innerHeight) mondayScene(monday);
          else revealEach(root.querySelectorAll("[data-monday-row], [data-monday-foot]"));
        } else {
          revealEach(root.querySelectorAll("[data-monday-row], [data-monday-foot]"));
        }
        // Scenes are built after the page's load event; measure them once layout has settled.
        scheduleRefresh(300);
      };
      mm.add(MEDIA.desktop, () => build(true));
      mm.add(MEDIA.mobile, () => build(false));
      return () => mm.revert();
    },
    { scope: ref },
  );
  const newerUnsaved = sessionRun && !sessionRun.persisted && (sessionRun.completedAt ?? "") > (run.completedAt ?? "");

  return (
    <div ref={ref}>
      <BriefHero brief={brief} run={run} />
      <div className="border-b border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="micro text-fg-3">
            Written {istDateTime(brief.createdAt)} IST ({ago(brief.createdAt)}) by {brief.model} from the scan of {istDateTime(run.completedAt)}.
            {newerUnsaved && <span className="text-cool"> A newer unsaved scan exists in this session.</span>}
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <SendBriefButton briefId={brief.id} emailConfigured={emailConfigured} recipient={recipient} lastDelivery={lastDelivery} />
            <GenerateBriefButton runId={run.id} label="Rewrite" />
          </div>
        </div>
      </div>
      <TopOpportunity brief={brief} run={run} />
      <section className="mx-auto max-w-[1200px] px-4 md:px-8" aria-labelledby="opps-title">
        <h2 id="opps-title" data-reveal className="micro pt-16 text-fg-3">
          The {brief.content.opportunities.length} opportunities
        </h2>
        {brief.content.opportunities.map((o, i) => {
          const c = run.clusters.find((x) => x.id === o.clusterId);
          return c ? <BriefCluster key={o.clusterId} cluster={c} run={run} index={i} whyNow={o.whyNow} recommendation={o.recommendation} /> : null;
        })}
      </section>
      <MondayPlan brief={brief} run={run} />
    </div>
  );
}
