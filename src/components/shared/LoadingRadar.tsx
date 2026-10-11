"use client";
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { gsap, useGSAP } from "@/lib/animations/gsap";
import { MEDIA } from "@/lib/animations/motion";
import { RUN_STAGES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRadar } from "./RadarProvider";
import { ErrorState } from "./ErrorState";
import { Button } from "@/components/ui/button";

/**
 * Full-screen scan overlay. Stages are real: they arrive from the
 * /api/radar/run NDJSON stream as the server reaches each step.
 */
export function LoadingRadar() {
  const { running, stage, detail, completedStages, error, warnings, dismiss, startedAt, run, reused } = useRadar();
  const root = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const open = running || Boolean(error) || showDone;

  useEffect(() => {
    if (!running || !startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [running, startedAt]);

  // Briefly confirm completion, then get out of the way.
  const lastRunId = useRef<string | null>(null);
  useEffect(() => {
    if (!running && run && run.id !== lastRunId.current && startedAt) {
      lastRunId.current = run.id;
      setShowDone(true);
      const t = setTimeout(() => setShowDone(false), warnings.length ? 4200 : 1600);
      return () => clearTimeout(t);
    }
  }, [running, run, startedAt, warnings.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !running) {
        dismiss();
        setShowDone(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, running, dismiss]);

  useGSAP(
    () => {
      if (!open || !root.current) return;
      const mm = gsap.matchMedia();
      mm.add(`${MEDIA.desktop}, ${MEDIA.mobile}`, () => {
        gsap.from(root.current, { opacity: 0, duration: 0.4 });
        gsap.to("[data-scan-sweep]", { rotate: 360, duration: 3.2, ease: "none", repeat: -1, transformOrigin: "50% 50%" });
        gsap.to("[data-scan-ring]", { scale: 1.08, opacity: 0.25, duration: 1.6, yoyo: true, repeat: -1, ease: "sine.inOut", stagger: 0.3 });
      });
      return () => mm.revert();
    },
    { dependencies: [open], scope: root },
  );

  useGSAP(
    () => {
      if (!stage) return;
      gsap.from("[data-stage-active]", { x: -16, opacity: 0, duration: 0.5, ease: "power3.out" });
    },
    { dependencies: [stage], scope: root },
  );

  if (!open) return null;
  const doneAll = !running && !error && showDone;

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="Radar scan progress"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/95 px-4 backdrop-blur-sm"
    >
      <div className="grid w-full max-w-4xl gap-10 md:grid-cols-[260px_1fr] md:items-center">
        <svg viewBox="0 0 200 200" className="mx-auto size-40 md:size-60" aria-hidden>
          {[90, 64, 38].map((r) => (
            <circle key={r} data-scan-ring cx="100" cy="100" r={r} fill="none" stroke="var(--line-2)" strokeWidth="1" />
          ))}
          <line x1="100" y1="10" x2="100" y2="190" stroke="var(--line)" />
          <line x1="10" y1="100" x2="190" y2="100" stroke="var(--line)" />
          <g data-scan-sweep>
            <path d="M100 100 L100 10 A90 90 0 0 1 163.6 36.4 Z" fill="var(--signal)" opacity="0.14" />
            <line x1="100" y1="100" x2="100" y2="10" stroke="var(--signal)" strokeWidth="1.5" />
          </g>
          <circle cx="100" cy="100" r="3" fill="var(--signal)" />
        </svg>

        <div className="flex flex-col gap-6" aria-live="polite">
          <div className="flex items-baseline justify-between gap-4">
            <span className="micro text-signal">{error ? "Scan stopped" : doneAll ? (reused ? "Recent scan reused" : "Scan complete") : "Scanning YouTube"}</span>
            <span className="micro tabular text-fg-3">{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</span>
          </div>
          <ol className="flex flex-col divide-y divide-line border-y border-line">
            {RUN_STAGES.map((s, i) => {
              const done = completedStages.includes(s) || (doneAll && (s !== "GENERATING BRIEF" || !reused));
              const active = s === stage && running;
              return (
                <li key={s} {...(active ? { "data-stage-active": true } : {})} className={cn("flex items-center gap-4 py-3", !done && !active && "opacity-35")}>
                  <span className="micro w-6 tabular text-fg-3">{String(i + 1).padStart(2, "0")}</span>
                  <span className={cn("flex-1 font-display text-lg font-semibold tracking-tight md:text-2xl", active && "text-signal")}>{s}</span>
                  {done ? <Check className="size-4 text-signal" aria-label="done" /> : active ? <span className="size-2 animate-pulse rounded-full bg-signal" aria-label="in progress" /> : null}
                </li>
              );
            })}
          </ol>
          {running && detail && <p className="micro text-fg-3">{detail}</p>}
          {running && <p className="text-xs text-fg-3">A full scan reads live YouTube data and asks Gemini Flash for the clusters. It usually takes 30–90 seconds.</p>}
          {warnings.map((w) => (
            <p key={w} className="text-sm text-fg-2">
              <span className="micro mr-2 text-cool">Note</span>
              {w}
            </p>
          ))}
          {error && (
            <div className="flex flex-col gap-3">
              <ErrorState
                title={error.code === "NO_RESULTS" ? "No strong signals yet" : error.code.replaceAll("_", " ")}
                message={error.code === "NO_RESULTS" ? `${error.message} Try expanding your lookback window or adding another category.` : error.message}
                settingsLink={error.code === "NO_RESULTS" || error.code === "INVALID_SETTINGS"}
              />
              <Button variant="outline" size="sm" onClick={dismiss} className="self-start">
                <X aria-hidden /> Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
