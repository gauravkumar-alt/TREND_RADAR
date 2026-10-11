import "server-only";
import { db, dbError } from "./supabase";
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "../settings";
import type { Brief, BriefContent, RadarRun, Snapshot, Video } from "../types";

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

// ---- settings ----------------------------------------------------------------
export async function getSettings(): Promise<Settings> {
  const { data, error } = await db().from("user_settings").select("settings").eq("id", "default").maybeSingle();
  if (error) throw dbError(error, "load settings");
  if (!data) return DEFAULT_SETTINGS;
  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(data.settings as object) });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings): Promise<void> {
  const { error } = await db().from("user_settings").upsert({ id: "default", settings: s, updated_at: new Date().toISOString() });
  if (error) throw dbError(error, "save settings");
}

// ---- videos & snapshots ------------------------------------------------------
export async function upsertVideos(videos: Video[]): Promise<void> {
  const now = new Date().toISOString();
  for (const part of chunk(videos, 200)) {
    const { error } = await db()
      .from("videos")
      .upsert(
        part.map((v) => ({
          id: v.id,
          title: v.title,
          description: v.description.slice(0, 5000),
          channel_id: v.channelId,
          channel_title: v.channelTitle,
          published_at: v.publishedAt,
          thumbnail_url: v.thumbnailUrl,
          duration_seconds: v.durationSeconds,
          category_id: v.categoryId,
          region_code: v.regionCode,
          source_category: v.sourceCategory,
          last_seen_at: now,
        })),
        { onConflict: "id" },
      );
    if (error) throw dbError(error, "save videos");
  }
}

export async function getSnapshots(videoIds: string[]): Promise<Record<string, Snapshot[]>> {
  const out: Record<string, Snapshot[]> = {};
  for (const part of chunk([...new Set(videoIds)], 100)) {
    const { data, error } = await db()
      .from("video_snapshots")
      .select("video_id, captured_at, views, likes, comments")
      .in("video_id", part)
      .order("captured_at", { ascending: true })
      .limit(5000);
    if (error) throw dbError(error, "load snapshots");
    for (const r of data ?? []) {
      (out[r.video_id] ??= []).push({
        videoId: r.video_id,
        capturedAt: new Date(r.captured_at).toISOString(),
        views: r.views == null ? null : Number(r.views),
        likes: r.likes == null ? null : Number(r.likes),
        comments: r.comments == null ? null : Number(r.comments),
      });
    }
  }
  return out;
}

/** Insert today's observed stats. Skips videos snapshotted in the last 30 minutes so reruns don't pile up duplicates. */
export async function insertSnapshots(videos: Video[], existing: Record<string, Snapshot[]>, capturedAt: string): Promise<number> {
  const minGap = 30 * 60 * 1000;
  const rows = videos
    .filter((v) => {
      const last = existing[v.id]?.at(-1);
      return !last || new Date(capturedAt).getTime() - new Date(last.capturedAt).getTime() > minGap;
    })
    .map((v) => ({ video_id: v.id, captured_at: capturedAt, views: v.views, likes: v.likes, comments: v.comments }));
  for (const part of chunk(rows, 500)) {
    const { error } = await db().from("video_snapshots").upsert(part, { onConflict: "video_id,captured_at", ignoreDuplicates: true });
    if (error) throw dbError(error, "save snapshots");
  }
  return rows.length;
}

/** Videos still worth tracking (published inside the window). Used by the daily snapshot cron. */
export async function getTrackedVideoIds(publishedWithinDays: number, limit = 500): Promise<string[]> {
  const since = new Date(Date.now() - publishedWithinDays * 86400_000).toISOString();
  const { data, error } = await db()
    .from("videos")
    .select("id")
    .gte("published_at", since)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (error) throw dbError(error, "load tracked videos");
  return (data ?? []).map((r) => r.id as string);
}

// ---- runs --------------------------------------------------------------------
export async function createRun(id: string, run: Pick<RadarRun, "settings" | "startedAt">, settingsKey: string, trigger: "manual" | "cron") {
  const { error } = await db()
    .from("trend_runs")
    .insert({ id, status: "running", trigger, started_at: run.startedAt, settings: run.settings, settings_key: settingsKey });
  if (error) throw dbError(error, "start a run");
}

export async function completeRun(run: RadarRun): Promise<void> {
  const { error } = await db()
    .from("trend_runs")
    .update({
      status: "succeeded",
      completed_at: run.completedAt,
      videos_fetched: run.videosFetched,
      videos_analyzed: run.videosAnalyzed,
      quota_units: run.quotaUnitsUsed,
      model: run.model,
      payload: { ...run, persisted: true },
    })
    .eq("id", run.id);
  if (error) throw dbError(error, "save the run");

  for (const c of run.clusters) {
    const { data, error: cErr } = await db()
      .from("trend_clusters")
      .insert({
        run_id: run.id,
        cluster_key: c.id,
        rank: c.rank,
        name: c.ai.name,
        summary: c.ai.summary,
        score: c.score,
        momentum: c.momentum,
        confidence: c.confidence,
        metrics: c.metrics,
        score_breakdown: c.scoreBreakdown,
        formats: c.formats,
        ai: c.ai,
      })
      .select("id")
      .single();
    if (cErr || !data) throw dbError(cErr, "save clusters");
    const { error: vErr } = await db()
      .from("cluster_videos")
      .insert(c.videoIds.map((vid, i) => ({ cluster_id: data.id, video_id: vid, position: i, format: c.videoFormats[vid] ?? null })));
    if (vErr) throw dbError(vErr, "save cluster videos");
  }
}

