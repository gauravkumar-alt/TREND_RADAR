import "server-only";
import { AppError } from "../errors";
import { regionLabel } from "../config";
import { toPromptTable, type PreparedVideo } from "../trends/prepare";
import { formatDurationWords } from "../youtube/duration";
import { generateJson, parseJsonLoose } from "./client";
import {
  ANALYSIS_RESPONSE_SCHEMA,
  BRIEF_RESPONSE_SCHEMA,
  validateAnalysis,
  validateBrief,
  type BriefOutput,
  type ValidatedCluster,
} from "./schemas";
import { VIDEO_FORMATS, type RunSettingsSnapshot, type TrendCluster } from "../types";

type Generate = typeof generateJson;

const ANALYST_SYSTEM = `You are the trend analyst for TREND//RADAR, a YouTube content-strategy tool for an Indian tech creator.
You receive a table of real, recent YouTube videos with metrics the application has already calculated.
Rules:
- Group videos into topic clusters: specific conversations several creators are having now (e.g. "Claude Code vs Cursor for beginners"), never broad buckets like "AI" or "Tech".
- keyword: a 1–3 word label for the cluster (max 20 characters), the words a viewer would recognise, e.g. "Claude Code", "vivo V80", "AI agents".
- Only use the video refs given (v1, v2, …). Each video belongs to at most one cluster; leave unrelated videos out.
- A cluster needs at least 3 videos from at least 2 different channels when possible (never fewer than 2 videos from 2 channels).
- Never invent or restate numbers that are not in the table. Do not compute your own totals, percentages or growth rates: the app does that. Refer to evidence qualitatively ("several channels uploaded within days of each other").
- Classify the format of every video in each cluster as one of: ${VIDEO_FORMATS.join(", ")}.
- whyNow explains the timing: what event, release or shift makes this topic relevant this week, grounded in the titles/descriptions.
- audienceSignals: what viewers are engaging with (angles, questions, pain points), inferred from titles, descriptions and the engagement column.
- recommendation is for the creator's own channel: a concrete angle that is differentiated from the existing videos, a clickable but honest title, and the format to use.
- Write in crisp editorial English. No hype words like "game-changer" or "revolutionary".`;

export function buildAnalysisPrompt(rows: PreparedVideo[], settings: RunSettingsSnapshot, now: Date): string {
  return [
    `Creator: ${settings.creatorName}, tech YouTuber for ${regionLabel(settings.regionCode)} audiences (AI tools, productivity apps, tech reviews), 3 long-form videos a week.`,
    `Content categories: ${settings.categories.map((c) => c.label).join(", ")}.`,
    `Region: ${regionLabel(settings.regionCode)}. Lookback: last ${settings.lookbackDays} days. Today: ${now.toISOString().slice(0, 10)}.`,
    ``,
    `Find the 3 to 5 strongest topic clusters, strongest first.`,
    ``,
    `VIDEOS (age_h = hours since upload, views_per_h = lifetime average, ? = hidden/unknown):`,
    toPromptTable(rows),
  ].join("\n");
}

async function withRetry<T>(
  attempt: (feedback: string | null) => Promise<{ ok: true; value: T } | { ok: false; problems: string[] }>,
): Promise<T> {
  let feedback: string | null = null;
  for (let i = 0; i < 2; i++) {
    let result;
    try {
      result = await attempt(feedback);
    } catch (e) {
      if (e instanceof SyntaxError) {
        feedback = "Your previous reply was not valid JSON. Reply with JSON only, matching the schema.";
        continue;
      }
      if (i === 0 && e instanceof AppError && e.code === "GEMINI_UNAVAILABLE") continue;
      throw e;
    }
    if (result.ok) return result.value;
    feedback = `Your previous answer failed validation:\n- ${result.problems.join("\n- ")}\nFix these problems and answer again.`;
  }
  throw new AppError(
    "GEMINI_INVALID",
    "Gemini returned an analysis we couldn't verify against the data, twice. Nothing was saved. Try running the radar again.",
    502,
  );
}

