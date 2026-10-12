import { TopNav } from "./TopNav";
import { RadarProvider } from "@/components/shared/RadarProvider";
import { LoadingRadar } from "@/components/shared/LoadingRadar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RadarProvider>
      <a href="#main" className="skip-link micro">
        Skip to content
      </a>
      <TopNav />
      <main id="main" className="min-h-screen overflow-x-clip pt-14">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-8 text-fg-3 md:flex-row md:items-center md:justify-between md:px-8">
          <span className="micro">TREND//RADAR — Know what&apos;s about to trend.</span>
          <span className="micro">Live data: YouTube Data API v3 · Analysis: Gemini Flash</span>
        </div>
      </footer>
      <LoadingRadar />
    </RadarProvider>
  );
}
