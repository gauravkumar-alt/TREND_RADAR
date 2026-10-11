import type { Video, VideoSignals } from "@/lib/types";

export const NOW = new Date("2026-10-11T03:00:00.000Z");

export function video(over: Partial<Video> & { id: string }): Video {
  return {
    title: `Video ${over.id}`,
    description: "",
    channelId: `ch-${over.id}`,
    channelTitle: `Channel ${over.id}`,
    publishedAt: new Date(NOW.getTime() - 24 * 3600_000).toISOString(),
    thumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg",
    durationSeconds: 600,
    views: 10_000,
    likes: 500,
    comments: 50,
    regionCode: "IN",
    categoryId: "28",
    sourceCategory: "AI Tools",
    source: "search",
    fetchedAt: NOW.toISOString(),
    ...over,
  };
}

export function sig(over: Partial<VideoSignals> & { videoId: string }): VideoSignals {
  return {
    ageHours: 24,
    engagementRate: 0.05,
    viewsPerHour: 400,
    viewsPerDay: 9600,
    snapshotViewsPerHour: null,
    snapshotViewGrowth: null,
    snapshotEngagementGrowth: null,
    snapshotSpanHours: null,
    ...over,
  };
}
