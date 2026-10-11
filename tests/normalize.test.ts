import { describe, expect, it } from "vitest";
import { logMinMax, mean, median, minMax, sum } from "@/lib/trends/normalize";

describe("normalisation", () => {
  it("min-max scales to [0,1] and keeps nulls", () => {
    expect(minMax([10, 20, null, 30])).toEqual([0, 0.5, null, 1]);
  });
  it("gives everyone 1 when all values are equal", () => {
    expect(minMax([5, 5, 5])).toEqual([1, 1, 1]);
  });
  it("returns all nulls when there is no data", () => {
    expect(minMax([null, null])).toEqual([null, null]);
  });
  it("log scaling compresses a viral outlier", () => {
    const [a, b, c] = logMinMax([100, 1000, 1_000_000]) as number[];
    expect(a).toBe(0);
    expect(c).toBe(1);
    expect(b).toBeGreaterThan(0.1); // linear would give ~0.0009
  });
  it("mean/median/sum ignore nulls", () => {
    expect(mean([1, null, 3])).toBe(2);
    expect(median([5, 1, null, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(sum([null, null])).toBeNull();
    expect(mean([])).toBeNull();
  });
});
