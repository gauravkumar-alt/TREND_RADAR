"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { revealOnScroll } from "@/lib/animations/presets";
import { CATEGORY_PRESETS, LOOKBACK_OPTIONS, REGIONS, regionLabel } from "@/lib/config";
import { ago, istDateTime } from "@/lib/format";
import { useCurrentRun } from "@/components/shared/RadarProvider";
import { RunRadarButton } from "@/components/shared/RunRadarButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { TrendCluster } from "./TrendCluster";
import type { RadarRun, MomentumLabel } from "@/lib/types";
import type { RunSummary } from "@/lib/db/repo";
import type { CategoryDef } from "@/lib/config";

type MomentumFilter = "ALL" | Exclude<MomentumLabel, "BUILDING BASELINE"> | "BUILDING BASELINE";

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

const selectCls = "h-10 w-full appearance-none border border-line-2 bg-bg px-3 pr-8 text-sm text-fg hover:border-fg-2 focus:border-signal";

export function TrendOverview({ serverRun, pinnedRunId, failure, history, settingsCategories, regionCode, lookbackDays, dbError }: Props) {
  const latest = useCurrentRun(serverRun);
  const run = pinnedRunId ? serverRun : latest;
  const [category, setCategory] = useState("ALL");
  const [region, setRegion] = useState(run?.settings.regionCode ?? regionCode);
  const [lookback, setLookback] = useState(run?.settings.lookbackDays ?? lookbackDays);
  const [momentum, setMomentum] = useState<MomentumFilter>("ALL");
  const [hash, setHash] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHash(window.location.hash.slice(1) || null);
  }, []);

  const allCategories = useMemo(() => {
    const map = new Map<string, CategoryDef>();
    [...settingsCategories, ...CATEGORY_PRESETS].forEach((c) => map.has(c.id) || map.set(c.id, c));
    return [...map.values()];
  }, [settingsCategories]);
  const runCategoryLabels = run?.settings.categories.map((c) => c.label) ?? [];

  const clusters = useMemo(() => {
    if (!run) return [];
    return run.clusters.filter((c) => {
      if (momentum !== "ALL" && c.momentum !== momentum) return false;
      if (category !== "ALL") {
        const label = allCategories.find((x) => x.id === category)?.label;
        if (label && !c.categories.includes(label)) return false;
      }
      return true;
    });
  }, [run, momentum, category, allCategories]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MEDIA.desktop}, ${MEDIA.mobile}`, () => {
        if (list.current) revealOnScroll(list.current.querySelectorAll(":scope > article"), { y: 48 });
      });
      return () => mm.revert();
    },
    { scope: list, dependencies: [run?.id, clusters.length] },
  );

  const categoryIsInRun = category === "ALL" || runCategoryLabels.includes(allCategories.find((c) => c.id === category)?.label ?? "");
  const overrides = {
    regionCode: region,
    lookbackDays: lookback,
    ...(category !== "ALL" ? { categoryIds: [category] } : {}),
    force: true,
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-8">
      <header className="flex flex-col gap-6 border-b border-line py-14 md:py-20">
        <span className="micro text-signal">02 · Analysis</span>
        <h1 className="display-xl text-[clamp(52px,10vw,180px)]">TREND INTELLIGENCE</h1>
        <p className="max-w-2xl font-serif text-2xl italic text-fg-2 md:text-3xl">Three to five conversations worth paying attention to.</p>
        {run && (
          <p className="micro flex flex-wrap gap-x-4 gap-y-1 text-fg-3">
            <span>{pinnedRunId ? "Archived scan" : failure ? "Last successful scan" : "Latest scan"} · {istDateTime(run.completedAt)} IST ({ago(run.completedAt)})</span>
            <span>{regionLabel(run.settings.regionCode)}</span>
            <span>{run.settings.lookbackDays}-day lookback</span>
            <span>{run.videosAnalyzed} videos analysed</span>
            <span>{run.quotaUnitsUsed} YouTube quota units</span>
            <span>{run.model}</span>
            {!run.persisted && <span className="text-cool">Not saved to history</span>}
          </p>
        )}
      </header>

      {/* Filter bar */}
      <div className="sticky top-14 z-30 -mx-4 border-b border-line bg-bg/90 px-4 py-4 backdrop-blur-md md:-mx-8 md:px-8">
        <form className="grid grid-cols-2 items-end gap-3 md:grid-cols-[1fr_1fr_1fr_1.6fr_auto]" onSubmit={(e) => e.preventDefault()} aria-label="Filter trends">
          <label className="flex flex-col gap-1.5">
            <span className="micro text-fg-3">Category</span>
            <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="ALL">All categories</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="micro text-fg-3">Region</span>
            <select className={selectCls} value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="micro text-fg-3">Lookback</span>
            <select className={selectCls} value={lookback} onChange={(e) => setLookback(Number(e.target.value))}>
              {LOOKBACK_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
          <fieldset className="col-span-2 flex flex-col gap-1.5 md:col-span-1">
            <legend className="micro mb-1.5 text-fg-3">Momentum</legend>
            <div className="grid grid-cols-4 border border-line-2" role="radiogroup">
              {(["ALL", "RISING", "STABLE", "COOLING"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={momentum === m}
                  onClick={() => setMomentum(m)}
                  className={`micro h-[38px] text-[10px] transition-colors ${momentum === m ? "bg-fg text-bg" : "text-fg-2 hover:text-fg"}`}
                >
                  {m === "ALL" ? "All" : m.charAt(0) + m.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="col-span-2 md:col-span-1">
            <RunRadarButton label="Run new radar" overrides={overrides} className="w-full" />
          </div>
        </form>
        {run && (region !== run.settings.regionCode || lookback !== run.settings.lookbackDays || !categoryIsInRun) && (
          <p className="micro mt-3 text-fg-3">Region, lookback and new categories apply when you run a new radar. Momentum and category filter this scan instantly.</p>
        )}
      </div>

      {dbError && <ErrorState className="mt-6" compact title="History unavailable" message={dbError} />}
      {failure && !pinnedRunId && (
        <ErrorState className="mt-6" compact title="Last successful scan shown" message={`The newest scan (${ago(failure.at)}) failed: ${failure.message}`} />
      )}

      {!run ? (
        <EmptyState title="THE RADAR HASN'T SCANNED YET." body="Run the radar to pull live YouTube data and find this week's clusters." />
      ) : clusters.length === 0 ? (
        <EmptyState action={false} title="NO STRONG SIGNALS YET." body="No cluster in this scan matches those filters. Try another momentum or category, or run a new radar with a longer lookback window." />
      ) : (
        <div ref={list} className="pb-10">
          {clusters.map((c, i) => (
            <TrendCluster key={`${run.id}-${c.id}`} cluster={c} run={run} defaultOpen={hash ? hash === c.id : i === 0} />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <section className="border-t border-line py-14" aria-labelledby="history-title">
          <h2 id="history-title" className="micro mb-5 text-fg-3">
            Previous scans
          </h2>
          <ol className="divide-y divide-line border-y border-line">
            {history.map((h) => (
              <li key={h.id} className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 text-sm md:grid-cols-[220px_1fr_120px_120px]">
                <span className="tabular">{istDateTime(h.startedAt)}</span>
                <span className="hidden truncate text-fg-3 md:block">
                  {h.regionCode} · {h.categories.join(", ")}
                </span>
                <span className={`micro ${h.status === "succeeded" ? "text-fg-2" : h.status === "failed" ? "text-cool" : "text-fg-3"}`}>
                  {h.status} {h.trigger === "cron" ? "· cron" : ""}
                </span>
                {h.status === "succeeded" ? (
                  <Link href={`/trends?run=${h.id}`} className="micro text-right text-fg underline decoration-line-2 underline-offset-4 hover:decoration-fg md:text-left" aria-current={h.id === run?.id ? "true" : undefined}>
                    {h.id === run?.id ? "Viewing" : "Open"}
                  </Link>
                ) : (
                  <span className="micro truncate text-right text-fg-3 md:text-left" title={h.errorMessage ?? undefined}>
                    {h.status === "failed" ? "—" : "running"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
