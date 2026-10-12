/**
 * Category presets and region/language options. Users can enable any preset
 * and add their own categories (label + search keywords) in /settings.
 */

export interface CategoryDef {
  id: string;
  label: string;
  keywords: string[];
}

export const CATEGORY_PRESETS: CategoryDef[] = [
  { id: "ai-tools", label: "AI Tools", keywords: ["AI tools", "AI agent tutorial"] },
  { id: "productivity", label: "Productivity", keywords: ["productivity apps", "productivity workflow AI"] },
  { id: "tech-reviews", label: "Tech Reviews", keywords: ["tech review India", "gadget review"] },
  { id: "ai-coding", label: "AI Coding", keywords: ["AI coding agent", "vibe coding"] },
  { id: "smartphones", label: "Smartphones", keywords: ["smartphone review India", "best phone under"] },
  { id: "laptops", label: "Laptops & PCs", keywords: ["laptop review India", "best laptop for students"] },
  { id: "creator-tools", label: "Creator Tools", keywords: ["YouTube creator tools", "video editing AI"] },
  { id: "tech-news", label: "Tech News", keywords: ["tech news this week", "AI news"] },
];

export const DEFAULT_CATEGORY_IDS = ["ai-tools", "productivity", "tech-reviews"];

export const REGIONS: { code: string; label: string }[] = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "SG", label: "Singapore" },
  { code: "AE", label: "UAE" },
  { code: "DE", label: "Germany" },
  { code: "ID", label: "Indonesia" },
  { code: "BR", label: "Brazil" },
];

/**
 * Where each scan region sits on the globe. `iso` is the ISO 3166-1 numeric
 * code used by the world map; small countries missing from the 1:110m map
 * (Singapore) fall back to the point.
 */
export const REGION_GEO: Record<string, { iso: string; lon: number; lat: number }> = {
  IN: { iso: "356", lon: 78.9, lat: 22.5 },
  US: { iso: "840", lon: -98.5, lat: 39.5 },
  GB: { iso: "826", lon: -2.5, lat: 54 },
  CA: { iso: "124", lon: -106, lat: 56 },
  AU: { iso: "036", lon: 134, lat: -25 },
  SG: { iso: "702", lon: 103.8, lat: 1.35 },
  AE: { iso: "784", lon: 54, lat: 24 },
  DE: { iso: "276", lon: 10.4, lat: 51 },
  ID: { iso: "360", lon: 113.9, lat: -2.5 },
  BR: { iso: "076", lon: -52, lat: -10 },
};

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
];

export const LOOKBACK_OPTIONS = [3, 7, 14, 30] as const;
export const VIDEOS_PER_CATEGORY_OPTIONS = [10, 15, 25, 35, 50] as const;

/** YouTube "Science & Technology" category — used for the region trending chart. */
export const YT_SCIENCE_TECH_CATEGORY = "28";

/** Long-form only: anything shorter is treated as a Short and left out of clustering. */
export const MIN_DURATION_SECONDS = 120;

/** Reuse a run with identical settings if it is younger than this (quota guard). */
export const RUN_REUSE_MINUTES = 20;

export function regionLabel(code: string) {
  return REGIONS.find((r) => r.code === code)?.label ?? code;
}

export function languageLabel(code: string) {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
