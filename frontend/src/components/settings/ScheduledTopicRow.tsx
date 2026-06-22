import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { CSSProperties, HTMLAttributes } from "react";
import { cn, formatDate } from "../../lib/utils";
import type { ScheduledTopic, TopicPriority } from "../../types";

interface ScheduledTopicRowProps {
  topic: ScheduledTopic;
  onRemove?: (id: string) => void;
  onUpdatePriority?: (id: string, priority: TopicPriority) => void;
}

const priorityStyles: Record<TopicPriority, string> = {
  high: "bg-[var(--accent-danger)] shadow-[0_0_14px_rgba(255,107,107,0.45)]",
  medium: "bg-[var(--accent-warning)] shadow-[0_0_14px_rgba(255,159,67,0.45)]",
  low: "bg-[var(--text-muted)]",
};

const priorityOrder: TopicPriority[] = ["low", "medium", "high"];

/**
 * Sortable row for an upcoming scheduled topic.
 */
export function ScheduledTopicRow({ topic, onRemove, onUpdatePriority }: ScheduledTopicRowProps) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ScheduledTopicCard
      refSetter={setNodeRef}
      style={style}
      topic={topic}
      onRemove={onRemove}
      onUpdatePriority={onUpdatePriority}
      handleProps={{
        ref: setActivatorNodeRef,
        ...attributes,
        ...listeners,
      }}
      className={isDragging ? "rotate-[0.7deg] opacity-45 shadow-2xl shadow-black/25" : undefined}
    />
  );
}

export function ScheduledTopicOverlay({ topic }: { topic: ScheduledTopic }) {
  return <ScheduledTopicCard topic={topic} overlay />;
}

interface ScheduledTopicCardProps {
  topic: ScheduledTopic;
  onRemove?: (id: string) => void;
  onUpdatePriority?: (id: string, priority: TopicPriority) => void;
  handleProps?: HTMLAttributes<HTMLButtonElement> & { ref?: (node: HTMLButtonElement | null) => void };
  className?: string;
  style?: CSSProperties;
  refSetter?: (node: HTMLDivElement | null) => void;
  overlay?: boolean;
}

function ScheduledTopicCard({
  topic,
  onRemove,
  onUpdatePriority,
  handleProps,
  className,
  style,
  refSetter,
  overlay = false,
}: ScheduledTopicCardProps) {
  function cyclePriority() {
    const currentIndex = priorityOrder.indexOf(topic.priority);
    onUpdatePriority?.(topic.id, priorityOrder[(currentIndex + 1) % priorityOrder.length]);
  }

  return (
    <div
      ref={refSetter}
      style={style}
      className={cn(
        "grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.035] p-3 shadow-lg shadow-black/5",
        className,
        overlay && "rotate-[1.2deg] border-[var(--border-active)] bg-[var(--bg-card)] opacity-95 shadow-2xl shadow-black/35",
      )}
    >
      <button
        type="button"
        className="grid h-9 w-9 cursor-grab place-items-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--border-active)] hover:bg-white/[0.06] hover:text-[var(--text-primary)] active:cursor-grabbing"
        aria-label={`Drag ${topic.topic}`}
        {...handleProps}
      >
        <GripVertical size={17} />
      </button>

      <span
        className={cn("h-3 w-3 rounded-full", priorityStyles[topic.priority])}
        aria-label={`${topic.priority} priority`}
        title={`${topic.priority} priority`}
      />

      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--text-primary)]">{topic.topic}</p>
        <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
          {topic.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]"
            >
              {tag}
            </span>
          ))}
          <span className="rounded-full border border-[var(--border)] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--text-muted)]">
            {topic.estimatedDurationMinutes}m
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <time className="hidden whitespace-nowrap text-right text-xs font-bold text-[var(--text-secondary)] sm:block">
          {formatDate(topic.scheduledAt)}
        </time>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--border-active)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
          onClick={cyclePriority}
          aria-label={`Change priority for ${topic.topic}`}
          title="Cycle priority"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-xl border border-red-400/15 text-[var(--text-muted)] transition hover:border-red-400/35 hover:bg-red-500/10 hover:text-red-200"
          onClick={() => onRemove?.(topic.id)}
          aria-label={`Delete ${topic.topic}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
