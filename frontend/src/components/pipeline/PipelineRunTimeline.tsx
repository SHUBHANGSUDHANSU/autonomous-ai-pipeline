import { differenceInCalendarDays, formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ExternalLink, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useRunPipeline } from "../../hooks/usePipeline";
import { useToast } from "../../hooks/useToast";
import { cn } from "../../lib/utils";
import type { PipelineAgentResult, PipelineRunStatus, PipelineTimelineRun } from "../../types";
import { Button } from "../ui/Button";

interface PipelineRunTimelineProps {
  runs: PipelineTimelineRun[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

const statusClasses: Record<PipelineRunStatus, string> = {
  success: "border-[#00c9a7]/30 bg-[#00c9a7]/10 text-[#00c9a7]",
  failed: "border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]",
  running: "border-[#60a5fa]/30 bg-[#60a5fa]/10 text-[#93c5fd]",
};

const dotClasses: Record<PipelineRunStatus, string> = {
  success: "bg-[#00c9a7] shadow-[0_0_18px_#00c9a780]",
  failed: "bg-[var(--accent-danger)] shadow-[0_0_18px_rgba(255,107,107,0.45)]",
  running: "animate-pulse bg-[#60a5fa] shadow-[0_0_20px_rgba(96,165,250,0.8)]",
};

const agentPillClasses: Record<PipelineRunStatus, string> = {
  success: "border-[#00c9a7]/25 bg-[#00c9a7]/10 text-[#00c9a7]",
  failed: "border-[var(--accent-danger)]/25 bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]",
  running: "border-[#60a5fa]/25 bg-[#60a5fa]/10 text-[#93c5fd]",
};

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -18 },
  show: { opacity: 1, x: 0 },
};

/**
 * Vercel-style vertical timeline for pipeline run history.
 */
export function PipelineRunTimeline({ runs, isLoading = false, isError = false, onRetry }: PipelineRunTimelineProps) {
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const runPipeline = useRunPipeline();
  const toast = useToast();

  async function rerun(topic: string) {
    try {
      await runPipeline.mutateAsync({ topic, async: true });
    } catch {
      toast.error("Re-run failed", `Could not queue "${topic}".`, { route: "/pipeline" });
    }
  }

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-secondary)]">Run history</p>
          <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Pipeline Timeline</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {isLoading ? "Loading real run history" : `${runs.length} real ${runs.length === 1 ? "run" : "runs"}`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[72px_28px_minmax(0,1fr)] gap-3 sm:grid-cols-[120px_32px_minmax(0,1fr)] sm:gap-4">
              <div className="h-4 rounded-full bg-white/[0.05]" />
              <div className="mx-auto h-4 w-4 rounded-full bg-white/[0.08]" />
              <div className="h-24 rounded-3xl border border-[var(--border)] bg-white/[0.035]">
                <div className="m-4 h-4 w-2/5 rounded-full bg-white/[0.07]" />
                <div className="mx-4 mt-3 h-3 w-1/4 rounded-full bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div className="rounded-2xl border border-[var(--accent-danger)]/25 bg-[var(--accent-danger)]/10 p-5">
          <p className="font-display text-lg font-bold text-[var(--text-primary)]">Could not load real pipeline runs</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">The timeline is connected to the API now, but the run-history request failed.</p>
          {onRetry ? (
            <Button className="mt-4" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !isError && runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-active)] bg-white/[0.025] p-8 text-center">
          <p className="font-display text-xl font-bold text-[var(--text-primary)]">No real pipeline runs yet</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
            Launch a new pipeline run and this timeline will update from persisted Celery and database records.
          </p>
        </div>
      ) : null}

      {!isLoading && !isError && runs.length > 0 ? (
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
        {runs.map((run, index) => {
          const expanded = expandedRunId === run.id;
          const agentCount = run.agentResults.length;

          return (
            <motion.div
              key={run.id}
              variants={rowVariants}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="grid grid-cols-[72px_28px_minmax(0,1fr)] gap-3 sm:grid-cols-[120px_32px_minmax(0,1fr)] sm:gap-4"
            >
              <div className="pt-4 text-right text-xs font-bold text-[var(--text-muted)] sm:text-sm">
                {relativeRunTime(run.startedAt)}
              </div>

              <div className="relative flex justify-center">
                <span
                  className={cn(
                    "absolute top-0 h-[calc(100%+1rem)] w-px border-l border-dashed border-[var(--border-active)]",
                    index === runs.length - 1 && "h-6",
                  )}
                />
                <span className={cn("relative mt-5 h-3.5 w-3.5 rounded-full ring-4 ring-[var(--bg-card)]", dotClasses[run.status])} />
              </div>

              <motion.article
                layout
                className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white/[0.035] shadow-xl shadow-black/10"
              >
                <div
                  role="button"
                  tabIndex={0}
                  className="grid w-full grid-cols-[1fr_auto] gap-3 p-4 text-left transition hover:bg-white/[0.03] sm:grid-cols-[1fr_auto_auto]"
                  onClick={() => setExpandedRunId(expanded ? null : run.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedRunId(expanded ? null : run.id);
                    }
                  }}
                >
                  <span className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-display text-lg font-bold text-[var(--text-primary)]">{run.topic}</span>
                      <StatusBadge status={run.status} />
                    </span>
                    <span className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-[var(--text-muted)]">
                      <span>{formatDuration(run.totalDurationMs)}</span>
                      <span>{agentCount} agents</span>
                      <span>{totalTokens(run.agentResults).toLocaleString()} tokens</span>
                    </span>
                  </span>

                  <span className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      className="min-h-9 px-3 text-xs"
                      disabled={runPipeline.isPending || run.status === "running"}
                      onClick={(event) => {
                        event.stopPropagation();
                        rerun(run.topic);
                      }}
                    >
                      <RotateCcw size={14} />
                      Re-run
                    </Button>
                    <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.18 }} className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--text-secondary)]">
                      <ChevronDown size={17} />
                    </motion.span>
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      key="details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <div className="border-t border-[var(--border)] p-4">
                        <AgentMiniTimeline agents={run.agentResults} />
                        <TokenUsageChart agents={run.agentResults} />

                        {run.status === "failed" ? (
                          <div className="mt-4 rounded-2xl border border-[var(--accent-danger)]/25 bg-[var(--accent-danger)]/10 p-4 text-sm leading-6 text-red-100">
                            <p className="font-bold text-[var(--accent-danger)]">Run failed</p>
                            <p className="mt-1 text-[var(--text-secondary)]">{run.errorMessage}</p>
                          </div>
                        ) : null}

                        {run.status === "success" && run.articleRoute ? (
                          <Link
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--border-active)] hover:bg-white/[0.07]"
                            to={run.articleRoute}
                          >
                            View Article
                            <ExternalLink size={15} />
                          </Link>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            </motion.div>
          );
        })}
      </motion.div>
      ) : null}
    </section>
  );
}

