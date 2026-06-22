import type { ReactNode } from "react";
import { Card } from "../ui/Card";

export function MetricCard({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06] text-[var(--accent-secondary)]">
        {icon}
      </div>
      <strong className="font-display text-3xl font-extrabold text-[var(--text-primary)]">{value}</strong>
      <p className="mt-1 text-sm font-bold text-[var(--text-secondary)]">{label}</p>
      <p className="mt-3 text-xs text-[var(--text-muted)]">{detail}</p>
    </Card>
  );
}
