import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import type { ApiContent, ContentItem, ContentListResponse, RegenerateContentRequest } from "../types";
import { useToast } from "./useToast";

export function toContentItem(item: ApiContent): ContentItem {
  const wordCount = item.word_count || item.body?.split(/\s+/).filter(Boolean).length || 0;
  return {
    id: item.id,
    topic: item.topic,
    title: cleanTitle(item.title),
    excerpt: item.meta_description || item.body?.slice(0, 160) || "No excerpt available.",
    body: item.body,
    wordCount,
    readTime: `${Math.max(1, Math.ceil(wordCount / 220))} min`,
    seoScore: Number(item.seo_score || 0),
    readabilityScore: Number(item.readability_score || 0),
    engagementScore: Number(item.engagement_score || 0),
    status: item.publish_status,
    publishedAt: item.published_at,
    scheduledAt: item.scheduled_at,
    createdAt: item.created_at,
    tags: item.tags || [],
    metaDescription: item.meta_description || "",
    celeryTaskId: item.celery_task_id,
  };
}

export function useContentList(status?: string) {
  return useQuery({
    queryKey: ["content", status || "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100", offset: "0" });
      if (status && status !== "all") {
        params.set("status", status);
      }
      const { data } = await client.get<ContentListResponse>(`/content?${params.toString()}`);
      return {
        total: data.total,
        items: data.items.map(toContentItem),
      };
    },
    staleTime: 15000,
  });
}

export function useContentDetail(id?: string) {
  return useQuery({
    queryKey: ["content-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) {
        throw new Error("Content id is required");
      }
      const { data } = await client.get<ApiContent>(`/content/${id}`);
      return toContentItem(data);
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await client.delete(`/content/${id}`);
      return data;
    },
    onSuccess: () => {
      toast.success("Content deleted", "The article was moved out of the active library.", {
        route: "/content",
      });
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
  });
}

export function useRegenerateContent() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, action }: RegenerateContentRequest) => {
      const { data } = await client.post<ApiContent>(`/content/${id}/regenerate`, { action });
      return toContentItem(data);
    },
    onSuccess: (item, variables) => {
      queryClient.setQueryData(["content-detail", item.id], item);
      queryClient.invalidateQueries({ queryKey: ["content"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Article updated", `${regenerateActionLabel(variables.action)} finished and was saved.`, {
        route: `/content/${item.id}`,
      });
    },
  });
}

function cleanTitle(title: string): string {
  return String(title || "Untitled article")
    .replaceAll("*", "")
    .replace(/^headline:\s*/i, "")
    .trim();
}

function regenerateActionLabel(action: RegenerateContentRequest["action"]): string {
  const labels: Record<RegenerateContentRequest["action"], string> = {
    regenerate_title: "Regenerate title",
    rewrite_intro: "Rewrite intro",
    improve_seo: "Improve SEO",
    professional_tone: "Professional tone",
    shorten_article: "Shorten article",
    expand_article: "Expand article",
  };
  return labels[action];
}