export async function analyzeClusters(
  rows: PreparedVideo[],
  settings: RunSettingsSnapshot,
  now: Date,
  generate: Generate = generateJson,
): Promise<ValidatedCluster[]> {
  const refToId = new Map(rows.map((r) => [r.ref, r.id]));
  const channelOf = new Map(rows.map((r) => [r.id, r.channel]));
  const base = buildAnalysisPrompt(rows, settings, now);
  const minClusters = rows.length >= 15 ? 3 : 1;
  return withRetry(async (feedback) => {
    const text = await generate({
      system: ANALYST_SYSTEM,
      prompt: feedback ? `${base}\n\n${feedback}` : base,
      responseSchema: ANALYSIS_RESPONSE_SCHEMA,
      temperature: 0.3,
    });
    const v = validateAnalysis(parseJsonLoose(text), refToId, channelOf, { minClusters });
    return v.ok ? { ok: true, value: v.clusters } : v;
  });
}

// ---- Sunday brief ------------------------------------------------------------
const EDITOR_SYSTEM = `You are the editor of the TREND//RADAR Sunday Brief, a weekly strategy memo for one Indian tech YouTuber.
Tone: calm, specific, confident, editorial. Short sentences. Address the creator as "you".
Every number you mention must appear verbatim in the data provided. Never invent statistics, growth rates or history.
If momentum is "BUILDING BASELINE", say the direction is not yet measurable rather than guessing.
Pick the single best opportunity for Monday's filming session, considering score, momentum, confidence and fit with an AI tools / productivity / tech reviews channel.`;

export function describeClusterForBrief(c: TrendCluster): string {
  const m = c.metrics;
  const pct = (x: number | null) => (x == null ? "n/a" : `${Math.round(x * 100)}%`);
  return [
    `[${c.id}] ${c.ai.name} (rank ${c.rank}, trend score ${c.score}/100, momentum ${c.momentum}, confidence ${c.confidence})`,
    `  calculated: ${m.videoCount} videos, ${m.creatorCount} creators, ${m.recentUploads} uploaded in the last 72h, coverage change ${pct(m.coverageGrowth)}, avg duration ${formatDurationWords(m.avgDurationSeconds)}, avg engagement ${m.avgEngagementRate == null ? "n/a" : (m.avgEngagementRate * 100).toFixed(1) + "%"}, suggested length ${formatDurationWords(c.suggestedLengthSeconds)}`,
    `  leading formats: ${c.formats.slice(0, 3).map((f) => `${f.format} ${Math.round(f.share * 100)}%`).join(", ") || "n/a"}`,
    `  creators: ${c.creators.slice(0, 6).map((x) => x.channelTitle).join(", ")}`,
    `  summary: ${c.ai.summary}`,
    `  why now: ${c.ai.whyNow}`,
    `  audience: ${c.ai.audienceSignals.join("; ")}`,
    `  analyst recommendation: ${c.ai.recommendation.angle} — "${c.ai.recommendation.possibleTitle}" (${c.ai.recommendation.format})`,
  ].join("\n");
}

export async function writeBrief(
  clusters: TrendCluster[],
  settings: RunSettingsSnapshot,
  videosAnalyzed: number,
  generate: Generate = generateJson,
): Promise<BriefOutput> {
  const ids = clusters.map((c) => c.id);
  const prompt = [
    `Creator: ${settings.creatorName}. Region: ${regionLabel(settings.regionCode)}. Categories: ${settings.categories.map((c) => c.label).join(", ")}.`,
    `This week the radar analysed ${videosAnalyzed} videos and found these clusters:`,
    ``,
    ...clusters.map(describeClusterForBrief),
    ``,
    `Write the brief. Include one opportunity per cluster id (${ids.join(", ")}), in rank order.`,
  ].join("\n");
  return withRetry(async (feedback) => {
    const text = await generate({
      system: EDITOR_SYSTEM,
      prompt: feedback ? `${prompt}\n\n${feedback}` : prompt,
      responseSchema: BRIEF_RESPONSE_SCHEMA,
      temperature: 0.6,
    });
    const v = validateBrief(parseJsonLoose(text), ids);
    return v.ok ? { ok: true, value: v.brief } : v;
  });
}
