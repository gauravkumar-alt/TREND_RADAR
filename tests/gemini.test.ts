import { describe, expect, it, vi } from "vitest";
import { validateAnalysis, validateBrief } from "@/lib/gemini/schemas";
import { analyzeClusters } from "@/lib/gemini/analyze";
import { parseJsonLoose } from "@/lib/gemini/client";
import { toRunSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import type { PreparedVideo } from "@/lib/trends/prepare";
import { NOW } from "./fixtures";

const rows: PreparedVideo[] = Array.from({ length: 16 }, (_, i) => ({
  ref: `v${i + 1}`,
  id: `id${i + 1}`,
  title: `t${i}`,
  channel: `ch${i % 8}`,
  ageHours: 10,
  durationMin: 10,
  views: 100,
  likes: 1,
  comments: 1,
  viewsPerHour: 10,
  engagementPct: 2,
  category: "AI Tools",
  description: "",
}));
const refToId = new Map(rows.map((r) => [r.ref, r.id]));
const channelOf = new Map(rows.map((r) => [r.id, r.channel]));

const cluster = (name: string, refs: string[]) => ({
  name,
  summary: "s",
  videoRefs: refs,
  whyNow: "w",
  momentumNarrative: "m",
  audienceSignals: ["a"],
  formats: refs.map((ref) => ({ ref, format: "Tutorial" })),
  recommendation: { shouldCover: true, reason: "r", angle: "a", possibleTitle: "T", format: "Comparison" },
});
const good = { clusters: [cluster("A", ["v1", "v2", "v3"]), cluster("B", ["v4", "v5"]), cluster("C", ["v6", "v7", "v8"])] };

describe("Gemini validation", () => {
  it("accepts grounded output and maps refs back to real ids", () => {
    const r = validateAnalysis(good, refToId, channelOf);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clusters[0].videoIds).toEqual(["id1", "id2", "id3"]);
      expect(r.clusters[0].videoFormats.id1).toBe("Tutorial");
    }
  });
  it("discards invented video refs", () => {
    const r = validateAnalysis({ clusters: [cluster("A", ["v1", "v2", "v999"]), good.clusters[1], good.clusters[2]] }, refToId, channelOf);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.clusters[0].videoIds).toEqual(["id1", "id2"]);
  });
  it("rejects clusters made of one channel", () => {
    // v1 and v9 are both ch0
    const r = validateAnalysis({ clusters: [cluster("Solo", ["v1", "v9"]), good.clusters[1], good.clusters[2]] }, refToId, channelOf);
    expect(r.ok).toBe(false);
  });
  it("never lets a video sit in two clusters", () => {
    const r = validateAnalysis({ clusters: [...good.clusters, cluster("D", ["v1", "v2", "v10", "v11"])] }, refToId, channelOf);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.clusters[3].videoIds).toEqual(["id10", "id11"]);
  });
  it("rejects bad formats and too few clusters", () => {
    const bad = { clusters: [{ ...cluster("A", ["v1", "v2"]), recommendation: { ...good.clusters[0].recommendation, format: "Vlog" } }] };
    expect(validateAnalysis(bad, refToId, channelOf).ok).toBe(false);
    expect(validateAnalysis({ clusters: good.clusters.slice(0, 2) }, refToId, channelOf).ok).toBe(false);
    expect(validateAnalysis({ nope: true }, refToId, channelOf).ok).toBe(false);
  });
  it("caps at five clusters", () => {
    const many = { clusters: Array.from({ length: 7 }, (_, i) => cluster(`C${i}`, [`v${i * 2 + 1}`, `v${i * 2 + 2}`])) };
    const r = validateAnalysis(many, refToId, channelOf);
    expect(r.ok && r.clusters.length).toBe(5);
  });
  it("strips code fences before parsing", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("validates the brief references real clusters", () => {
    const brief = {
      headline: "h",
      dek: "d",
      topStory: { clusterId: "c1", whyItMatters: "w", recommendedAction: "r" },
      opportunities: [{ clusterId: "c2", whyNow: "w", recommendation: "r" }, { clusterId: "c1", whyNow: "w", recommendation: "r" }],
      mondayPlan: { clusterId: "c1", film: "f", format: "Tutorial", angle: "a", title: "t", why: "y" },
    };
    const ok = validateBrief(brief, ["c1", "c2"]);
    expect(ok.ok && ok.brief.opportunities.map((o) => o.clusterId)).toEqual(["c1", "c2"]);
    expect(validateBrief({ ...brief, topStory: { ...brief.topStory, clusterId: "c9" } }, ["c1", "c2"]).ok).toBe(false);
    expect(validateBrief(brief, ["c1", "c2", "c3"]).ok).toBe(false);
  });
});

describe("Gemini retry", () => {
  const settings = toRunSettings(DEFAULT_SETTINGS);
  it("retries once with feedback after invalid output, then succeeds", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ clusters: good.clusters.slice(0, 1) }))
      .mockResolvedValueOnce(JSON.stringify(good));
    const clusters = await analyzeClusters(rows, settings, NOW, generate);
    expect(clusters).toHaveLength(3);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].prompt).toContain("failed validation");
  });
  it("gives up after two invalid answers with a GEMINI_INVALID error", async () => {
    const generate = vi.fn().mockResolvedValue("not json at all");
    await expect(analyzeClusters(rows, settings, NOW, generate)).rejects.toMatchObject({ code: "GEMINI_INVALID" });
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
