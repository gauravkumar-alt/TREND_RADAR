/** Normalisation helpers. All return values in [0, 1]; null inputs stay null. */

export function minMax(values: (number | null)[]): (number | null)[] {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!nums.length) return values.map(() => null);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return values.map((v) => {
    if (v == null || !Number.isFinite(v)) return null;
    if (max === min) return 1; // every candidate is equal: nobody is penalised
    return (v - min) / (max - min);
  });
}

/** Min-max on log10(1+x): view counts are heavy-tailed, so one viral video shouldn't flatten everything else. */
export function logMinMax(values: (number | null)[]): (number | null)[] {
  return minMax(values.map((v) => (v == null || v < 0 ? null : Math.log10(1 + v))));
}

export function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function mean(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export function median(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

export function sum(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}
