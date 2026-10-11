import type { TrendCluster } from "../types";

const STOP = new Set(["and", "the", "of", "for", "in", "on", "with", "to", "a", "an", "vs", "&"]);

/**
 * Short label for a cluster: Gemini's keyword when present, otherwise the
 * first 2–3 meaningful words of the name before any ":" or " and ".
 */
export function clusterKeyword(c: Pick<TrendCluster, "ai">): string {
  const k = c.ai.keyword?.trim();
  if (k) return k;
  const head = c.ai.name.split(/[:—–(]| and | & /i)[0].trim();
  const words = head.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase()));
  let out = "";
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > 22 && out) break;
    out = next;
    if (out.split(" ").length >= 3) break;
  }
  return out || c.ai.name.slice(0, 20);
}
