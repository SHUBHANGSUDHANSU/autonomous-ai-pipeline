import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect } from "react";
import { cn } from "../../lib/utils";
import { useToastStore, type NexusToast } from "../../store/toastStore";
import type { NotificationType } from "../../store/notificationStore";

const toastDurationMs = 4000;

const styles: Record<NotificationType, { border: string; icon: typeof Info; text: string; progress: string }> = {
  success: {
    border: "border-l-[#00c9a7]",
    icon: CheckCircle2,
    text: "text-[#00c9a7]",
    progress: "bg-[#00c9a7]",
  },
  error: {
    border: "border-l-[var(--accent-danger)]",
    icon: XCircle,
    text: "text-[var(--accent-danger)]",
    progress: "bg-[var(--accent-danger)]",
  },
  info: {
    border: "border-l-[#6c63ff]",
    icon: Info,
    text: "text-[#6c63ff]",
    progress: "bg-[#6c63ff]",
  },
  warning: {
    border: "border-l-[var(--accent-warning)]",
    icon: AlertTriangle,
    text: "text-[var(--accent-warning)]",
    progress: "bg-[var(--accent-warning)]",
  },
};

/**
 * Fixed stack for transient Nexus toasts.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div className="pointer-events-none fixed right-4 top-5 z-[100] flex w-[min(92vw,390px)] flex-col gap-3 sm:right-6">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, removeToast }: { toast: NexusToast; removeToast: (id: string) => void }) {
  const style = styles[toast.type];
  const Icon = style.icon;

  useEffect(() => {
    const timeout = window.setTimeout(() => removeToast(toast.id), toastDurationMs);
    return () => window.clearTimeout(timeout);
  }, [removeToast, toast.id]);

  return (
    <motion.div
      layout
      className={cn(
        "pointer-events-auto overflow-hidden rounded-2xl border border-[var(--border-active)] border-l-4 bg-[#0a0814]/95 shadow-2xl shadow-black/40 backdrop-blur-2xl",
        style.border,
      )}
      initial={{ opacity: 0, x: 56, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <div className="flex gap-3 p-4">
        <Icon className={cn("mt-0.5 shrink-0", style.text)} size={20} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">{toast.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">{toast.message}</p>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] transition hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
          onClick={() => removeToast(toast.id)}
          onPointerDown={() => removeToast(toast.id)}
          aria-label="Close toast"
        >
          <X size={15} />
        </button>
      </div>
      <div className="h-1 bg-white/[0.05]">
        <motion.div
          className={cn("h-full", style.progress)}
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: toastDurationMs / 1000, ease: "linear" }}
          onAnimationComplete={() => removeToast(toast.id)}
        />
      </div>
    </motion.div>
  );
}
