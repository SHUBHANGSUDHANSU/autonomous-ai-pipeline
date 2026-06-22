import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { ContentItem } from "../../types";
import { formatDate, formatScore, scoreColor } from "../../lib/utils";
import { StatusBadge } from "./StatusBadge";

export function ContentCard({ item }: { item: ContentItem }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group relative rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:border-[var(--border-active)] hover:shadow-glow"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="rounded-full bg-[var(--accent-glow)] px-3 py-1 text-xs font-extrabold text-[var(--text-primary)]">
          {item.topic}
        </span>
        <StatusBadge status={item.status} />
      </div>
      <Link to={`/content/${item.id}`} className="block">
        <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-[var(--text-primary)]">
          {item.title}
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{item.excerpt}</p>
      </Link>
      <div className="mt-6 space-y-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, item.seoScore * 10)}%`, background: scoreColor(item.seoScore) }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <span>{item.wordCount} words</span>
          <span>{item.readTime}</span>
          <span>SEO {formatScore(item.seoScore)}</span>
          <span>{formatDate(item.publishedAt || item.scheduledAt || item.createdAt)}</span>
        </div>
      </div>
    </motion.article>
  );
}
