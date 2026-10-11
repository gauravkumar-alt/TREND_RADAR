import { ArrowUpRight } from "lucide-react";
import { channelUrl, compact } from "@/lib/format";
import type { TrendCluster } from "@/lib/types";

export function CreatorCoverage({ creators }: { creators: TrendCluster["creators"] }) {
  const shown = creators.slice(0, 8);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <span className="tabular font-display text-5xl font-bold">{creators.length}</span>
        <span className="micro text-fg-3">creators covering this</span>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {shown.map((c) => (
          <li key={c.channelId}>
            <a href={channelUrl(c.channelId)} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 py-2.5 text-sm hover:text-signal">
              <span className="flex-1 truncate font-medium">{c.channelTitle}</span>
              <span className="micro tabular text-fg-3">
                {c.videoCount} video{c.videoCount > 1 ? "s" : ""} · {compact(c.totalViews)} views
              </span>
              <ArrowUpRight className="size-3.5 text-fg-3 group-hover:text-signal" aria-hidden />
              <span className="sr-only">(opens YouTube)</span>
            </a>
          </li>
        ))}
      </ul>
      {creators.length > shown.length && <p className="micro text-fg-3">+ {creators.length - shown.length} more</p>}
    </div>
  );
}
