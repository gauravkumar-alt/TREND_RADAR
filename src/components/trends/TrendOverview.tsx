"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { revealOnScroll } from "@/lib/animations/presets";
import { CATEGORY_PRESETS, LOOKBACK_OPTIONS, REGIONS, regionLabel } from "@/lib/config";
import { ago, istDateTime } from "@/lib/format";
import { clusterKeyword } from "@/lib/trends/keyword";
import { useCurrentRun } from "@/components/shared/RadarProvider";
import { RunRadarButton } from "@/components/shared/RunRadarButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Provenance } from "@/components/shared/Provenance";
import { cn } from "@/lib/utils";
import { TrendCluster } from "./TrendCluster";
import { MomentumBadge } from "./TrendMetrics";
import type { RadarRun, MomentumLabel } from "@/lib/types";
import type { RunSummary } from "@/lib/db/repo";
import type { CategoryDef } from "@/lib/config";

type MomentumFilter = "ALL" | Exclude<MomentumLabel, "BUILDING BASELINE">;

interface Props {
  serverRun: RadarRun | null;
  pinnedRunId: string | null;
  failure: { at: string; message: string } | null;
  history: RunSummary[];
  settingsCategories: CategoryDef[];
  regionCode: string;
  lookbackDays: number;
  dbError: string | null;
}

const selectCls = "h-10 w-full border border-line-2 bg-bg px-3 text-sm text-fg hover:border-fg-2 focus:border-signal";