function StatusBadge({ status }: { status: PipelineRunStatus }) {
  return (
    <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide", statusClasses[status])}>
      {status}
    </span>
  );
}

function AgentMiniTimeline({ agents }: { agents: PipelineAgentResult[] }) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Agents</p>
      <div className="flex flex-wrap gap-2">
        {agents.map((agent) => (
          <span
            key={agent.agentName}
            className={cn("inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold", agentPillClasses[agent.status])}
            title={agent.outputText}
          >
            {agent.status === "failed" ? <X size={14} /> : <Check size={14} />}
            {agent.agentName}
            <span className="font-mono text-[var(--text-muted)]">{formatDuration(agent.durationMs)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TokenUsageChart({ agents }: { agents: PipelineAgentResult[] }) {
  const maxTokens = Math.max(...agents.map((agent) => agent.tokensUsed), 1);

  return (
    <div className="mt-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">Token Usage</p>
      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-black/[0.12] p-4">
        {agents.map((agent) => (
          <div key={agent.agentName} className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)_80px] sm:items-center">
            <span className="truncate text-xs font-bold text-[var(--text-secondary)]">{agent.agentName}</span>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className={cn("h-full rounded-full", agent.status === "failed" ? "bg-[var(--accent-danger)]" : agent.status === "running" ? "bg-[#60a5fa]" : "bg-[#00c9a7]")}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, (agent.tokensUsed / maxTokens) * 100)}%` }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            </div>
            <span className="font-mono text-xs text-[var(--text-muted)]">{agent.tokensUsed.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function relativeRunTime(value: string): string {
  const date = new Date(value);
  const dayDifference = differenceInCalendarDays(new Date(), date);
  if (dayDifference === 1) {
    return "Yesterday";
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

function totalTokens(agents: PipelineAgentResult[]): number {
  return agents.reduce((sum, agent) => sum + agent.tokensUsed, 0);
}

function formatDuration(durationMs: number): string {
  if (durationMs < 0) {
    return "unknown";
  }

  if (durationMs === 0) {
    return "pending";
  }

  if (durationMs >= 60 * 1000) {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.round((durationMs % 60000) / 1000);
    return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  return `${Math.max(1, Math.round(durationMs / 1000))}s`;
}
