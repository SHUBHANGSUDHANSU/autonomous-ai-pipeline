import { Grid2X2, List, Search } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useContentStore } from "../../store/contentStore";
import { cn } from "../../lib/utils";

const statuses = ["all", "published", "scheduled", "draft"];

export function ContentFilters() {
  const { search, status, sortMode, viewMode, setSearch, setStatus, setSortMode, setViewMode } = useContentStore();

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/70 p-4 backdrop-blur-xl">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <Input
            className="pl-11"
            placeholder="Search articles..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="h-12 rounded-xl border border-[var(--border)] bg-white/[0.04] px-4 text-sm text-[var(--text-primary)] outline-none"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as "newest" | "seo" | "longest")}
        >
          <option value="newest">Newest</option>
          <option value="seo">Highest SEO</option>
          <option value="longest">Longest</option>
        </select>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "grid" ? "primary" : "secondary"}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <Grid2X2 size={17} />
          </Button>
          <Button
            variant={viewMode === "list" ? "primary" : "secondary"}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List size={17} />
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {statuses.map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-bold capitalize transition",
              status === item
                ? "border-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--text-primary)]"
                : "border-[var(--border)] bg-white/[0.03] text-[var(--text-secondary)] hover:border-[var(--border-active)]",
            )}
            onClick={() => setStatus(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
