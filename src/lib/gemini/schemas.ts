import { z } from "zod";
import { VIDEO_FORMATS, type VideoFormat } from "../types";

const formatEnum = z.enum(VIDEO_FORMATS);
const text = (max: number) => z.string().trim().min(1).max(max);

export const geminiClusterSchema = z.object({
  name: text(60),
  keyword: z.string().trim().min(1).max(24).optional(),
  summary: text(400),
  videoRefs: z.array(z.string()).min(2),
  whyNow: text(600),
  momentumNarrative: text(400),
  audienceSignals: z.array(text(200)).min(1).max(5),
  formats: z.array(z.object({ ref: z.string(), format: formatEnum })),
  recommendation: z.object({
    shouldCover: z.boolean(),
    reason: text(500),
    angle: text(300),
    possibleTitle: text(110),
    format: formatEnum,
  }),
});

export const geminiAnalysisSchema = z.object({ clusters: z.array(geminiClusterSchema).min(1).max(8) });
export type GeminiAnalysis = z.infer<typeof geminiAnalysisSchema>;
export type GeminiCluster = z.infer<typeof geminiClusterSchema>;

export interface ValidatedCluster extends Omit<GeminiCluster, "videoRefs" | "formats"> {
  videoIds: string[];
  videoFormats: Record<string, VideoFormat>;
}

export type ValidationResult = { ok: true; clusters: ValidatedCluster[] } | { ok: false; problems: string[] };

/**
 * Schema check + grounding check. Any video ref Gemini didn't receive is
 * discarded; a video may only belong to one cluster; clusters need ≥2 videos
 * from ≥2 channels. Fewer than 3 surviving clusters = invalid.
 */
