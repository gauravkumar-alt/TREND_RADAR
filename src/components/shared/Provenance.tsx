import { cn } from "@/lib/utils";
import type { Provenance as P } from "@/lib/types";

const LABEL: Record<P, string> = {
  observed: "Observed",
  calculated: "Calculated",
  ai: "AI interpretation",
  recommendation: "Recommendation",
};
const STYLE: Record<P, string> = {
  observed: "border-fg-3/60 text-fg-2",
  calculated: "border-signal/60 text-signal",
  ai: "border-dashed border-fg-2/70 text-fg-2",
  recommendation: "border-signal bg-signal text-signal-ink",
};
const HINT: Record<P, string> = {
  observed: "Straight from the YouTube Data API",
  calculated: "Computed by TREND//RADAR from observed data",
  ai: "Written by Gemini Flash from the data; not a measurement",
  recommendation: "What to do with it",
};

/** Every insight carries exactly one of these tags. */
export function Provenance({ kind, className }: { kind: P; className?: string }) {
  return (
    <span title={HINT[kind]} className={cn("micro inline-flex h-5 items-center border px-1.5 text-[9.5px] tracking-[0.14em]", STYLE[kind], className)}>
      {LABEL[kind]}
    </span>
  );
}
