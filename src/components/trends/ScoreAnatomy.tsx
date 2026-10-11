import { WEIGHTS } from "@/lib/trends/scoring";
import type { ScoreBreakdown } from "@/lib/types";

const LABELS: Record<keyof ScoreBreakdown, string> = {
  topicFrequency: "Topic frequency",
  momentum: "Momentum",
  creatorDiversity: "Creator diversity",
  engagement: "Engagement",
  recency: "Recency",
  formatMomentum: "Format momentum",
};

/** How the 0–100 score was built: each factor's normalised value × its weight. */
export function ScoreAnatomy({ score, breakdown }: { score: number; breakdown: ScoreBreakdown }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2.5">
        {(Object.keys(WEIGHTS) as (keyof ScoreBreakdown)[]).map((k) => {
          const pts = breakdown[k] * WEIGHTS[k] * 100;
          return (
            <li key={k} className="grid grid-cols-[130px_1fr_64px] items-center gap-3 text-sm">
              <span className="text-fg-2">
                {LABELS[k]} <span className="micro text-fg-3">{Math.round(WEIGHTS[k] * 100)}%</span>
              </span>
              <span className="relative h-1.5 bg-bg-3" aria-hidden>
                <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${breakdown[k] * 100}%` }} />
              </span>
              <span className="micro tabular text-right text-fg">+{pts.toFixed(1)}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="text-xs text-fg-3">Each part is compared with this week&apos;s other topics.</span>
        <span className="tabular text-2xl font-bold text-signal">{score}<span className="micro text-fg-3">/100</span></span>
      </div>
    </div>
  );
}