export async function failRun(id: string, code: string, message: string) {
  await db()
    .from("trend_runs")
    .update({ status: "failed", completed_at: new Date().toISOString(), error_code: code, error_message: message })
    .eq("id", id);
}

function payloadToRun(row: { payload: unknown }): RadarRun | null {
  return row?.payload ? (row.payload as RadarRun) : null;
}

export async function getLatestRun(): Promise<RadarRun | null> {
  const { data, error } = await db()
    .from("trend_runs")
    .select("payload")
    .eq("status", "succeeded")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw dbError(error, "load the latest run");
  return data ? payloadToRun(data) : null;
}

export async function getRecentRunForKey(settingsKey: string, withinMinutes: number): Promise<RadarRun | null> {
  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const { data, error } = await db()
    .from("trend_runs")
    .select("payload")
    .eq("status", "succeeded")
    .eq("settings_key", settingsKey)
    .gte("completed_at", since)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw dbError(error, "check recent runs");
  return data ? payloadToRun(data) : null;
}

export async function getRun(id: string): Promise<RadarRun | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("trend_runs").select("payload").eq("id", id).eq("status", "succeeded").maybeSingle();
  if (error) throw dbError(error, "load the run");
  return data ? payloadToRun(data) : null;
}

export interface RunSummary {
  id: string;
  status: RadarRun["status"];
  trigger: string;
  startedAt: string;
  completedAt: string | null;
  videosAnalyzed: number;
  regionCode: string;
  categories: string[];
  errorMessage: string | null;
}

export async function listRuns(limit = 12): Promise<RunSummary[]> {
  const { data, error } = await db()
    .from("trend_runs")
    .select("id, status, trigger, started_at, completed_at, videos_analyzed, settings, error_message")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw dbError(error, "load run history");
  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    trigger: r.trigger,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    videosAnalyzed: r.videos_analyzed,
    regionCode: (r.settings as { regionCode?: string })?.regionCode ?? "",
    categories: ((r.settings as { categories?: { label: string }[] })?.categories ?? []).map((c) => c.label),
    errorMessage: r.error_message,
  }));
}

/** A scan started in the last few minutes that hasn't finished — used to stop overlapping runs burning quota. */
export async function hasActiveRun(withinMinutes = 4): Promise<boolean> {
  const since = new Date(Date.now() - withinMinutes * 60_000).toISOString();
  const { data, error } = await db().from("trend_runs").select("id").eq("status", "running").gte("started_at", since).limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

/** Newest failed run started after the latest success — so the UI can say "showing LAST SUCCESSFUL SCAN". */
export async function getFailureSince(isoTime: string | null): Promise<{ at: string; message: string } | null> {
  let q = db().from("trend_runs").select("started_at, error_message").eq("status", "failed").order("started_at", { ascending: false }).limit(1);
  if (isoTime) q = q.gt("started_at", isoTime);
  const { data, error } = await q.maybeSingle();
  if (error || !data) return null;
  return { at: data.started_at, message: data.error_message ?? "The latest scan failed." };
}

// ---- briefs ------------------------------------------------------------------
function rowToBrief(r: { id: string; run_id: string; created_at: string; week_of: string; content: unknown; model: string }): Brief {
  return { id: r.id, runId: r.run_id, createdAt: r.created_at, weekOf: r.week_of, content: r.content as BriefContent, model: r.model };
}

export async function saveBrief(b: Omit<Brief, "id" | "createdAt">): Promise<Brief> {
  const { data, error } = await db()
    .from("briefs")
    .upsert({ run_id: b.runId, week_of: b.weekOf, content: b.content, model: b.model, created_at: new Date().toISOString() }, { onConflict: "run_id" })
    .select("*")
    .single();
  if (error || !data) throw dbError(error, "save the brief");
  return rowToBrief(data);
}

export async function getBriefForRun(runId: string): Promise<Brief | null> {
  const { data, error } = await db().from("briefs").select("*").eq("run_id", runId).maybeSingle();
  if (error) throw dbError(error, "load the brief");
  return data ? rowToBrief(data) : null;
}

export async function getBrief(id: string): Promise<Brief | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("briefs").select("*").eq("id", id).maybeSingle();
  if (error) throw dbError(error, "load the brief");
  return data ? rowToBrief(data) : null;
}

export async function recordDelivery(d: { briefId: string; recipient: string; status: "sent" | "failed"; providerId?: string; error?: string }) {
  await db()
    .from("brief_deliveries")
    .insert({ brief_id: d.briefId, recipient: d.recipient, status: d.status, provider_id: d.providerId ?? null, error: d.error ?? null });
}

export async function getLastDelivery(briefId: string): Promise<{ at: string; status: string; recipient: string } | null> {
  const { data } = await db()
    .from("brief_deliveries")
    .select("created_at, status, recipient")
    .eq("brief_id", briefId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { at: data.created_at, status: data.status, recipient: data.recipient } : null;
}
