import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, FilePenLine, Loader2, PenLine, Search, XCircle } from "lucide-react";
import type { AgentStatus } from "../../types";
import { cn } from "../../lib/utils";

const icons = {
  research: Search,
  writer: PenLine,
  editor: FilePenLine,
  scheduler: CalendarClock,
};

export function AgentCard({ agent }: { agent: AgentStatus }) {
  const Icon = icons[agent.id];
  const running = agent.status === "running";

  return (
    <motion.div
      className={cn(
        "relative flex h-[148px] min-w-[200px] flex-col justify-between rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/80 p-4 backdrop-blur-xl",
        running && "border-[var(--accent-primary)]",
        agent.status === "complete" && "border-emerald-400/30",
        agent.status === "failed" && "border-red-400/30",
      )}
      animate={
        running
          ? {
              boxShadow: [
                "0 0 0px #6c63ff40",
                "0 0 24px #6c63ff80",
                "0 0 0px #6c63ff40",
              ],
            }
          : { boxShadow: "0 0 0px transparent" }
      }
      transition={running ? { duration: 1.5, repeat: Infinity } : { duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.06] text-[var(--accent-secondary)]">
          <Icon size={22} />
        </div>
        <StatusIcon status={agent.status} />
      </div>
      <div>
        <h3 className="font-display text-lg font-bold text-[var(--text-primary)]">{agent.name}</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{agent.subTask}</p>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize text-[var(--text-muted)]">{agent.status}</span>
        {agent.duration ? <span className="font-mono text-[var(--text-secondary)]">{agent.duration}</span> : null}
      </div>
    </motion.div>
  );
}

function StatusIcon({ status }: { status: AgentStatus["status"] }) {
  if (status === "running") return <Loader2 className="animate-spin text-[var(--accent-primary)]" size={20} />;
  if (status === "complete") return <CheckCircle2 className="text-[var(--accent-success)]" size={20} />;
  if (status === "failed") return <XCircle className="text-[var(--accent-danger)]" size={20} />;
  return <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]" />;
}
