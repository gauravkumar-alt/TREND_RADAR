import { cn } from "@/lib/utils";

export function SectionLabel({ index, children, className }: { index?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("micro flex items-center gap-3 text-fg-3", className)}>
      {index && <span className="text-signal">{index}</span>}
      <span className="h-px w-8 bg-line-2" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
