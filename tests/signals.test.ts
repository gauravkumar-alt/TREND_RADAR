import { describe, expect, it } from "vitest";
import { ageHours, computeSignals, engagementRate, snapshotVelocity, viewsPerHour } from "@/lib/trends/signals";
import { NOW, video } from "./fixtures";

describe("engagement", () => {
  it("is (likes + comments) / views", () => {
    expect(engagementRate({ views: 1000, likes: 40, comments: 10 })).toBeCloseTo(0.05);
  });
  it("treats one hidden metric as zero but both hidden as unknown", () => {
    expect(engagementRate({ views: 1000, likes: null, comments: 10 })).toBeCloseTo(0.01);
    expect(engagementRate({ views: 1000, likes: null, comments: null })).toBeNull();
  });
  it("is null with zero or unknown views (never divides by zero)", () => {
    expect(engagementRate({ views: 0, likes: 1, comments: 1 })).toBeNull();
    expect(engagementRate({ views: null, likes: 1, comments: 1 })).toBeNull();
  });
});

describe("velocity", () => {
  it("views per hour uses age since publish", () => {
    expect(viewsPerHour(2400, 24)).toBe(100);
    expect(viewsPerHour(null, 24)).toBeNull();
  });
  it("floors age at one hour", () => {
    expect(ageHours(NOW.toISOString(), NOW)).toBe(1);
  });
  it("is null (BUILDING BASELINE) with fewer than two snapshots", () => {
    const v = snapshotVelocity([{ videoId: "a", capturedAt: NOW.toISOString(), views: 10, likes: 1, comments: 1 }]);
    expect(v.snapshotViewsPerHour).toBeNull();
    expect(v.snapshotViewGrowth).toBeNull();
  });
  it("measures growth between the first and last snapshot", () => {
    const t0 = new Date(NOW.getTime() - 24 * 3600_000).toISOString();
    const v = snapshotVelocity([
      { videoId: "a", capturedAt: NOW.toISOString(), views: 3400, likes: 150, comments: 50 },
      { videoId: "a", capturedAt: t0, views: 1000, likes: 80, comments: 20 },
    ]);
    expect(v.snapshotViewsPerHour).toBe(100);
    expect(v.snapshotViewGrowth).toBeCloseTo(2.4);
    expect(v.snapshotEngagementGrowth).toBeCloseTo(1);
    expect(v.snapshotSpanHours).toBe(24);
  });
  it("ignores snapshots taken too close together", () => {
    const t0 = new Date(NOW.getTime() - 10 * 60_000).toISOString();
    const v = snapshotVelocity([
      { videoId: "a", capturedAt: t0, views: 1000, likes: 1, comments: 1 },
      { videoId: "a", capturedAt: NOW.toISOString(), views: 1100, likes: 1, comments: 1 },
    ]);
    expect(v.snapshotViewsPerHour).toBeNull();
  });
  it("computeSignals combines lifetime and snapshot velocity", () => {
    const s = computeSignals(video({ id: "a", views: 4800 }), [], NOW);
    expect(s.ageHours).toBe(24);
    expect(s.viewsPerHour).toBe(200);
    expect(s.viewsPerDay).toBe(4800);
    expect(s.snapshotViewsPerHour).toBeNull();
  });
});
