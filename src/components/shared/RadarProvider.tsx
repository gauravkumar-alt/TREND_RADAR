"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RadarRun, RunStage } from "@/lib/types";

export interface RunOverrides {
  regionCode?: string;
  lookbackDays?: number;
  categoryIds?: string[];
  force?: boolean;
}

interface RunState {
  running: boolean;
  stage: RunStage | null;
  detail: string | null;
  completedStages: RunStage[];
  warnings: string[];
  error: { code: string; message: string } | null;
  /** A run produced in this session (may be newer than the server-rendered one, or unsaved). */
  run: RadarRun | null;
  reused: boolean;
  startedAt: number | null;
}

interface Ctx extends RunState {
  startRun: (o?: RunOverrides) => Promise<void>;
  dismiss: () => void;
}

const RadarContext = createContext<Ctx | null>(null);

const initial: RunState = {
  running: false,
  stage: null,
  detail: null,
  completedStages: [],
  warnings: [],
  error: null,
  run: null,
  reused: false,
  startedAt: null,
};

export function RadarProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RunState>(initial);
  const router = useRouter();
  const busy = useRef(false);

  const startRun = useCallback(
    async (overrides: RunOverrides = {}) => {
      if (busy.current) return;
      busy.current = true;
      setState((s) => ({ ...initial, run: s.run, running: true, startedAt: Date.now() }));
      try {
        const res = await fetch("/api/radar/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overrides }),
        });
        if (!res.body) throw new Error("no stream");
        if (!res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const body = await res.json();
          setState((s) => ({ ...s, running: false, error: body.error ?? { code: "UNKNOWN", message: "The scan couldn't start." } }));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            const evt = JSON.parse(line);
            if (evt.type === "stage") {
              setState((s) => ({
                ...s,
                completedStages: s.stage && s.stage !== evt.stage ? [...s.completedStages, s.stage] : s.completedStages,
                stage: evt.stage,
                detail: evt.detail ?? null,
              }));
            } else if (evt.type === "warning") {
              setState((s) => ({ ...s, warnings: [...s.warnings, evt.message] }));
            } else if (evt.type === "error") {
              setState((s) => ({ ...s, running: false, error: evt.error }));
            } else if (evt.type === "done") {
              setState((s) => ({ ...s, running: false, run: evt.run, reused: evt.reused, stage: null }));
              router.refresh();
            }
          }
        }
        setState((s) => (s.running ? { ...s, running: false, error: s.error ?? { code: "UNKNOWN", message: "The scan stopped unexpectedly. Try again." } } : s));
      } catch {
        setState((s) => ({ ...s, running: false, error: { code: "UNKNOWN", message: "Couldn't reach the server. Check your connection and try again." } }));
      } finally {
        busy.current = false;
      }
    },
    [router],
  );

  const dismiss = useCallback(() => setState((s) => ({ ...s, error: null, warnings: [] })), []);
  const value = useMemo(() => ({ ...state, startRun, dismiss }), [state, startRun, dismiss]);
  return <RadarContext.Provider value={value}>{children}</RadarContext.Provider>;
}

export function useRadar() {
  const ctx = useContext(RadarContext);
  if (!ctx) throw new Error("useRadar must be used inside RadarProvider");
  return ctx;
}

/** The freshest run we know about: this session's (if newer) or the server's. */
export function useCurrentRun(serverRun: RadarRun | null): RadarRun | null {
  const { run } = useRadar();
  if (!run) return serverRun;
  if (!serverRun) return run;
  return (run.completedAt ?? "") > (serverRun.completedAt ?? "") ? run : serverRun;
}
