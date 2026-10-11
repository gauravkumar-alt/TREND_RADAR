import "server-only";
import { env, hasResend } from "../env";
import { AppError } from "../errors";
import { regionLabel } from "../config";
import { formatDurationWords } from "../youtube/duration";
import type { Brief, RadarRun } from "../types";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderBriefEmail(brief: Brief, run: RadarRun, appUrl: string): { subject: string; html: string; text: string } {
  const b = brief.content;
  const byId = new Map(run.clusters.map((c) => [c.id, c]));
  const top = byId.get(b.topStory.clusterId);
  const subject = `Sunday Brief — ${b.headline}`;
  const opps = b.opportunities
    .map((o, i) => {
      const c = byId.get(o.clusterId);
      if (!c) return "";
      return `<div style="border-top:1px solid #2a2a26;padding:20px 0">
        <div style="color:#c6ff3d;font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.1em">0${i + 1} · ${c.momentum} · SCORE ${c.score}</div>
        <div style="color:#f2efe6;font:700 22px/1.2 Helvetica,Arial,sans-serif;margin:6px 0 8px">${esc(c.ai.name)}</div>
        <div style="color:#8a8a80;font:12px ui-monospace,Menlo,monospace">${c.metrics.videoCount} videos · ${c.metrics.creatorCount} creators · avg ${formatDurationWords(c.metrics.avgDurationSeconds)}</div>
        <p style="color:#d8d5cc;font:15px/1.6 Georgia,serif">${esc(o.whyNow)}</p>
        <p style="color:#f2efe6;font:15px/1.6 Georgia,serif"><b>Make:</b> ${esc(o.recommendation)}</p>
      </div>`;
    })
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#0b0b0a;padding:32px 16px">
  <div style="max-width:620px;margin:0 auto">
    <div style="color:#c6ff3d;font:700 12px ui-monospace,Menlo,monospace;letter-spacing:.2em">TREND//RADAR · SUNDAY BRIEF</div>
    <div style="color:#8a8a80;font:12px ui-monospace,Menlo,monospace;margin-top:6px">Week of ${esc(brief.weekOf)} · ${esc(regionLabel(run.settings.regionCode))} · ${run.videosAnalyzed} videos analysed</div>
    <h1 style="color:#f2efe6;font:700 34px/1.1 Helvetica,Arial,sans-serif;margin:24px 0 12px">${esc(b.headline)}</h1>
    <p style="color:#d8d5cc;font:17px/1.6 Georgia,serif">${esc(b.dek)}</p>
    <div style="border:1px solid #2a2a26;padding:20px;margin:28px 0">
      <div style="color:#c6ff3d;font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.1em">THE ONE TO WATCH</div>
      <div style="color:#f2efe6;font:700 24px/1.2 Helvetica,Arial,sans-serif;margin:8px 0">${esc(top?.ai.name ?? "")}</div>
      <p style="color:#d8d5cc;font:15px/1.6 Georgia,serif">${esc(b.topStory.whyItMatters)}</p>
      <p style="color:#f2efe6;font:15px/1.6 Georgia,serif"><b>Action:</b> ${esc(b.topStory.recommendedAction)}</p>
    </div>
    ${opps}
    <div style="background:#c6ff3d;padding:24px;margin-top:28px">
      <div style="color:#0b0b0a;font:700 12px ui-monospace,Menlo,monospace;letter-spacing:.2em">MONDAY MORNING</div>
      <table style="margin-top:10px;border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 0;font:600 11px ui-monospace,Menlo,monospace;width:120px;vertical-align:top">FILM THIS</td><td style="font:700 17px/1.4 Helvetica,Arial,sans-serif">${esc(b.mondayPlan.film)}</td></tr>
        <tr><td style="padding:6px 0;font:600 11px ui-monospace,Menlo,monospace">FORMAT</td><td style="font:15px Georgia,serif">${esc(b.mondayPlan.format)}</td></tr>
        <tr><td style="padding:6px 0;font:600 11px ui-monospace,Menlo,monospace">ANGLE</td><td style="font:15px/1.5 Georgia,serif">${esc(b.mondayPlan.angle)}</td></tr>
        <tr><td style="padding:6px 0;font:600 11px ui-monospace,Menlo,monospace">TITLE</td><td style="font:15px/1.5 Georgia,serif">${esc(b.mondayPlan.title)}</td></tr>
        <tr><td style="padding:6px 0;font:600 11px ui-monospace,Menlo,monospace;vertical-align:top">WHY</td><td style="font:15px/1.5 Georgia,serif">${esc(b.mondayPlan.why)}</td></tr>
      </table>
    </div>
    <p style="margin-top:28px"><a href="${esc(appUrl)}/brief" style="color:#c6ff3d;font:600 13px ui-monospace,Menlo,monospace">READ THE FULL BRIEF →</a></p>
  </div></body></html>`;
  const text = [
    `TREND//RADAR — SUNDAY BRIEF (${brief.weekOf})`,
    b.headline,
    b.dek,
    ``,
    `THE ONE TO WATCH: ${top?.ai.name ?? ""}`,
    b.topStory.whyItMatters,
    ``,
    ...b.opportunities.map((o, i) => `0${i + 1} ${byId.get(o.clusterId)?.ai.name ?? ""}\n${o.whyNow}\nMake: ${o.recommendation}\n`),
    `MONDAY MORNING`,
    `FILM THIS: ${b.mondayPlan.film}`,
    `FORMAT: ${b.mondayPlan.format}`,
    `ANGLE: ${b.mondayPlan.angle}`,
    `TITLE: ${b.mondayPlan.title}`,
    `WHY: ${b.mondayPlan.why}`,
    ``,
    `${appUrl}/brief`,
  ].join("\n");
  return { subject, html, text };
}

export async function sendEmail(to: string, msg: { subject: string; html: string; text: string }): Promise<string | null> {
  if (!hasResend()) throw new AppError("EMAIL_NOT_CONFIGURED", "Email isn't configured on the server (RESEND_API_KEY).", 503);
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom(), to: [to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new AppError("EMAIL_FAILED", "The email service didn't respond.", 502);
  }
  const body = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!res.ok) throw new AppError("EMAIL_FAILED", body?.message ? `Email failed: ${body.message}` : "The email couldn't be sent.", 502);
  return body?.id ?? null;
}
