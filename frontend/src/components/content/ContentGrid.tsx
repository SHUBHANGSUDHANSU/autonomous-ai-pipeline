import type { ContentItem } from "../../types";
import { useContentStore } from "../../store/contentStore";
import { ContentCard } from "./ContentCard";
import { StatusBadge } from "./StatusBadge";
import { formatDate, formatScore } from "../../lib/utils";
import { Link } from "react-router-dom";

export function ContentGrid({ items }: { items: ContentItem[] }) {
  const viewMode = useContentStore((state) => state.viewMode);

  if (items.length === 0) {
    return (
      <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-[var(--border-active)] bg-white/[0.02] text-center text-[var(--text-secondary)]">
        No articles match this filter.
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/70">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4">Status</th>
              <th className="p-4">SEO</th>
              <th className="p-4">Words</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-4">
                  <Link className="font-bold text-[var(--text-primary)] hover:text-[var(--accent-secondary)]" to={`/content/${item.id}`}>
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{item.topic}</p>
                </td>
                <td className="p-4"><StatusBadge status={item.status} /></td>
                <td className="p-4 text-[var(--text-secondary)]">{formatScore(item.seoScore)}</td>
                <td className="p-4 text-[var(--text-secondary)]">{item.wordCount}</td>
                <td className="p-4 text-[var(--text-secondary)]">{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {items.map((item) => <ContentCard key={item.id} item={item} />)}
    </div>
  );
}
