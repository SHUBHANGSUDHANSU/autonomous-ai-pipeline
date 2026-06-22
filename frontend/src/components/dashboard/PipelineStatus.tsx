import { motion } from "framer-motion";
import { Activity, Circle } from "lucide-react";
import { usePipelineStore } from "../../store/pipelineStore";
import { Card } from "../ui/Card";

export function PipelineStatus() {
  const isRunning = usePipelineStore((state) => state.isRunning);
  const agents = usePipelineStore((state) => state.agents);
  const activeTopic = usePipelineStore((state) => state.activeTopic);

  return (
    <Card className="min-h-[430px] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--accent-secondary)]">Current run</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-[var(--text-primary)]">Pipeline Status</h2>
        </div>
        <span className="relative flex h-4 w-4">
          {isRunning ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-success)] opacity-70" /> : null}
          <span className={`relative inline-flex h-4 w-4 rounded-full ${isRunning ? "bg-[var(--accent-success)]" : "bg-[var(--text-muted)]"}`} />
        </span>
      </div>

      {isRunning ? (
        <div>
          <p className="mb-5 text-sm text-[var(--text-secondary)]">
            Running topic: <span className="text-[var(--text-primary)]">{activeTopic}</span>
          </p>
          <div className="space-y-3">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.03] p-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Activity size={18} className={agent.status === "running" ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"} />
                <div className="flex-1">
                  <strong className="text-sm text-[var(--text-primary)]">{agent.name}</strong>
                  <p className="text-xs text-[var(--text-secondary)]">{agent.subTask}</p>
                </div>
                <span className="text-xs capitalize text-[var(--text-muted)]">{agent.status}</span>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid min-h-[280px] place-items-center rounded-3xl border border-dashed border-[var(--border-active)] bg-white/[0.02] text-center">
          <div>
            <Circle className="mx-auto mb-4 animate-pulse text-[var(--accent-primary)]" size={34} />
            <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">No pipeline running</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
              Launch a topic from Quick Run or the Pipeline page to watch the agents move.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
