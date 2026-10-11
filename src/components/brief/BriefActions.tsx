"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { ago } from "@/lib/format";

export function GenerateBriefButton({ runId, label = "Generate brief" }: { runId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch("/api/brief/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId }) }).catch(() => null);
          const body = await res?.json().catch(() => null);
          setBusy(false);
          if (!res?.ok) setError(body?.error?.message ?? "Couldn't write the brief. Try again.");
          else router.refresh();
        }}
        disabled={busy}
        aria-busy={busy}
        variant={label === "Generate brief" ? "signal" : "outline"}
        size="sm"
      >
        <RefreshCw className={busy ? "animate-spin" : ""} aria-hidden />
        {busy ? "Writing…" : label}
      </Button>
      {error && <ErrorState compact title="Brief failed" message={error} />}
    </div>
  );
}

export function SendBriefButton({
  briefId,
  emailConfigured,
  recipient,
  lastDelivery,
}: {
  briefId: string;
  emailConfigured: boolean;
  recipient: string;
  lastDelivery: { at: string; status: string; recipient: string } | null;
}) {
  const [state, setState] = useState<{ busy: boolean; msg: string | null; ok: boolean }>({ busy: false, msg: null, ok: false });
  if (!emailConfigured) return <p className="micro text-fg-3">Email isn&apos;t set up.</p>;
  if (!recipient) return <p className="micro text-fg-3">Add an email address in Settings to send this brief.</p>;
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={state.busy}
        aria-busy={state.busy}
        onClick={async () => {
          setState({ busy: true, msg: null, ok: false });
          const res = await fetch("/api/brief/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ briefId }) }).catch(() => null);
          const body = await res?.json().catch(() => null);
          setState({ busy: false, ok: Boolean(res?.ok), msg: res?.ok ? `Sent to ${body.to}` : (body?.error?.message ?? "Couldn't send.") });
        }}
      >
        <Mail aria-hidden /> {state.busy ? "Sending…" : `Email to ${recipient}`}
      </Button>
      <p role="status" className={`micro ${state.ok ? "text-signal" : state.msg ? "text-cool" : "text-fg-3"}`}>
        {state.msg ?? (lastDelivery ? `Last ${lastDelivery.status} ${ago(lastDelivery.at)} to ${lastDelivery.recipient}` : "Not sent yet")}
      </p>
    </div>
  );
}
