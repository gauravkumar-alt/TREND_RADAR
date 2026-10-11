import { cn } from "@/lib/utils";

/** Trend score as a ring. The arc ([data-gauge]) is drawn by GSAP; the number ([data-count]) counts up. */
export function ScoreGauge({ score, size = 112, className }: { score: number; size?: number; className?: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} title="Trend score out of 100">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--line-2)" strokeWidth="3" />
        <circle
          data-gauge
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--signal)"
          strokeWidth="5"
          strokeLinecap="butt"
          strokeDasharray={`${(c * score) / 100} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span data-count={score} className="tabular font-display text-3xl font-bold leading-none text-signal" aria-label={`Trend score ${score} out of 100`}>
          {score}
        </span>
        <span className="micro mt-1 text-[9px] text-fg-3">score</span>
      </div>
    </div>
  );
}
