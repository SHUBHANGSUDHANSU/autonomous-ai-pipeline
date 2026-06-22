import { motion } from "framer-motion";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { ActivityItem } from "../../types";
import { Card } from "../ui/Card";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] p-5">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--accent-secondary)]">Live activity</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">Agent Activity Feed</h2>
      </div>
      <div className="max-h-[430px] space-y-3 overflow-auto p-5">
        {!items.length ? (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-[var(--border)] text-center">
            <div>
              <Clock3 className="mx-auto text-[var(--text-muted)]" size={28} />
              <p className="mt-3 font-bold text-[var(--text-primary)]">No agent activity yet</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Run a pipeline to populate this feed with real agent updates.
              </p>
            </div>
          </div>
        ) : null}
        {items.slice(0, 10).map((item, index) => (
          <motion.div
            key={item.id}
            className="flex gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.03] p-3"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <div className="mt-1 text-[var(--accent-success)]">
              {item.status === "running" ? <Clock3 size={18} /> : <CheckCircle2 size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--accent-glow)] px-2 py-1 text-xs font-bold text-[var(--text-primary)]">
                  {item.agent}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{item.time}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.action}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
