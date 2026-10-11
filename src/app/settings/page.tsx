import type { Metadata } from "next";
import { loadSettings } from "@/lib/api";
import { serviceStatus } from "@/lib/env";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { settings, source, warning } = await loadSettings();
  const status = serviceStatus();
  const services: [string, boolean, string][] = [
    ["YouTube data", status.youtube, "Live videos"],
    ["Gemini Flash", status.gemini, "Topics and brief"],
    ["Database", status.supabase && source === "database", "Settings and history"],
    ["Email", status.email, "Optional"],
  ];
  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-8">
      <header className="flex flex-col gap-5 border-b border-line py-14 md:py-20">
        <span className="micro text-signal">Utility</span>
        <h1 className="display-xl text-[clamp(52px,9vw,150px)]">SETTINGS</h1>
        <p className="max-w-2xl font-serif text-2xl italic text-fg-2">Point the radar at your channel. Used by every scan and the Sunday brief.</p>
        <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4" aria-label="Service status">
          {services.map(([name, on, what]) => (
            <li key={name} className="flex flex-col gap-1 bg-bg p-4">
              <span className="micro flex items-center gap-2 text-fg">
                <span className={cn("size-2 rounded-full", on ? "bg-signal" : "bg-cool")} aria-hidden />
                {name}
              </span>
              <span className="text-xs text-fg-3">
                {on ? "Connected" : "Not set up"} · {what}
              </span>
            </li>
          ))}
        </ul>
        {warning && <p className="micro text-cool">{warning}</p>}
      </header>
      <SettingsForm initial={settings} canSave={status.supabase && source === "database"} status={status} />
    </div>
  );
}
