import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { useRunPipeline } from "../../hooks/usePipeline";
import { useToast } from "../../hooks/useToast";

const suggestions = ["AI trends 2026", "Climate tech", "Autonomous agents", "Future of search"];

export function QuickRun() {
  const [topic, setTopic] = useState("");
  const runPipeline = useRunPipeline();
  const navigate = useNavigate();
  const toast = useToast();

  async function submit(topicValue = topic) {
    const cleanTopic = topicValue.trim();
    if (!cleanTopic) {
      toast.warning("Topic required", "Enter a topic before launching the pipeline.", {
        persistToNotifications: false,
      });
      return;
    }
    await runPipeline.mutateAsync({ topic: cleanTopic, async: true });
    navigate("/pipeline");
  }

  return (
    <motion.div
      className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)]/68 p-3 shadow-2xl shadow-black/20 backdrop-blur-2xl focus-within:border-[var(--accent-primary)] focus-within:shadow-glow"
      whileFocus={{ scale: 1.01 }}
    >
      <form
        className="flex flex-col gap-3 md:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          className="min-h-14 flex-1 rounded-2xl border-0 bg-transparent px-4 text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          placeholder="Enter a topic to research and publish..."
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        />
        <Button type="submit" disabled={runPipeline.isPending} className="min-h-14 px-6">
          <Rocket size={18} />
          Run Pipeline
        </Button>
      </form>
      <div className="flex flex-wrap gap-2 px-2 pb-1 pt-3">
        {suggestions.map((item) => (
          <button
            key={item}
            className="rounded-full border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
            onClick={() => submit(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
