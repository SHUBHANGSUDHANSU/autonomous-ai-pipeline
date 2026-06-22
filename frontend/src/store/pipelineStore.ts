import { create } from "zustand";
import type { AgentStatus, PipelineRunRecord } from "../types";
import { mockRuns } from "../api/mockData";

const defaultAgents: AgentStatus[] = [
  {
    id: "research",
    name: "Research Agent",
    icon: "Search",
    status: "idle",
    subTask: "Waiting for topic",
  },
  {
    id: "writer",
    name: "Writer Agent",
    icon: "PenLine",
    status: "idle",
    subTask: "Draft queue clear",
  },
  {
    id: "editor",
    name: "Editor Agent",
    icon: "FilePenLine",
    status: "idle",
    subTask: "Quality gate ready",
  },
  {
    id: "scheduler",
    name: "Scheduler Agent",
    icon: "CalendarClock",
    status: "idle",
    subTask: "Publish slot available",
  },
];

interface PipelineStore {
  activeTaskId: string | null;
  activeTopic: string | null;
  isRunning: boolean;
  agents: AgentStatus[];
  logs: string[];
  pastRuns: PipelineRunRecord[];
  setActiveRun: (taskId: string | null, topic: string | null) => void;
  setRunning: (running: boolean) => void;
  updateAgent: (id: AgentStatus["id"], status: AgentStatus["status"], subTask?: string) => void;
  completeAllAgents: () => void;
  resetAgents: () => void;
  addLog: (line: string) => void;
  clearLogs: () => void;
  addPastRun: (run: PipelineRunRecord) => void;
}

export const usePipelineStore = create<PipelineStore>((set) => ({
  activeTaskId: null,
  activeTopic: null,
  isRunning: false,
  agents: defaultAgents,
  logs: [
    "12:00:00 [SYSTEM] Pipeline terminal initialized.",
    "12:00:01 [SYSTEM] Waiting for launch command.",
  ],
  pastRuns: mockRuns,
  setActiveRun: (taskId, topic) => set({ activeTaskId: taskId, activeTopic: topic }),
  setRunning: (running) => set({ isRunning: running }),
  updateAgent: (id, status, subTask) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === id
          ? { ...agent, status, subTask: subTask || agent.subTask, duration: status === "complete" ? "4.2s" : agent.duration }
          : agent,
      ),
    })),
  completeAllAgents: () =>
    set((state) => ({
      agents: state.agents.map((agent) => ({
        ...agent,
        status: "complete",
        subTask: "Completed",
        duration: agent.duration || "4.2s",
      })),
    })),
  resetAgents: () => set({ agents: defaultAgents }),
  addLog: (line) =>
    set((state) => ({
      logs: [...state.logs.slice(-160), line],
    })),
  clearLogs: () => set({ logs: [] }),
  addPastRun: (run) => set((state) => ({ pastRuns: [run, ...state.pastRuns] })),
}));
