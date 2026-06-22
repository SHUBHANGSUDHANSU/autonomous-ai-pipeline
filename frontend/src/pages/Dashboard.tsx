import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { PipelineStatus } from "../components/dashboard/PipelineStatus";
import { QuickRun } from "../components/dashboard/QuickRun";
import { StatsGrid } from "../components/dashboard/StatsGrid";
import { PageWrapper } from "../components/layout/PageWrapper";
import { mockActivityFeed, mockStats } from "../api/mockData";
import { useContentList } from "../hooks/useContent";

export function Dashboard() {
  const { data } = useContentList();
  const items = data?.items || [];
  const published = items.filter((item) => item.status === "published").length || mockStats.published;
  const avgSeo = items.length
    ? items.reduce((sum, item) => sum + item.seoScore, 0) / items.length
    : mockStats.avgSeoScore;
  const thisWeek = items.filter((item) => {
    if (!item.createdAt) return false;
    return Date.now() - new Date(item.createdAt).getTime() < 7 * 86400000;
  }).length || mockStats.thisWeek;

  const stats = [
    { label: "Total Articles", value: data?.total || mockStats.totalArticles, change: "+12%", positive: true },
    { label: "Published", value: published, change: "+8%", positive: true },
    { label: "Avg SEO Score", value: avgSeo, suffix: "", change: "+0.6", positive: true },
    { label: "This Week", value: thisWeek, change: "-2%", positive: false },
  ];

  return (
    <PageWrapper>
      <section>
        <QuickRun />
      </section>

      <StatsGrid stats={stats} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ActivityFeed items={mockActivityFeed} />
        <PipelineStatus />
      </div>
    </PageWrapper>
  );
}
