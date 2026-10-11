import { describe, expect, it } from "vitest";
import { compactDescription, prepareForClustering, toPromptTable } from "@/lib/trends/prepare";
import { NOW, sig, video } from "./fixtures";

describe("cluster preparation", () => {
  const signals = (ids: string[], vph: (i: number) => number = (i) => 100 - i) =>
    Object.fromEntries(ids.map((id, i) => [id, sig({ videoId: id, viewsPerHour: vph(i) })]));

  it("drops Shorts, duplicates and out-of-window uploads", () => {
    const vids = [
      video({ id: "a" }),
      video({ id: "a" }),
      video({ id: "short", durationSeconds: 45 }),
      video({ id: "tagged", title: "Crazy AI trick #shorts" }),
      video({ id: "old", publishedAt: new Date(NOW.getTime() - 20 * 86400_000).toISOString() }),
      video({ id: "b" }),
    ];
    const rows = prepareForClustering(vids, signals(vids.map((v) => v.id)), { lookbackDays: 7, now: NOW });
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });
  it("orders by velocity and assigns short refs", () => {
    const vids = [video({ id: "slow" }), video({ id: "fast" })];
    const rows = prepareForClustering(vids, { slow: sig({ videoId: "slow", viewsPerHour: 1 }), fast: sig({ videoId: "fast", viewsPerHour: 999 }) }, { lookbackDays: 7, now: NOW });
    expect(rows.map((r) => [r.ref, r.id])).toEqual([["v1", "fast"], ["v2", "slow"]]);
  });
  it("caps any single channel so one creator can't fake a trend", () => {
    const vids = Array.from({ length: 10 }, (_, i) => video({ id: `x${i}`, channelId: "same" }));
    const rows = prepareForClustering(vids, signals(vids.map((v) => v.id)), { lookbackDays: 7, now: NOW, maxPerChannel: 3 });
    expect(rows).toHaveLength(3);
  });
  it("respects the max video budget", () => {
    const vids = Array.from({ length: 30 }, (_, i) => video({ id: `v${i}` }));
    expect(prepareForClustering(vids, signals(vids.map((v) => v.id)), { lookbackDays: 7, now: NOW, maxVideos: 12 })).toHaveLength(12);
  });
  it("compacts descriptions and keeps the table pipe-safe", () => {
    expect(compactDescription("Try it https://x.co/abc #ai #tools\n\nGreat tool")).toBe("Try it Great tool");
    expect(compactDescription("a".repeat(300)).length).toBe(160);
    const rows = prepareForClustering([video({ id: "p", title: "A | B" })], signals(["p"]), { lookbackDays: 7, now: NOW });
    expect(toPromptTable(rows)).toContain("A / B");
  });
  it("sends unknown metrics as '?' rather than zero", () => {
    const rows = prepareForClustering([video({ id: "h", likes: null })], signals(["h"]), { lookbackDays: 7, now: NOW });
    expect(toPromptTable(rows).split("\n")[1]).toContain("| ? |");
  });
});
