import { motion } from "framer-motion";
import { Bot, CheckCircle2, Clock, FilePenLine, PenLine, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { StreamingOutput } from "./StreamingOutput";

interface AgentStreamCardProps {
  text: string;
  agentName: string;
  isStreaming: boolean;
  onComplete?: () => void;
}

const agentIcons = [
  { match: "research", icon: Search },
  { match: "writer", icon: PenLine },
  { match: "editor", icon: FilePenLine },
  { match: "schedule", icon: Clock },
  { match: "scheduler", icon: Clock },
];

/**
 * Agent container for streaming generated output with status, timing, and token metadata.
 */
export function AgentStreamCard({ text, agentName, isStreaming, onComplete }: AgentStreamCardProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [complete, setComplete] = useState(false);
  const tokenEstimate = useMemo(() => Math.ceil(text.length / 4), [text]);
  const Icon = useMemo(() => {
    const normalized = agentName.toLowerCase();
    return agentIcons.find((entry) => normalized.includes(entry.match))?.icon ?? Bot;
  }, [agentName]);

  useEffect(() => {
    if (!isStreaming) {
      return undefined;
    }

    setComplete(false);
    setElapsedMs(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 100);

    return () => window.clearInterval(timer);
  }, [isStreaming]);

  function handleComplete() {
    setComplete(true);
    onComplete?.();
  }

  const statusText = isStreaming && !complete ? "Streaming..." : "Complete";

  return (
    <motion.article
      className={cn(
        "overflow-hidden rounded-3xl border bg-[rgba(10,8,20,0.82)] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl",
        isStreaming && !complete ? "border-[#6c63ff]/50" : "border-[var(--border)]",
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-[#00c9a7] shadow-[0_0_24px_#6c63ff30]">
            <Icon size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-bold text-[var(--text-primary)]">{agentName}</h3>
            <p className="font-mono text-xs text-[var(--text-muted)]">~{tokenEstimate.toLocaleString()} tokens</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.04] px-3 text-xs font-bold text-[var(--text-secondary)]">
            {complete ? <CheckCircle2 size={15} className="text-[#00c9a7]" /> : <Sparkles size={15} className="text-[#6c63ff]" />}
            {statusText}
          </span>
          <span className="rounded-full border border-[var(--border)] bg-white/[0.04] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      <StreamingOutput text={text} agentName={agentName} isStreaming={isStreaming} onComplete={handleComplete} />
    </motion.article>
  );
}
