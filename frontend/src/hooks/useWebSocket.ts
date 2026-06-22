import { useEffect } from "react";
import { usePipelineStore } from "../store/pipelineStore";

const simulatedMessages = [
  ["Research Agent", "Creating targeted web queries"],
  ["Research Agent", "Collecting Tavily source summaries"],
  ["Writer Agent", "Drafting article structure"],
  ["Writer Agent", "Expanding sections with research context"],
  ["Editor Agent", "Running clarity and grammar pass"],
  ["Editor Agent", "Computing readability and SEO scores"],
  ["Scheduler Agent", "Persisting content and scheduling publish task"],
];

export function useWebSocket(active: boolean) {
  const addLog = usePipelineStore((state) => state.addLog);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let index = 0;
    const timer = window.setInterval(() => {
      const [agent, message] = simulatedMessages[index % simulatedMessages.length];
      addLog(`${new Date().toLocaleTimeString("en", { hour12: false })} [${agent.toUpperCase()}] ${message}.`);
      index += 1;
    }, 1600);
    return () => window.clearInterval(timer);
  }, [active, addLog]);
}
