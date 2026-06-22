import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border border-[var(--border)] bg-white/[0.05] px-3 text-xs font-bold text-[var(--text-secondary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
