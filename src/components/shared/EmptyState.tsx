import { RunRadarButton } from "./RunRadarButton";

export function EmptyState({
  title = "NO STRONG SIGNALS YET.",
  body = "Try expanding your lookback window or adding another category.",
  action = true,
}: {
  title?: string;
  body?: string;
  action?: boolean;
}) {
  return (
    <section className="relative mx-auto flex min-h-[60vh] max-w-5xl flex-col items-start justify-center gap-6 px-4 py-24 md:px-10" aria-live="polite">
      <span className="micro text-signal">Radar idle</span>
      <h2 className="display-xl text-5xl md:text-8xl">{title}</h2>
      <p className="max-w-xl font-serif text-xl text-fg-2 md:text-2xl">{body}</p>
      {action && <RunRadarButton />}
    </section>
  );
}
