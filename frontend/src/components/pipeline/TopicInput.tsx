import { useState } from "react";
import { Rocket, SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { useRunPipeline } from "../../hooks/usePipeline";
import { useToast } from "../../hooks/useToast";

interface TopicInputProps {
  open: boolean;
  onClose: () => void;
}

export function TopicInput({ open, onClose }: TopicInputProps) {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"now" | "later">("now");
  const [advanced, setAdvanced] = useState(false);
  const [maxSources, setMaxSources] = useState(5);
  const [tone, setTone] = useState("Professional");
  const runPipeline = useRunPipeline();
  const toast = useToast();

  async function launch() {
    if (!topic.trim()) {
      toast.warning("Topic required", "Add a research topic before launching the agents.", {
        persistToNotifications: false,
      });
      return;
    }
    await runPipeline.mutateAsync({ topic, async: true });
    toast.success(
      mode === "later" ? "Scheduled pipeline queued" : "Pipeline launched",
      mode === "later" ? "The topic is ready for the scheduled agent run." : "Agents are now researching and drafting the topic.",
      { route: "/pipeline" },
    );
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Launch Pipeline">
      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
            What should the agents research today?
          </span>
          <textarea
            className="min-h-36 w-full rounded-2xl border border-[var(--border)] bg-white/[0.04] p-4 text-lg text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-glow)]"
            placeholder="Example: AI agents for enterprise knowledge management"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {["now", "later"].map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-2xl border p-4 text-left font-bold capitalize ${
                mode === item
                  ? "border-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--text-primary)]"
                  : "border-[var(--border)] bg-white/[0.03] text-[var(--text-secondary)]"
              }`}
              onClick={() => setMode(item as "now" | "later")}
            >
              Run {item === "now" ? "now" : "later"}
            </button>
          ))}
        </div>

        {mode === "later" ? <Input type="datetime-local" /> : null}

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4 text-sm font-bold text-[var(--text-primary)]"
          onClick={() => setAdvanced((value) => !value)}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Advanced options
          </span>
          <span>{advanced ? "Hide" : "Show"}</span>
        </button>

        {advanced ? (
          <div className="grid gap-4 rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4">
            <label className="text-sm font-bold text-[var(--text-secondary)]">
              Max sources: {maxSources}
              <input
                className="mt-3 w-full accent-[var(--accent-primary)]"
                type="range"
                min={1}
                max={10}
                value={maxSources}
                onChange={(event) => setMaxSources(Number(event.target.value))}
              />
            </label>
            <label className="text-sm font-bold text-[var(--text-secondary)]">
              Tone
              <select
                className="mt-2 h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-[var(--text-primary)]"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              >
                <option>Professional</option>
                <option>Casual</option>
                <option>Technical</option>
              </select>
            </label>
          </div>
        ) : null}

        <Button className="min-h-14 w-full text-base" onClick={launch} disabled={runPipeline.isPending}>
          <Rocket size={18} />
          Launch Pipeline
        </Button>
      </div>
    </Modal>
  );
}
