import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import type { PipelineRunsResponse, PipelineState, PipelineStatusResponse, QueuedTaskResponse } from "../types";
import { usePipelineStore } from "../store/pipelineStore";
import { useToast } from "./useToast";

interface RunPipelineInput {
  topic: string;
  async?: boolean;
}

export function useRunPipeline() {
  const setActiveRun = usePipelineStore((state) => state.setActiveRun);
  const setRunning = usePipelineStore((state) => state.setRunning);
  const addLog = usePipelineStore((state) => state.addLog);
  const updateAgent = usePipelineStore((state) => state.updateAgent);
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RunPipelineInput) => {
      const { data } = await client.post<QueuedTaskResponse | PipelineState>("/pipeline/run", {
        topic: payload.topic,
        async: payload.async ?? true,
      });
      return data;
    },
    onMutate: ({ topic }) => {
      setRunning(true);
      setActiveRun(null, topic);
      updateAgent("research", "running", "Generating search queries");
      addLog(`${timestamp()} [SYSTEM] Launching pipeline for "${topic}".`);
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["pipeline-runs"] });
      if ("task_id" in data) {
        setActiveRun(data.task_id, variables.topic);
        toast.info("Pipeline queued", `Celery accepted "${variables.topic}" for autonomous processing.`, {
          route: "/pipeline",
        });
        addLog(`${timestamp()} [CELERY] Queued task ${data.task_id}.`);
      } else {
        toast.success("Pipeline completed", `"${variables.topic}" finished and is ready in the content workflow.`, {
          route: "/content",
        });
        addLog(`${timestamp()} [SCHEDULER] ${data.publish_status}.`);
      }
    },
    onError: () => {
      setRunning(false);
      updateAgent("research", "failed", "Pipeline launch failed");
      toast.error("Pipeline launch failed", "The API rejected the launch request. Check the backend connection.", {
        route: "/pipeline",
      });
    },
  });
}

export function usePipelineStatus(taskId?: string | null) {
  return useQuery({
    queryKey: ["pipeline-status", taskId],
    enabled: Boolean(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["success", "failure", "revoked"].includes(status) ? false : 4000;
    },
    queryFn: async () => {
      const { data } = await client.get<PipelineStatusResponse>(`/pipeline/status/${taskId}`);
      return data;
    },
  });
}

export function usePipelineRuns() {
  return useQuery({
    queryKey: ["pipeline-runs"],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await client.get<PipelineRunsResponse>("/pipeline/runs?limit=20");
      return data;
    },
  });
}

function timestamp(): string {
  return new Date().toLocaleTimeString("en", { hour12: false });
}
