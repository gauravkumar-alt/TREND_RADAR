import Image from "next/image";
import { ago, compact, ytUrl } from "@/lib/format";
import { formatDuration } from "@/lib/youtube/duration";
import type { Video, VideoFormat } from "@/lib/types";

export function EvidenceVideos({ videos, formats }: { videos: Video[]; formats: Record<string, VideoFormat> }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {videos.slice(0, 5).map((v) => (
          <li key={v.id}>
            <a href={ytUrl(v.id)} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-3" aria-label={`${v.title} by ${v.channelTitle} — opens YouTube`}>
              <div className="relative aspect-video overflow-hidden bg-bg-3">
                <Image src={v.thumbnailUrl} alt="" fill sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <span className="micro tabular absolute bottom-2 right-2 bg-bg/85 px-1.5 py-0.5 text-fg">{formatDuration(v.durationSeconds)}</span>
                {formats[v.id] && <span className="micro absolute left-2 top-2 bg-bg/85 px-1.5 py-0.5 text-fg-2">{formats[v.id]}</span>}
              </div>
              <p className="line-clamp-2 font-medium leading-snug group-hover:text-signal">{v.title}</p>
              <p className="micro text-fg-3">
                {v.channelTitle} · {ago(v.publishedAt)}
              </p>
              <dl className="micro tabular flex gap-4 text-fg-2">
                <div className="flex gap-1">
                  <dt className="text-fg-3">Views</dt>
                  <dd>{compact(v.views)}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-fg-3">Likes</dt>
                  <dd>{v.likes == null ? "hidden" : compact(v.likes)}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="text-fg-3">Comments</dt>
                  <dd>{v.comments == null ? "off" : compact(v.comments)}</dd>
                </div>
              </dl>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
