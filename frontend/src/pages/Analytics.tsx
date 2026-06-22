import { BarChart3, FileText, Gauge, Percent, Sigma } from "lucide-react";
import { ContentChart } from "../components/analytics/ContentChart";
import { MetricCard } from "../components/analytics/MetricCard";
import { ScoreChart } from "../components/analytics/ScoreChart";
import { TopicsChart } from "../components/analytics/TopicsChart";
import { PageWrapper } from "../components/layout/PageWrapper";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { useAnalytics } from "../hooks/useAnalytics";
import { formatDate, formatScore } from "../lib/utils";
import type { AnalyticsTopArticle } from "../types";

export function Analytics() {
  const { data, isLoading, isError, refetch } = useAnalytics();
  const metrics = data?.metrics;

  return (
    <PageWrapper>
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-secondary)]">Performance intelligence</p>
        <h1 className="font-display text-4xl font-extrabold text-[var(--text-primary)]">Analytics</h1>
      </div>

      {isLoading ? <AnalyticsSkeleton /> : null}

      {isError ? (
        <Card className="border-red-400/20 bg-red-500/10 p-6">
          <h2 className="font-display text-2xl font-bold text-red-100">Analytics unavailable</h2>
          <p className="mt-2 text-sm text-red-100/80">The dashboard could not load live analytics from the API.</p>
          <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : null}

      {!isLoading && !isError && metrics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Total Generated" value={metrics.totalGenerated} detail="Real saved records" icon={<FileText size={20} />} />
            <MetricCard label="Published Rate" value={`${Math.round(metrics.publishedRate)}%`} detail={`${metrics.publishedCount} published articles`} icon={<Percent size={20} />} />
            <MetricCard label="Avg SEO" value={formatScore(metrics.avgSeoScore)} detail="Across real articles" icon={<Gauge size={20} />} />
            <MetricCard label="Avg Word Count" value={metrics.avgWordCount} detail="Per saved article" icon={<BarChart3 size={20} />} />
            <MetricCard label="Total Words" value={metrics.totalWords.toLocaleString()} detail={`${metrics.thisWeekCount} created this week`} icon={<Sigma size={20} />} />
          </div>
          <ContentChart data={data.articlesOverTime} />
          <div className="grid gap-6 xl:grid-cols-2">
            <ScoreChart data={data.averageScores} />
            <TopicsChart data={data.topTopics} />
          </div>
          <TopArticlesTable articles={data.topArticles} />
        </>
      ) : null}
    </PageWrapper>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
      <Skeleton className="h-96" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-80" />
    </>
  );
}

function TopArticlesTable({
  articles,
}: {
  articles: AnalyticsTopArticle[];
}) {
  return (
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Top Performing Articles</h2>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--text-muted)]">
              <tr>
                <th className="p-4">Title</th>
                <th className="p-4">SEO</th>
                <th className="p-4">Readability</th>
                <th className="p-4">Engagement</th>
                <th className="p-4">Published Date</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-4 font-bold text-[var(--text-primary)]">{item.title}</td>
                  <td className="p-4 text-[var(--text-secondary)]">{formatScore(item.seoScore)}</td>
                  <td className="p-4 text-[var(--text-secondary)]">{formatScore(item.readabilityScore)}</td>
                  <td className="p-4 text-[var(--text-secondary)]">{formatScore(item.engagementScore)}</td>
                  <td className="p-4 text-[var(--text-secondary)]">{formatDate(item.publishedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!articles.length ? (
            <div className="p-8 text-center text-sm text-[var(--text-secondary)]">No articles have been saved yet.</div>
          ) : null}
        </div>
      </Card>
  );
}
