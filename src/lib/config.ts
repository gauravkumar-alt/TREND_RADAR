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
