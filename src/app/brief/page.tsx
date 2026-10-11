import type { Metadata } from "next";
import { loadPageData } from "@/lib/data";
import { BriefExperience } from "@/components/brief/BriefExperience";
import { GenerateBriefButton } from "@/components/brief/BriefActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sunday Brief" };

export default async function BriefPage() {
  const data = await loadPageData({ withBrief: true });
  if (!data.run) {
    return (
      <div>
        {data.dbError && (
          <div className="mx-auto max-w-5xl px-4 pt-10 md:px-10">
            <ErrorState compact title="History unavailable" message={data.dbError} />
          </div>
        )}
        <EmptyState title="NO BRIEF YET." body="Run the radar and the brief is written with it. A new one also arrives every Sunday morning." />
      </div>
    );
  }
  if (!data.brief) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center gap-6 px-4 md:px-10">
        <span className="micro text-signal">Sunday Brief</span>
        <h1 className="display-xl text-5xl md:text-8xl">THE SCAN IS IN. THE BRIEF ISN&apos;T WRITTEN YET.</h1>
        <p className="max-w-xl font-serif text-xl text-fg-2">Turn the latest scan into this week&apos;s brief. Takes about 20 seconds.</p>
        <div className="self-start">
          <GenerateBriefButton runId={data.run.id} />
        </div>
      </section>
    );
  }
  return <BriefExperience brief={data.brief} run={data.run} emailConfigured={data.status.email} recipient={data.settings.email} lastDelivery={data.lastDelivery} />;
}
