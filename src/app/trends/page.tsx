import type { Metadata } from "next";
import { loadPageData } from "@/lib/data";
import { resolveCategories } from "@/lib/settings";
import { TrendOverview } from "@/components/trends/TrendOverview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trend Intelligence" };

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run: runId } = await searchParams;
  const data = await loadPageData({ runId });
  return (
    <TrendOverview
      serverRun={data.run}
      pinnedRunId={runId && data.run ? data.run.id : null}
      failure={data.failure}
      history={data.history}
      settingsCategories={resolveCategories(data.settings)}
      regionCode={data.settings.regionCode}
      lookbackDays={data.settings.lookbackDays}
      dbError={data.dbError}
    />
  );
}
