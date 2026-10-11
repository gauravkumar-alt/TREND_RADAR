import type { Metadata } from "next";
import { loadPageData } from "@/lib/data";
import { resolveCategories } from "@/lib/settings";
import { RadarExperience } from "@/components/radar/RadarExperience";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live Radar" };

export default async function RadarPage() {
  const data = await loadPageData();
  const missing = [!data.status.youtube && "YOUTUBE_API_KEY", !data.status.gemini && "GEMINI_API_KEY"].filter(Boolean) as string[];
  return (
    <RadarExperience
      serverRun={data.run}
      failure={data.failure}
      regionCode={data.settings.regionCode}
      categories={resolveCategories(data.settings).map((c) => c.label)}
      creatorName={data.settings.creatorName}
      dbError={data.dbError}
      missing={missing}
    />
  );
}
