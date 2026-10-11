import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { compact, ago, ytUrl } from "@/lib/format";
import { formatDuration } from "@/lib/youtube/duration";
import { cn } from "@/lib/utils";
import type { Video, VideoSignals } from "@/lib/types";

/**
 * One reel stage. `variant="stage"` fills the viewport inside the pinned reel;
 * `variant="card"` is the stacked mobile / reduced-motion layout.
 */
export function TrendingVideo({
  video,
  signals,
  index,
  total,
  variant = "stage",
  priority = false,
}: {
  video: Video;
  signals?: VideoSignals;
  index: number;
  total: number;
  variant?: "stage" | "card";
  priority?: boolean;
}) {
  const stage = variant === "stage";
  const meta: [string, string][] = [
    ["Views", compact(video.views)],
    ["Likes", video.likes == null ? "Hidden" : compact(video.likes)],
    ["Comments", video.comments == null ? "Off" : compact(video.comments)],
    ["Duration", formatDuration(video.durationSeconds)],
    ["Published", ago(video.publishedAt)],
    ["Views / hour", signals?.viewsPerHour == null ? "—" : compact(signals.viewsPerHour)],
  ];
  return (
    <article
      {...(stage ? { "data-reel-stage": true } : {})}
      className={cn(stage ? "absolute inset-0 grid grid-cols-[1.55fr_1fr] gap-10 px-8 pb-20 pt-10" : "flex flex-col gap-5 border-t border-line py-10")}
      aria-label={`Live signal ${index + 1} of ${total}: ${video.title}`}
    >
      <a
        href={ytUrl(video.id)}
        target="_blank"
        rel="noopener noreferrer"
        data-reel-media
        className={cn("group relative block overflow-hidden bg-bg-3", stage ? "h-full" : "aspect-video w-full")}
        aria-label={`Watch "${video.title}" on YouTube (opens in a new tab)`}
      >
        <Image
          data-reel-img
          src={video.thumbnailUrl}
          alt=""
          fill
          priority={priority}
          sizes={stage ? "60vw" : "100vw"}
          className="object-cover will-change-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" aria-hidden />
        <span className="micro absolute left-4 top-4 flex items-center gap-2 bg-signal px-2 py-1 text-signal-ink">
          <span className="size-1.5 rounded-full bg-signal-ink" /> Live signal
        </span>
        <span className="micro absolute bottom-4 right-4 flex items-center gap-1 bg-bg/80 px-2 py-1 text-fg opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Watch on YouTube <ArrowUpRight className="size-3.5" aria-hidden />
        </span>
      </a>

      <div className={cn("flex flex-col", stage ? "justify-end gap-6 pb-2" : "gap-4")}>
        <div className="overflow-hidden">
          <span data-reel-text className="micro block text-signal">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} · {video.sourceCategory}
          </span>
        </div>
        <div className="overflow-hidden">
          <h3 data-reel-text className={cn("font-display font-bold leading-[1.02] tracking-tight", stage ? "text-[clamp(28px,3.2vw,56px)]" : "text-2xl")}>
            <a href={ytUrl(video.id)} target="_blank" rel="noopener noreferrer" className="hover:text-signal">
              {video.title}
            </a>
          </h3>
        </div>
        <div className="overflow-hidden">
          <p data-reel-text className="font-serif text-xl italic text-fg-2">
            {video.channelTitle}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-4 border-t border-line pt-5">
          {meta.map(([k, v]) => (
            <div key={k} data-reel-meta className="flex flex-col gap-1">
              <dt className="micro text-fg-3">{k}</dt>
              <dd className="tabular text-lg font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
