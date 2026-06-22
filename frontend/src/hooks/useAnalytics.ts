import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import type { AnalyticsData, ApiAnalyticsResponse } from "../types";

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await client.get<ApiAnalyticsResponse>("/analytics");
      return toAnalyticsData(data);
    },
  });
}

function toAnalyticsData(data: ApiAnalyticsResponse): AnalyticsData {
  return {
    generatedAt: data.generated_at,
    metrics: {
      totalGenerated: data.metrics.total_generated,
      publishedCount: data.metrics.published_count,
      scheduledCount: data.metrics.scheduled_count,
      publishedRate: data.metrics.published_rate,
      avgSeoScore: data.metrics.avg_seo_score,
      avgReadabilityScore: data.metrics.avg_readability_score,
      avgEngagementScore: data.metrics.avg_engagement_score,
      avgWordCount: data.metrics.avg_word_count,
      totalWords: data.metrics.total_words,
      thisWeekCount: data.metrics.this_week_count,
    },
    articlesOverTime: data.articles_over_time.map((point) => ({
      date: point.date,
      label: formatChartLabel(point.date),
      articles: point.articles,
      cumulative: point.cumulative,
    })),
    averageScores: data.average_scores,
    topTopics: data.top_topics,
    topArticles: data.top_articles.map((article) => ({
      id: article.id,
      topic: article.topic,
      title: article.title,
      status: article.status,
      wordCount: article.word_count,
      readabilityScore: article.readability_score,
      seoScore: article.seo_score,
      engagementScore: article.engagement_score,
      compositeScore: article.composite_score,
      publishedAt: article.published_at,
      createdAt: article.created_at,
    })),
  };
}

function formatChartLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parsed);
}
