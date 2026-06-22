import { Copy } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "../ui/Button";
import { useToast } from "../../hooks/useToast";
import { usePipelineStore } from "../../store/pipelineStore";

export function LiveLog() {
  const logs = usePipelineStore((state) => state.logs);
  const ref = useRef<HTMLDivElement | null>(null);
  const toast = useToast();

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  async function copyLogs() {
    await navigator.clipboard.writeText(logs.join("\n"));
    toast.success("Logs copied", "The current agent terminal output was copied.", {
      persistToNotifications: false,
    });
  }

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[#0d0d12] shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-secondary)]">Live terminal</p>
          <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Agent Logs</h2>
        </div>
        <Button variant="ghost" onClick={copyLogs}>
          <Copy size={16} />
          Copy logs
        </Button>
      </div>
      <div ref={ref} className="h-80 overflow-auto p-4 font-mono text-sm leading-7 text-[#8fffdc]">
        {logs.map((line, index) => (
          <div key={`${line}-${index}`}>
            <span className="text-[var(--text-muted)]">{String(index + 1).padStart(3, "0")}</span>{" "}
            {line}
          </div>
        ))}
      </div>
    </section>
  );
}
