import { cn } from "@/lib/utils";
import { Provenance } from "./Provenance";
import type { Provenance as P } from "@/lib/types";

export function Metric({
  label,
  value,
  sub,
  kind,
  size = "md",
  className,
  valueRef,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  kind?: P;
  size?: "sm" | "md" | "lg";
  className?: string;
  valueRef?: React.Ref<HTMLSpanElement>;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-2">
        <span className="micro text-fg-3">{label}</span>
        {kind && <Provenance kind={kind} />}
      </div>
      <span
        ref={valueRef}
        className={cn(
          "tabular font-display font-semibold tracking-tight text-fg",
          size === "sm" && "text-lg",
          size === "md" && "text-2xl md:text-3xl",
          size === "lg" && "text-4xl md:text-6xl",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-fg-3">{sub}</span>}
    </div>
  );
}
