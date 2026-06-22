import { useMemo } from "react";
import { ContentFilters } from "../components/content/ContentFilters";
import { ContentGrid } from "../components/content/ContentGrid";
import { PageWrapper } from "../components/layout/PageWrapper";
import { SkeletonGrid } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";
import { useContentList } from "../hooks/useContent";
import { useContentStore } from "../store/contentStore";

export function Content() {
  const { status, search, sortMode } = useContentStore();
  const { data, isLoading, isError, refetch } = useContentList(status);
  const items = data?.items || [];

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return [...items]
      .filter((item) => !query || `${item.title} ${item.topic} ${item.excerpt}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sortMode === "seo") return b.seoScore - a.seoScore;
        if (sortMode === "longest") return b.wordCount - a.wordCount;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [items, search, sortMode]);

  return (
    <PageWrapper>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-secondary)]">Content operations</p>
          <h1 className="font-display text-4xl font-extrabold text-[var(--text-primary)]">Content Library</h1>
        </div>
        <p className="text-[var(--text-secondary)]">{data?.total || 0} articles</p>
      </div>
      <ContentFilters />
      {isLoading ? <SkeletonGrid count={6} /> : null}
      {isError ? (
        <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
          Could not load content. <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : null}
      {!isLoading && !isError ? <ContentGrid items={filtered} /> : null}
      <div className="flex justify-center gap-2">
        <Button variant="secondary">Previous</Button>
        <Button variant="primary">1</Button>
        <Button variant="secondary">2</Button>
        <Button variant="secondary">Next</Button>
      </div>
    </PageWrapper>
  );
}
