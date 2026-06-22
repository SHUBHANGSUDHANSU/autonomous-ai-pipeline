import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Rocket } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageWrapper } from "../components/layout/PageWrapper";
import { AgentFlow } from "../components/pipeline/AgentFlow";
import { LiveLog } from "../components/pipeline/LiveLog";
import { PipelineRunTimeline } from "../components/pipeline/PipelineRunTimeline";
import { TopicInput } from "../components/pipeline/TopicInput";
import { usePipelineRuns, usePipelineStatus } from "../hooks/usePipeline";
import { useToast } from "../hooks/useToast";
import { useWebSocket } from "../hooks/useWebSocket";
import { usePipelineStore } from "../store/pipelineStore";

export function Pipeline() {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const notifiedTaskRef = useRef<string | null>(null);
  const activeTaskId = usePipelineStore((state) => state.activeTaskId);
  const activeTopic = usePipelineStore((state) => state.activeTopic);
  const isRunning = usePipelineStore((state) => state.isRunning);
  const completeAllAgents = usePipelineStore((state) => state.completeAllAgents);
  const setRunning = usePipelineStore((state) => state.setRunning);
  const updateAgent = usePipelineStore((state) => state.updateAgent);
  const addLog = usePipelineStore((state) => state.addLog);
  const statusQuery = usePipelineStatus(activeTaskId);
  const runsQuery = usePipelineRuns();
  const queryClient = useQueryClient();
  const toast = useToast();
  useWebSocket(isRunning);

  useEffect(() => {
    if (searchParams.get("newRun") !== "1") return;
    setModalOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const status = statusQuery.data?.status;
    if (!status) return;
    if (status === "success") {
      completeAllAgents();
      setRunning(false);
      void queryClient.invalidateQueries({ queryKey: ["pipeline-runs"] });
      addLog(`${new Date().toLocaleTimeString("en", { hour12: false })} [SYSTEM] Pipeline completed successfully.`);
      const notificationKey = activeTaskId ?? "pipeline-success";
      if (notifiedTaskRef.current !== notificationKey) {
        notifiedTaskRef.current = notificationKey;
        toast.success(
          "Pipeline completed",
          `${activeTopic || "The latest topic"} finished research, writing, editing, and scheduling.`,
          { route: "/content" },
        );
      }
    }
    if (status === "failure") {
      const error = statusQuery.data?.result?.error;
      updateAgent("editor", "failed", error ? "Pipeline returned an error" : "Task failed");
      setRunning(false);
      void queryClient.invalidateQueries({ queryKey: ["pipeline-runs"] });
      addLog(`${new Date().toLocaleTimeString("en", { hour12: false })} [SYSTEM] Pipeline failed${error ? `: ${String(error).slice(0, 180)}` : "."}`);
      const notificationKey = activeTaskId ?? "pipeline-failure";
      if (notifiedTaskRef.current !== notificationKey) {
        notifiedTaskRef.current = notificationKey;
        toast.error("Pipeline failed", error ? String(error).slice(0, 180) : "The current run failed before publishing.", {
          route: "/pipeline",
        });
      }
    }
  }, [
    activeTaskId,
    activeTopic,
    statusQuery.data?.status,
    statusQuery.data?.result?.error,
    completeAllAgents,
    queryClient,
    setRunning,
    updateAgent,
    addLog,
    toast,
  ]);

  return (
    <PageWrapper>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent-secondary)]">Agent orchestration</p>
          <h1 className="font-display text-4xl font-extrabold text-[var(--text-primary)]">Pipeline</h1>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} />
          New Run
        </Button>
      </div>

      <Card className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Agent Flow</h2>
            <p className="text-sm text-[var(--text-secondary)]">Research to publishing, with visible handoffs.</p>
          </div>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            <Rocket size={17} />
            Launch
          </Button>
        </div>
        <AgentFlow />
      </Card>

      <LiveLog />

      <PipelineRunTimeline
        runs={runsQuery.data?.items ?? []}
        isLoading={runsQuery.isLoading}
        isError={runsQuery.isError}
        onRetry={() => runsQuery.refetch()}
      />

      <TopicInput open={modalOpen} onClose={() => setModalOpen(false)} />
    </PageWrapper>
  );
}
