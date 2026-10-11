import { describe, expect, it } from "vitest";
import { confidenceOf, coverageGrowth, creatorsOf, formatShares, momentumLabel, momentumSeries, suggestedLength, velocityRatio, viewHistory } from "@/lib/trends/metrics";
import { NOW, sig, video } from "./fixtures";

const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

describe("momentum", () => {
  it("coverage growth compares newer vs older half of the window", () => {
    const dates = [hoursAgo(10), hoursAgo(20), hoursAgo(30), hoursAgo(40), hoursAgo(100), hoursAgo(120)];
    expect(coverageGrowth(dates, 7, NOW)).toBe(1); // 4 new vs 2 old
  });
  it("refuses to call a direction with fewer than 4 videos", () => {
    expect(coverageGrowth([hoursAgo(1), hoursAgo(2), hoursAgo(3)], 7, NOW)).toBeNull();
  });
  it("labels BUILDING BASELINE when there's no evidence at all", () => {
    expect(momentumLabel(null, null)).toEqual({ label: "BUILDING BASELINE", basis: "insufficient" });
  });
  it("labels RISING / COOLING / STABLE", () => {
    expect(momentumLabel(0.5, null).label).toBe("RISING");
    expect(momentumLabel(-0.5, null).label).toBe("COOLING");
    expect(momentumLabel(0.1, null).label).toBe("STABLE");
    expect(momentumLabel(0.5, 0.2).label).toBe("STABLE");
    expect(momentumLabel(null, 1.2)).toEqual({ label: "RISING", basis: "coverage+snapshots" });
  });
  it("velocity ratio needs two videos with history", () => {
    expect(velocityRatio([sig({ videoId: "a", snapshotViewsPerHour: 100 })]).ratio).toBeNull();
    expect(velocityRatio([sig({ videoId: "a", snapshotViewsPerHour: 400 }), sig({ videoId: "b", snapshotViewsPerHour: 200 })]).ratio).toBeCloseTo(0.75);
  });
  it("daily series covers the lookback and accumulates", () => {
    const s = momentumSeries([hoursAgo(1), hoursAgo(2), hoursAgo(50)], 7, NOW);
    expect(s).toHaveLength(7);
    expect(s.at(-1)!.cumulative).toBe(3);
  });
  it("view history is empty until a video has two snapshots", () => {
    expect(viewHistory({ a: [{ videoId: "a", capturedAt: hoursAgo(1), views: 10, likes: 0, comments: 0 }] }, ["a"])).toEqual([]);
    const h = viewHistory(
      {
        a: [
          { videoId: "a", capturedAt: hoursAgo(24), views: 100, likes: 0, comments: 0 },
          { videoId: "a", capturedAt: hoursAgo(0), views: 150, likes: 0, comments: 0 },
        ],
      },
      ["a"],
    );
    expect(h.map((p) => p.index)).toEqual([1, 1.5]);
  });
});

describe("cluster facts", () => {
  it("format shares are computed from classifications, not from AI percentages", () => {
    const shares = formatShares(["a", "b", "c", "d"], { a: "Tutorial", b: "Tutorial", c: "Review" }, {});
    expect(shares[0]).toMatchObject({ format: "Tutorial", count: 2 });
    expect(shares[0].share).toBeCloseTo(2 / 3);
  });
  it("groups creators by channel", () => {
    const c = creatorsOf([video({ id: "a", channelId: "x" }), video({ id: "b", channelId: "x" }), video({ id: "c", channelId: "y" })]);
    expect(c[0]).toMatchObject({ channelId: "x", videoCount: 2, totalViews: 20000 });
  });
  it("suggested length is the median of the faster half, rounded to a minute", () => {
    const vids = [video({ id: "a", durationSeconds: 610 }), video({ id: "b", durationSeconds: 900 }), video({ id: "c", durationSeconds: 3000 })];
    const signals = { a: sig({ videoId: "a", viewsPerHour: 900 }), b: sig({ videoId: "b", viewsPerHour: 800 }), c: sig({ videoId: "c", viewsPerHour: 10 }) };
    expect(suggestedLength(vids, signals)).toBe(780); // median(610, 900) = 755 → 13 min
  });
  it("confidence reflects sample size and momentum basis", () => {
    const m = { videoCount: 8, creatorCount: 6 } as Parameters<typeof confidenceOf>[0];
    expect(confidenceOf(m, "coverage").confidence).toBe("HIGH");
    expect(confidenceOf(m, "insufficient").confidence).toBe("MEDIUM");
    expect(confidenceOf({ ...m, videoCount: 2, creatorCount: 2 }, "coverage").confidence).toBe("LOW");
  });
});
