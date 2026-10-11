import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, applyOverrides, resolveCategories, runSettingsKey, settingsSchema, toRunSettings } from "@/lib/settings";

describe("settings", () => {
  it("defaults target Ishaan: India, AI tools / productivity / tech reviews, 7 days", () => {
    expect(settingsSchema.parse(DEFAULT_SETTINGS)).toMatchObject({ regionCode: "IN", lookbackDays: 7, creatorName: "Ishaan" });
    expect(resolveCategories(DEFAULT_SETTINGS).map((c) => c.label)).toEqual(["AI Tools", "Productivity", "Tech Reviews"]);
  });
  it("rejects unknown regions, empty categories and out-of-range windows", () => {
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, regionCode: "XX" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, categoryIds: [] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, lookbackDays: 90 }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, categoryIds: ["nope"] }).success).toBe(false);
  });
  it("requires an email when email delivery is on", () => {
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, emailEnabled: true, email: "" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, emailEnabled: true, email: "ishaan@example.com" }).success).toBe(true);
  });
  it("supports custom categories", () => {
    const s = settingsSchema.parse({
      ...DEFAULT_SETTINGS,
      customCategories: [{ id: "ev-tech", label: "EV Tech", keywords: ["electric scooter review"] }],
      categoryIds: ["ai-tools", "ev-tech"],
    });
    expect(resolveCategories(s).map((c) => c.label)).toEqual(["AI Tools", "EV Tech"]);
  });
  it("applies scan overrides and validates the result", () => {
    expect(applyOverrides(DEFAULT_SETTINGS, { regionCode: "US", lookbackDays: 14 })).toMatchObject({ regionCode: "US", lookbackDays: 14 });
    expect(() => applyOverrides(DEFAULT_SETTINGS, { regionCode: "ZZ" })).toThrow();
  });
  it("settings key is stable for identical scans and differs otherwise", () => {
    const a = runSettingsKey(toRunSettings(DEFAULT_SETTINGS));
    expect(runSettingsKey(toRunSettings({ ...DEFAULT_SETTINGS, email: "x@y.z" }))).toBe(a);
    expect(runSettingsKey(toRunSettings({ ...DEFAULT_SETTINGS, regionCode: "US" }))).not.toBe(a);
  });
});
