import { formatDistanceToNow } from "date-fns";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { PipelineStatus } from "../components/dashboard/PipelineStatus";
import { QuickRun } from "../components/dashboard/QuickRun";
import { StatsGrid } from "../components/dashboard/StatsGrid";
import { PageWrapper } from "../components/layout/PageWrapper";
import { useContentList } from "../hooks/useContent";
import { usePipelineRuns } from "../hooks/usePipeline";
import type { ActivityItem, PipelineTimelineRun } from "../types";

export function Dashboard() {
  const { data } = useContentList();
  const { data: runsData } = usePipelineRuns();
  const items = data?.items || [];
  const published = items.filter((item) => item.status === "published").length;
  const avgSeo = items.length
    ? items.reduce((sum, item) => sum + item.seoScore, 0) / items.length
    : 0;
  const thisWeek = items.filter((item) => {
    if (!item.createdAt) return false;
    return Date.now() - new Date(item.createdAt).getTime() < 7 * 86400000;
  }).length;
  const activity = toActivityItems(runsData?.items || []);

  const stats = [
    { label: "Total Articles", value: data?.total || 0, change: "Live DB" },
    { label: "Published", value: published, change: "Live DB" },
    { label: "Avg SEO Score", value: avgSeo, suffix: "", change: "Live DB" },
    { label: "This Week", value: thisWeek, change: "Live DB" },
  ];

  return (
    <PageWrapper>
      <section>
        <QuickRun />
      </section>

      <StatsGrid stats={stats} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ActivityFeed items={activity} />
        <PipelineStatus />
      </div>
    </PageWrapper>
  );
}

function toActivityItems(runs: PipelineTimelineRun[]): ActivityItem[] {
  return runs.flatMap((run) =>
    run.agentResults.map((agent, index) => ({
      id: `${run.id}-${agent.agentName}-${index}`,
      agent: agent.agentName,
      action: agent.outputText || `${run.topic}: ${agent.status}`,
      time: formatDistanceToNow(new Date(run.endedAt || run.startedAt), { addSuffix: true }),
      status: agent.status === "success" ? "complete" : agent.status,
    })),
  );
}