export function TrendOverview({ serverRun, pinnedRunId, failure, history, settingsCategories, regionCode, lookbackDays, dbError }: Props) {
  const latest = useCurrentRun(serverRun);
  const run = pinnedRunId ? serverRun : latest;
  const [momentum, setMomentum] = useState<MomentumFilter>("ALL");
  const [hash, setHash] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scan, setScan] = useState({
    region: run?.settings.regionCode ?? regionCode,
    lookback: run?.settings.lookbackDays ?? lookbackDays,
    category: "ALL",
  });
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const read = () => setHash(window.location.hash.slice(1) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // Scroll once the linked topic has opened (and the default one has closed).
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    return () => clearTimeout(t);
  }, [hash]);

  const categories = useMemo(() => {
    const map = new Map<string, CategoryDef>();
    [...settingsCategories, ...CATEGORY_PRESETS].forEach((c) => map.has(c.id) || map.set(c.id, c));
    return [...map.values()];
  }, [settingsCategories]);

  const clusters = useMemo(() => (run ? run.clusters.filter((c) => momentum === "ALL" || c.momentum === momentum) : []), [run, momentum]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MEDIA.desktop}, ${MEDIA.mobile}`, () => {
        if (list.current) revealOnScroll(list.current.querySelectorAll(":scope > article"), { y: 40 });
      });
      return () => mm.revert();
    },
    { scope: list, dependencies: [run?.id, clusters.length] },
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: run?.clusters.length ?? 0 };
    run?.clusters.forEach((x) => (c[x.momentum] = (c[x.momentum] ?? 0) + 1));
    return c;
  }, [run]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-8">
      <header className="flex flex-col gap-5 border-b border-line py-12 md:py-16">
        <h1 className="display-xl text-[clamp(48px,9vw,160px)]">TREND INTELLIGENCE</h1>
        <p className="max-w-2xl font-serif text-2xl italic text-fg-2 md:text-3xl">Three to five conversations worth paying attention to.</p>
        {run && (
          <p className="micro text-fg-3">
            {pinnedRunId ? "Older scan" : failure ? "Last successful scan" : "Scanned"} {ago(run.completedAt)} · {regionLabel(run.settings.regionCode)} · last{" "}
            {run.settings.lookbackDays} days · {run.videosAnalyzed} videos
            {pinnedRunId && (
              <>
                {" · "}
                <Link href="/trends" className="text-fg underline underline-offset-4">
                  back to latest
                </Link>
              </>
            )}
          </p>
        )}
      </header>

      {dbError && <ErrorState className="mt-6" compact title="History unavailable" message={dbError} />}
      {failure && !pinnedRunId && (
        <ErrorState className="mt-6" compact title="Showing the last successful scan" message={`The newest scan (${ago(failure.at)}) didn't finish: ${failure.message}`} />
      )}

      {run && run.clusters.length > 0 && (
        <>
          {/* At a glance: every topic in one row, each jumps to its section */}
          <nav aria-label="Topics at a glance" className="grid gap-px border border-line bg-line py-0 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] mt-8">
            {run.clusters.map((c) => (
              <a key={c.id} href={`#${c.id}`} className="group flex flex-col gap-3 bg-bg p-4 transition-colors hover:bg-bg-2 md:p-5">
                <span className="flex items-center justify-between gap-2">
                  <span className="micro tabular text-fg-3">{String(c.rank).padStart(2, "0")}</span>
                  <MomentumBadge momentum={c.momentum} />
                </span>
                <span className="text-xl font-bold leading-tight tracking-tight group-hover:text-signal">{clusterKeyword(c)}</span>
                <span className="flex items-end justify-between">
                  <span className="text-xs text-fg-3">
                    {c.metrics.videoCount} videos · {c.metrics.creatorCount} creators
                  </span>
                  <span className="tabular text-2xl font-bold text-signal">
                    {c.score}
                    <span className="micro text-fg-3">/100</span>
                  </span>
                </span>
              </a>
            ))}
          </nav>

          {/* One key for the labels used across the page */}
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-3">
            <span className="flex items-center gap-1.5"><Provenance kind="observed" /> from YouTube</span>
            <span className="flex items-center gap-1.5"><Provenance kind="calculated" /> worked out by the app</span>
            <span className="flex items-center gap-1.5"><Provenance kind="ai" /> written by Gemini</span>
            <span className="flex items-center gap-1.5"><Provenance kind="recommendation" /> what to do</span>
          </p>
        </>
      )}

      {/* Filters + new scan */}
      <div className="sticky top-14 z-30 -mx-4 mt-8 border-y border-line bg-bg/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3" role="radiogroup" aria-label="Show topics">
            <span className="micro hidden text-fg-3 sm:inline">Show</span>
            <div className="flex border border-line-2">
              {(["ALL", "RISING", "STABLE", "COOLING"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={momentum === m}
                  onClick={() => setMomentum(m)}
                  disabled={m !== "ALL" && !counts[m]}
                  className={cn(
                    "micro h-9 px-3 text-[10px] transition-colors disabled:opacity-30",
                    momentum === m ? "bg-fg text-bg" : "text-fg-2 hover:text-fg",
                  )}
                >
                  {m === "ALL" ? "All" : m.charAt(0) + m.slice(1).toLowerCase()} <span className="tabular opacity-60">{counts[m] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScanOpen((o) => !o)}
            aria-expanded={scanOpen}
            aria-controls="new-scan"
            className="micro flex h-9 items-center gap-2 border border-line-2 px-3 text-fg hover:border-fg"
          >
            {scanOpen ? <X className="size-3.5" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
            {scanOpen ? "Close" : "New scan"}
          </button>
        </div>

        {scanOpen && (
          <div id="new-scan" className="mt-3 grid grid-cols-2 items-end gap-3 border-t border-line pt-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="flex flex-col gap-1.5">
              <span className="micro text-fg-3">Region</span>
              <select className={selectCls} value={scan.region} onChange={(e) => setScan((s) => ({ ...s, region: e.target.value }))}>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="micro text-fg-3">Look back</span>
              <select className={selectCls} value={scan.lookback} onChange={(e) => setScan((s) => ({ ...s, lookback: Number(e.target.value) }))}>
                {LOOKBACK_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 md:col-span-1">
              <span className="micro text-fg-3">Category</span>
              <select className={selectCls} value={scan.category} onChange={(e) => setScan((s) => ({ ...s, category: e.target.value }))}>
                <option value="ALL">My categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    Only {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="col-span-2 md:col-span-1">
              <RunRadarButton
                label="Run scan"
                className="w-full"
                overrides={{ regionCode: scan.region, lookbackDays: scan.lookback, ...(scan.category !== "ALL" ? { categoryIds: [scan.category] } : {}), force: true }}
              />
            </div>
            <p className="col-span-2 text-xs text-fg-3 md:col-span-4">Takes about a minute. Your saved settings stay the same.</p>
          </div>
        )}
      </div>

      {!run ? (
        <EmptyState title="NO SCAN YET." body="Run the radar to find this week's topics." />
      ) : clusters.length === 0 ? (
        <EmptyState action={false} title="NO STRONG SIGNALS YET." body="Nothing matches that filter. Try All, or run a new scan with a longer look-back." />
      ) : (
        <div ref={list} className="pb-10">
          {clusters.map((c, i) => (
            <TrendCluster key={`${run.id}-${c.id}`} cluster={c} run={run} defaultOpen={hash ? hash === c.id : i === 0} />
          ))}
        </div>
      )}

      {history.length > 1 && (
        <details className="group border-t border-line py-10">
          <summary className="micro flex cursor-pointer list-none items-center gap-2 text-fg-2 hover:text-fg">
            Previous scans <span className="tabular text-fg-3">({history.length})</span>
            <span className="transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
          </summary>
          <ol className="mt-5 divide-y divide-line border-y border-line">
            {history.map((h) => (
              <li key={h.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm md:grid-cols-[220px_1fr_auto]">
                <span className="tabular">{istDateTime(h.startedAt)}</span>
                <span className="hidden truncate text-fg-3 md:block">
                  {regionLabel(h.regionCode)} · {h.categories.join(", ")}
                </span>
                {h.status === "succeeded" ? (
                  h.id === run?.id ? (
                    <span className="micro text-fg-3">Showing</span>
                  ) : (
                    <Link href={`/trends?run=${h.id}`} className="micro text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg">
                      Open
                    </Link>
                  )
                ) : (
                  <span className={cn("micro", h.status === "failed" ? "text-cool" : "text-fg-3")}>{h.status === "failed" ? "Didn't finish" : "Running"}</span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
