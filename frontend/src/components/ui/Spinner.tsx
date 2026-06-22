import { Loader2 } from "lucide-react";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-[var(--text-secondary)]">
      <Loader2 className="animate-spin text-[var(--accent-primary)]" size={20} />
      {label}
    </div>
  );
}
