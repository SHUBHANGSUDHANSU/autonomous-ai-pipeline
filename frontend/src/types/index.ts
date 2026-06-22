export type PublishStatus = "published" | "scheduled" | "pending" | "draft" | "failed" | "deleted";

export interface ApiContent {
  id: string;
  topic: string;
  title: string;
  body: string;
  tags: string[];
  word_count: number;
  readability_score: number;
  seo_score: number;
  engagement_score: number;
  meta_description: string;
  publish_status: PublishStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string | null;
  celery_task_id: string | null;
}

export interface ContentListResponse {
  total: number;
  limit: number;
  offset: number;
  items: ApiContent[];
}

export interface ContentItem {
  id: string;
  topic: string;
  title: string;
  excerpt: string;
  body: string;
  wordCount: number;
  readTime: string;
  seoScore: number;
  readabilityScore: number;
  engagementScore: number;
  status: PublishStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  createdAt: string | null;
  tags: string[];
  metaDescription: string;
  celeryTaskId?: string | null;
}

export type ContentRegenerateAction =
  | "regenerate_title"
  | "rewrite_intro"
  | "improve_seo"
  | "professional_tone"
  | "shorten_article"
  | "expand_article";

export interface RegenerateContentRequest {
  id: string;
  action: ContentRegenerateAction;
}

export interface PipelineState {
  topic: string;
  search_queries: string[];
  raw_research: Array<Record<string, unknown>>;
  summarized_research: string;
  draft_content: string;
  edited_content: string;
  metadata: Record<string, unknown>;
  publish_status: string;
  error: string | null;
  step_history: string[];
}

export interface QueuedTaskResponse {
  task_id: string;
  status: string;
}

export interface PipelineStatusResponse {
  task_id: string;
  status: string;
  result: PipelineState | Record<string, unknown> | null;
}

export interface ActivityItem {
  id: number | string;
  agent: string;
  action: string;
  time: string;
  status: "complete" | "running" | "failed" | "queued";
}

export interface ChartPoint {
  date: string;
  articles: number;
  cumulative: number;
}

export interface AgentStatus {
  id: "research" | "writer" | "editor" | "scheduler";
  name: string;
  icon: string;
  status: "idle" | "running" | "complete" | "failed";
  subTask: string;
  duration?: string;
}

export interface PipelineRunRecord {
  id: string;
  topic: string;
  status: string;
  agentsCompleted: number;
  duration: string;
  articlesCreated: number;
  date: string;
  state: Record<string, unknown>;
}

export type PipelineRunStatus = "success" | "failed" | "running";

export interface PipelineAgentResult {
  agentName: string;
  status: PipelineRunStatus;
  durationMs: number;
  tokensUsed: number;
  outputText?: string;
}

export interface PipelineTimelineRun {
  id: string;
  topic: string;
  status: PipelineRunStatus;
  startedAt: string;
  endedAt: string | null;
  totalDurationMs: number;
  agentResults: PipelineAgentResult[];
  articleRoute?: string;
  errorMessage?: string;
}

export interface PipelineRunsResponse {
  total: number;
  items: PipelineTimelineRun[];
}

export interface ApiAnalyticsMetrics {
  total_generated: number;
  published_count: number;
  scheduled_count: number;
  published_rate: number;
  avg_seo_score: number;
  avg_readability_score: number;
  avg_engagement_score: number;
  avg_word_count: number;
  total_words: number;
  this_week_count: number;
}

export interface ApiAnalyticsChartPoint {
  date: string;
  articles: number;
  cumulative: number;
}

export interface ApiAnalyticsScorePoint {
  metric: string;
  value: number;
}

export interface ApiAnalyticsTopic {
  topic: string;
  count: number;
}

export interface ApiAnalyticsTopArticle {
  id: string;
  topic: string;
  title: string;
  status: PublishStatus;
  word_count: number;
  readability_score: number;
  seo_score: number;
  engagement_score: number;
  composite_score: number;
  published_at: string | null;
  created_at: string | null;
}

export interface ApiAnalyticsResponse {
  generated_at: string;
  metrics: ApiAnalyticsMetrics;
  articles_over_time: ApiAnalyticsChartPoint[];
  average_scores: ApiAnalyticsScorePoint[];
  top_topics: ApiAnalyticsTopic[];
  top_articles: ApiAnalyticsTopArticle[];
}

export interface AnalyticsMetrics {
  totalGenerated: number;
  publishedCount: number;
  scheduledCount: number;
  publishedRate: number;
  avgSeoScore: number;
  avgReadabilityScore: number;
  avgEngagementScore: number;
  avgWordCount: number;
  totalWords: number;
  thisWeekCount: number;
}

export interface AnalyticsChartPoint {
  date: string;
  label: string;
  articles: number;
  cumulative: number;
}

export interface AnalyticsScorePoint {
  metric: string;
  value: number;
}

export interface AnalyticsTopic {
  topic: string;
  count: number;
}

export interface AnalyticsTopArticle {
  id: string;
  topic: string;
  title: string;
  status: PublishStatus;
  wordCount: number;
  readabilityScore: number;
  seoScore: number;
  engagementScore: number;
  compositeScore: number;
  publishedAt: string | null;
  createdAt: string | null;
}

export interface AnalyticsData {
  generatedAt: string;
  metrics: AnalyticsMetrics;
  articlesOverTime: AnalyticsChartPoint[];
  averageScores: AnalyticsScorePoint[];
  topTopics: AnalyticsTopic[];
  topArticles: AnalyticsTopArticle[];
}

export type TopicPriority = "high" | "medium" | "low";

export interface ScheduledTopic {
  id: string;
  topic: string;
  scheduledAt: string;
  priority: TopicPriority;
  estimatedDurationMinutes: number;
  tags: string[];
}
