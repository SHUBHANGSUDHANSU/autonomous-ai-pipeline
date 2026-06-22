import { motion } from "framer-motion";
import { AgentCard } from "./AgentCard";
import { usePipelineStore } from "../../store/pipelineStore";

export function AgentFlow() {
  const agents = usePipelineStore((state) => state.agents);
  const isRunning = usePipelineStore((state) => state.isRunning);

  return (
    <div className="overflow-x-auto rounded-3xl border border-[var(--border)] bg-white/[0.02] p-5">
      <div className="flex min-w-[920px] items-center gap-5">
        {agents.map((agent, index) => (
          <div key={agent.id} className="flex items-center gap-5">
            <AgentCard agent={agent} />
            {index < agents.length - 1 ? (
              <div className="relative h-px w-20 bg-[var(--border-active)]">
                {isRunning ? (
                  <motion.span
                    className="absolute -top-1.5 h-3 w-3 rounded-full bg-[var(--accent-secondary)] shadow-[0_0_18px_var(--accent-secondary)]"
                    animate={{ x: [0, 80] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
