import type { PublishStatus } from "../../types";
import { cn } from "../../lib/utils";

const styles: Record<string, string> = {
  published: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  scheduled: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  pending: "border-slate-400/25 bg-slate-400/10 text-slate-200",
  draft: "border-slate-400/25 bg-slate-400/10 text-slate-200",
  failed: "border-red-400/25 bg-red-400/10 text-red-200",
  deleted: "border-red-400/25 bg-red-400/10 text-red-200",
};

export function StatusBadge({ status }: { status: PublishStatus | string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-extrabold capitalize",
        styles[status] || styles.pending,
      )}
    >
      {status}
    </span>
  );
}