export function validateAnalysis(
  raw: unknown,
  refToId: Map<string, string>,
  channelOf: Map<string, string>,
  opts: { minClusters?: number; maxClusters?: number } = {},
): ValidationResult {
  const minClusters = opts.minClusters ?? 3;
  const maxClusters = opts.maxClusters ?? 5;
  const parsed = geminiAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, problems: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`) };
  }
  const problems: string[] = [];
  const used = new Set<string>();
  const clusters: ValidatedCluster[] = [];
  for (const c of parsed.data.clusters) {
    const unknown = c.videoRefs.filter((r) => !refToId.has(r));
    if (unknown.length) problems.push(`"${c.name}" referenced unknown videos ${unknown.slice(0, 3).join(", ")}`);
    const ids = [...new Set(c.videoRefs.filter((r) => refToId.has(r)).map((r) => refToId.get(r) as string))].filter((id) => !used.has(id));
    const channels = new Set(ids.map((id) => channelOf.get(id)));
    if (ids.length < 2 || channels.size < 2) {
      problems.push(`"${c.name}" needs at least 2 videos from 2 different channels`);
      continue;
    }
    ids.forEach((id) => used.add(id));
    const videoFormats: Record<string, VideoFormat> = {};
    for (const f of c.formats) {
      const id = refToId.get(f.ref);
      if (id && ids.includes(id)) videoFormats[id] = f.format;
    }
    const { videoRefs: _r, formats: _f, ...rest } = c;
    void _r;
    void _f;
    clusters.push({ ...rest, videoIds: ids, videoFormats });
  }
  if (clusters.length < minClusters) {
    return { ok: false, problems: [...problems, `only ${clusters.length} usable clusters; need ${minClusters}-${maxClusters}`] };
  }
  return { ok: true, clusters: clusters.slice(0, maxClusters) };
}

// ---- Gemini responseSchema (OpenAPI subset) ------------------------------------
const S = (type: string, extra: Record<string, unknown> = {}) => ({ type, ...extra });
const FORMAT_ENUM = S("STRING", { enum: [...VIDEO_FORMATS] });

export const ANALYSIS_RESPONSE_SCHEMA = S("OBJECT", {
  properties: {
    clusters: S("ARRAY", {
      items: S("OBJECT", {
        properties: {
          name: S("STRING"),
          keyword: S("STRING"),
          summary: S("STRING"),
          videoRefs: S("ARRAY", { items: S("STRING") }),
          whyNow: S("STRING"),
          momentumNarrative: S("STRING"),
          audienceSignals: S("ARRAY", { items: S("STRING") }),
          formats: S("ARRAY", {
            items: S("OBJECT", { properties: { ref: S("STRING"), format: FORMAT_ENUM }, required: ["ref", "format"] }),
          }),
          recommendation: S("OBJECT", {
            properties: {
              shouldCover: S("BOOLEAN"),
              reason: S("STRING"),
              angle: S("STRING"),
              possibleTitle: S("STRING"),
              format: FORMAT_ENUM,
            },
            required: ["shouldCover", "reason", "angle", "possibleTitle", "format"],
          }),
        },
        required: ["name", "keyword", "summary", "videoRefs", "whyNow", "momentumNarrative", "audienceSignals", "formats", "recommendation"],
        propertyOrdering: ["name", "keyword", "videoRefs", "formats", "summary", "whyNow", "momentumNarrative", "audienceSignals", "recommendation"],
      }),
    }),
  },
  required: ["clusters"],
});

// ---- Brief -------------------------------------------------------------------
export const briefSchema = z.object({
  headline: text(120),
  dek: text(400),
  topStory: z.object({ clusterId: z.string(), whyItMatters: text(900), recommendedAction: text(400) }),
  opportunities: z.array(z.object({ clusterId: z.string(), whyNow: text(700), recommendation: text(500) })).min(1).max(5),
  mondayPlan: z.object({
    clusterId: z.string(),
    film: text(140),
    format: formatEnum,
    angle: text(300),
    title: text(110),
    why: text(500),
  }),
});
export type BriefOutput = z.infer<typeof briefSchema>;

export function validateBrief(raw: unknown, clusterIds: string[]): { ok: true; brief: BriefOutput } | { ok: false; problems: string[] } {
  const parsed = briefSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const b = parsed.data;
  const known = new Set(clusterIds);
  const problems: string[] = [];
  if (!known.has(b.topStory.clusterId)) problems.push(`topStory.clusterId "${b.topStory.clusterId}" is not a cluster`);
  if (!known.has(b.mondayPlan.clusterId)) problems.push(`mondayPlan.clusterId "${b.mondayPlan.clusterId}" is not a cluster`);
  const opps = b.opportunities.filter((o) => known.has(o.clusterId));
  const missing = clusterIds.filter((id) => !opps.some((o) => o.clusterId === id));
  if (missing.length) problems.push(`opportunities missing clusters ${missing.join(", ")}`);
  if (problems.length) return { ok: false, problems };
  return { ok: true, brief: { ...b, opportunities: clusterIds.map((id) => opps.find((o) => o.clusterId === id)!) } };
}

export const BRIEF_RESPONSE_SCHEMA = S("OBJECT", {
  properties: {
    headline: S("STRING"),
    dek: S("STRING"),
    topStory: S("OBJECT", {
      properties: { clusterId: S("STRING"), whyItMatters: S("STRING"), recommendedAction: S("STRING") },
      required: ["clusterId", "whyItMatters", "recommendedAction"],
    }),
    opportunities: S("ARRAY", {
      items: S("OBJECT", {
        properties: { clusterId: S("STRING"), whyNow: S("STRING"), recommendation: S("STRING") },
        required: ["clusterId", "whyNow", "recommendation"],
      }),
    }),
    mondayPlan: S("OBJECT", {
      properties: {
        clusterId: S("STRING"),
        film: S("STRING"),
        format: FORMAT_ENUM,
        angle: S("STRING"),
        title: S("STRING"),
        why: S("STRING"),
      },
      required: ["clusterId", "film", "format", "angle", "title", "why"],
    }),
  },
  required: ["headline", "dek", "topStory", "opportunities", "mondayPlan"],
});
