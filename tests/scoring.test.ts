import { describe, expect, it } from "vitest";
import { WEIGHTS, creatorDiversity, formatLift, recencyOf, scoreClusters, type ScoringInput } from "@/lib/trends/scoring";
import { sig } from "./fixtures";

const cluster = (n: number, opts: { channels?: number; vph?: number; eng?: number; age?: number; growth?: number | null } = {}): ScoringInput => {
  const ids = Array.from({ length: n }, (_, i) => `v${i}`);
  return {
    videoIds: ids,
    channelIds: ids.map((_, i) => `ch${i % (opts.channels ?? n)}`),
    signals: ids.map((id) => sig({ videoId: id, viewsPerHour: opts.vph ?? 100, engagementRate: opts.eng ?? 0.03, ageHours: opts.age ?? 48 })),
    formats: ids.map(() => "Tutorial" as const),
    coverageGrowth: opts.growth ?? null,
    lookbackHours: 168,
  };
};

describe("trend scoring", () => {
  it("weights sum to 100%", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("produces integer scores in 0–100", () => {
    const scores = scoreClusters([cluster(3), cluster(8, { vph: 900 }), cluster(5)]);
    for (const s of scores) {
      expect(Number.isInteger(s.score)).toBe(true);
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });
  it("ranks a bigger, faster, more diverse, fresher cluster higher", () => {
    const [weak, strong] = scoreClusters([
      cluster(3, { channels: 1, vph: 50, eng: 0.01, age: 150, growth: -0.5 }),
      cluster(9, { channels: 9, vph: 2000, eng: 0.06, age: 20, growth: 1 }),
    ]);
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.breakdown.creatorDiversity).toBe(1);
    expect(weak.breakdown.topicFrequency).toBe(0);
  });
  it("missing data lowers a component to 0 instead of inventing a value", () => {
    const c = cluster(4);
    c.signals = c.signals.map((s) => ({ ...s, engagementRate: null }));
    const [s] = scoreClusters([c, cluster(4)]);
    expect(s.breakdown.engagement).toBe(0);
  });
  it("creator diversity rewards many channels over one prolific channel", () => {
    expect(creatorDiversity(["a", "b", "c", "d"])).toBeGreaterThan(creatorDiversity(["a", "a", "a", "b"]));
    expect(creatorDiversity([])).toBe(0);
  });
  it("recency is 1 when brand-new and 0 at the window edge", () => {
    expect(recencyOf(0, 168)).toBe(1);
    expect(recencyOf(168, 168)).toBe(0);
    expect(recencyOf(400, 168)).toBe(0);
  });
  it("format lift compares the leading format to the cluster median", () => {
    expect(formatLift(["Tutorial", "Tutorial", "Review"], [200, 200, 50])).toBeCloseTo(1);
    expect(formatLift(["Review", "Review", "Tutorial"], [400, 400, 100])).toBe(1);
    expect(formatLift([null, null], [1, 2])).toBeNull();
  });
});
