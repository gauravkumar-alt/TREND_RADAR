"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { CATEGORY_PRESETS, LANGUAGES, LOOKBACK_OPTIONS, REGIONS, VIDEOS_PER_CATEGORY_OPTIONS } from "@/lib/config";
import { settingsSchema, type Settings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";

const field = "h-11 w-full border border-line-2 bg-bg px-3 text-sm text-fg placeholder:text-fg-3 hover:border-fg-2 focus:border-signal";

function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-3 border-t border-line py-7 md:grid-cols-[280px_1fr] md:gap-10">
      <div className="flex flex-col gap-1">
        <label htmlFor={htmlFor} className="micro text-fg">
          {label}
        </label>
        {hint && <p className="text-sm text-fg-3">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsForm({
  initial,
  canSave,
  status,
}: {
  initial: Settings;
  canSave: boolean;
  status: { youtube: boolean; gemini: boolean; supabase: boolean; email: boolean };
}) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [newCat, setNewCat] = useState({ label: "", keywords: "" });
  const [state, setState] = useState<{ saving: boolean; saved: boolean; error: string | null }>({ saving: false, saved: false, error: null });
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setState((x) => ({ ...x, saved: false }));
  };

  const allCats = [...CATEGORY_PRESETS, ...s.customCategories];
  const toggleCat = (id: string) => set("categoryIds", s.categoryIds.includes(id) ? s.categoryIds.filter((x) => x !== id) : [...s.categoryIds, id]);
  const validation = useMemo(() => settingsSchema.safeParse(s), [s]);
  const firstIssue = validation.success ? null : validation.error.issues[0];


  const addCustom = () => {
    const label = newCat.label.trim();
    const keywords = newCat.keywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 3);
    if (label.length < 2 || !keywords.length) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || `custom-${Date.now()}`;
    if (allCats.some((c) => c.id === id)) return;
    setS((p) => ({ ...p, customCategories: [...p.customCategories, { id, label, keywords }], categoryIds: p.categoryIds.length < 5 ? [...p.categoryIds, id] : p.categoryIds }));
    setNewCat({ label: "", keywords: "" });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.success) return;
    setState({ saving: true, saved: false, error: null });
    const res = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (!res?.ok) setState({ saving: false, saved: false, error: body?.error?.message ?? "Couldn't save settings." });
    else {
      setState({ saving: false, saved: true, error: null });
      router.refresh();
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col" noValidate>
      <Row label="Creator" hint="Shown in the recommendations." htmlFor="creatorName">
        <input id="creatorName" className={field} value={s.creatorName} maxLength={40} onChange={(e) => set("creatorName", e.target.value)} />
      </Row>

      <Row label="Content categories" hint="Pick up to 5. Add your own with search keywords.">
        <fieldset className="flex flex-col gap-5">
          <legend className="sr-only">Content categories</legend>
          <div className="flex flex-wrap gap-2">
            {allCats.map((c) => {
              const on = s.categoryIds.includes(c.id);
              const custom = s.customCategories.some((x) => x.id === c.id);
              return (
                <span key={c.id} className="flex">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCat(c.id)}
                    title={`Searches: ${c.keywords.join(" · ")}`}
                    className={cn("micro flex h-10 items-center gap-2 border px-3 transition-colors", on ? "border-signal bg-signal text-signal-ink" : "border-line-2 text-fg-2 hover:border-fg-2 hover:text-fg")}
                  >
                    {on && <Check className="size-3.5" aria-hidden />}
                    {c.label}
                  </button>
                  {custom && (
                    <button
                      type="button"
                      aria-label={`Remove custom category ${c.label}`}
                      onClick={() => setS((p) => ({ ...p, customCategories: p.customCategories.filter((x) => x.id !== c.id), categoryIds: p.categoryIds.filter((x) => x !== c.id) }))}
                      className="flex h-10 w-9 items-center justify-center border border-l-0 border-line-2 text-fg-3 hover:text-cool"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_1.6fr_auto]">
            <input className={field} placeholder="New category, e.g. EV Tech" value={newCat.label} onChange={(e) => setNewCat((p) => ({ ...p, label: e.target.value }))} aria-label="Custom category name" maxLength={40} />
            <input className={field} placeholder="Search keywords, comma separated (max 3)" value={newCat.keywords} onChange={(e) => setNewCat((p) => ({ ...p, keywords: e.target.value }))} aria-label="Custom category keywords" />
            <Button type="button" variant="outline" onClick={addCustom} disabled={s.customCategories.length >= 5}>
              <Plus aria-hidden /> Add
            </Button>
          </div>
        </fieldset>
      </Row>

      <Row label="Region" hint="Where your audience is." htmlFor="region">
        <select id="region" className={field} value={s.regionCode} onChange={(e) => set("regionCode", e.target.value)}>
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Language" hint="Preferred search language." htmlFor="language">
        <select id="language" className={field} value={s.language} onChange={(e) => set("language", e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Lookback window" hint="How far back to look for videos." htmlFor="lookback">
        <select id="lookback" className={field} value={s.lookbackDays} onChange={(e) => set("lookbackDays", Number(e.target.value))}>
          {LOOKBACK_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
      </Row>

      <Row label="Videos per category" hint="More videos means a broader scan." htmlFor="vpc">
        <select id="vpc" className={field} value={s.videosPerCategory} onChange={(e) => set("videosPerCategory", Number(e.target.value))}>
          {VIDEOS_PER_CATEGORY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Email the Sunday brief" hint={status.email ? "Arrives every Sunday morning." : "Email isn't set up on the server yet."} htmlFor="email">
        <div className="flex flex-col gap-3">
          <input id="email" type="email" className={field} placeholder="you@example.com" value={s.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
          <label className="flex items-center gap-3 text-sm text-fg-2">
            <input type="checkbox" className="size-4 accent-[var(--signal)]" checked={s.emailEnabled} onChange={(e) => set("emailEnabled", e.target.checked)} />
            Send me the brief every Sunday
          </label>
        </div>
      </Row>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-line bg-bg/95 px-4 py-5 backdrop-blur md:-mx-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div aria-live="polite" className="text-sm">
          {firstIssue ? (
            <span className="text-cool">{firstIssue.message}</span>
          ) : state.saved ? (
            <span className="micro text-signal">Saved. The next scan uses these settings.</span>
          ) : !canSave ? (
            <span className="text-fg-3">Settings can&apos;t be saved right now. Try again shortly.</span>
          ) : (
            <span className="text-fg-3">Changes apply from the next scan.</span>
          )}
        </div>
        <Button type="submit" disabled={!validation.success || state.saving || !canSave}>
          {state.saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
      {state.error && <ErrorState className="mt-4" compact title="Not saved" message={state.error} />}
    </form>
  );
}
