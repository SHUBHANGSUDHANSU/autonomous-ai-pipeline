import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTypewriter } from "../../hooks/useTypewriter";
import { cn } from "../../lib/utils";

interface StreamingOutputProps {
  text: string;
  agentName: string;
  isStreaming: boolean;
  onComplete?: () => void;
}

/**
 * Terminal-style output panel that streams agent text with a typewriter effect.
 */
export function StreamingOutput({ text, agentName, isStreaming, onComplete }: StreamingOutputProps) {
  const [activeText, setActiveText] = useState(isStreaming ? text : "");
  const [hasStarted, setHasStarted] = useState(isStreaming);
  const [copied, setCopied] = useState(false);
  const completionNotifiedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const previousStreamingRef = useRef(false);
  const previousTextRef = useRef(text);
  const { displayText, isDone, reset } = useTypewriter(activeText);
  const tokenCount = useMemo(
    () => Math.ceil((isDone ? activeText : displayText).length / 4),
    [activeText, displayText, isDone],
  );
  const showCard = hasStarted || isStreaming;
  const streamingActive = isStreaming && !isDone;

  useEffect(() => {
    if (!isStreaming) {
      previousStreamingRef.current = false;
      return;
    }

    const shouldStart = !previousStreamingRef.current || previousTextRef.current !== text;
    previousStreamingRef.current = true;

    if (!shouldStart) {
      return;
    }

    previousTextRef.current = text;
    setHasStarted(true);
    setCopied(false);
    completionNotifiedRef.current = false;
    setActiveText(text);
    reset();
  }, [isStreaming, reset, text]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [displayText]);

  useEffect(() => {
    if (!isDone || !hasStarted || completionNotifiedRef.current) {
      return;
    }
    completionNotifiedRef.current = true;
    onComplete?.();
  }, [hasStarted, isDone, onComplete]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function copyOutput() {
    await navigator.clipboard.writeText(activeText);
    setCopied(true);
    if (copyTimeoutRef.current !== null) {
      window.clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {showCard ? (
        <motion.section
          className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[#0d0d12] shadow-2xl shadow-black/30"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "h-2.5 w-2.5 shrink-0 rounded-full",
                  streamingActive ? "animate-pulse bg-[#00c9a7] shadow-[0_0_16px_#00c9a780]" : "bg-[var(--text-muted)]",
                )}
              />
              <span className="max-w-[220px] truncate rounded-full border border-[var(--border)] bg-white/[0.04] px-3 py-1 text-xs font-bold text-[var(--text-primary)]">
                {agentName}
              </span>
              <span className="font-mono text-xs text-[var(--text-muted)]">~{tokenCount.toLocaleString()} tokens</span>
            </div>

            {isDone ? (
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
                onClick={copyOutput}
              >
                {copied ? <Check size={15} className="text-[#00c9a7]" /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
            ) : null}
          </div>

          <div className="max-h-[420px] overflow-auto p-4 font-mono text-sm leading-[1.7] text-[#d7fff5]">
            <pre className="whitespace-pre-wrap break-words font-mono">
              {displayText}
              {!isDone ? <span className="streaming-cursor text-[#00c9a7]">▊</span> : null}
            </pre>
            <div ref={bottomRef} />
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
