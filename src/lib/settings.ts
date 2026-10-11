import { z } from "zod";
import { CATEGORY_PRESETS, DEFAULT_CATEGORY_IDS, LANGUAGES, REGIONS, type CategoryDef } from "./config";
import type { RunSettingsSnapshot } from "./types";

const keyword = z.string().trim().min(2).max(60);

export const customCategorySchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, digits and dashes"),
  label: z.string().trim().min(2).max(40),
  keywords: z.array(keyword).min(1).max(3),
});

export const settingsSchema = z
  .object({
    creatorName: z.string().trim().min(1).max(40).default("Ishaan"),
    categoryIds: z.array(z.string()).min(1, "Pick at least one category").max(5, "Pick at most five categories"),
    customCategories: z.array(customCategorySchema).max(5).default([]),
    regionCode: z.string().refine((c) => REGIONS.some((r) => r.code === c), "Unknown region"),
    language: z.string().refine((c) => LANGUAGES.some((l) => l.code === c), "Unknown language"),
    lookbackDays: z.number().int().min(1).max(30),
    videosPerCategory: z.number().int().min(5).max(50),
    email: z.union([z.string().trim().email(), z.literal("")]).default(""),
    emailEnabled: z.boolean().default(false),
  })
  .superRefine((s, ctx) => {
    const known = new Set([...CATEGORY_PRESETS.map((c) => c.id), ...s.customCategories.map((c) => c.id)]);
    for (const id of s.categoryIds) {
      if (!known.has(id)) ctx.addIssue({ code: "custom", path: ["categoryIds"], message: `Unknown category "${id}"` });
    }
    if (s.emailEnabled && !s.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Add an email address to receive the brief" });
    }
  });

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  creatorName: "Ishaan",
  categoryIds: DEFAULT_CATEGORY_IDS,
  customCategories: [],
  regionCode: "IN",
  language: "en",
  lookbackDays: 7,
  videosPerCategory: 25,
  email: "",
  emailEnabled: false,
};

export function resolveCategories(s: Settings): CategoryDef[] {
  const all = [...CATEGORY_PRESETS, ...s.customCategories];
  return s.categoryIds.map((id) => all.find((c) => c.id === id)).filter((c): c is CategoryDef => Boolean(c));
}

export function toRunSettings(s: Settings): RunSettingsSnapshot {
  return {
    categories: resolveCategories(s),
    regionCode: s.regionCode,
    language: s.language,
    lookbackDays: s.lookbackDays,
    videosPerCategory: s.videosPerCategory,
    creatorName: s.creatorName,
  };
}

/** Stable key so identical scans can be reused instead of spending quota again. */
export function runSettingsKey(r: RunSettingsSnapshot) {
  return JSON.stringify([
    r.categories.map((c) => [c.id, c.keywords]).sort(),
    r.regionCode,
    r.language,
    r.lookbackDays,
    r.videosPerCategory,
  ]);
}

/** Overrides accepted by /api/radar/run (from the Trends filter bar). */
export const runOverridesSchema = z
  .object({
    regionCode: z.string().optional(),
    lookbackDays: z.number().int().min(1).max(30).optional(),
    categoryIds: z.array(z.string()).min(1).max(5).optional(),
    force: z.boolean().optional(),
  })
  .default({});

export function applyOverrides(s: Settings, o: z.infer<typeof runOverridesSchema>): Settings {
  const merged = {
    ...s,
    ...(o.regionCode ? { regionCode: o.regionCode } : {}),
    ...(o.lookbackDays ? { lookbackDays: o.lookbackDays } : {}),
    ...(o.categoryIds ? { categoryIds: o.categoryIds } : {}),
  };
  return settingsSchema.parse(merged);
}
