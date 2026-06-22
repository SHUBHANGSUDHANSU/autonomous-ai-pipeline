import {
  closestCenter,
  DndContext,
  DragOverlay,
  MouseSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { cn } from "../../lib/utils";
import { useTopicQueueStore } from "../../store/topicQueueStore";
import type { TopicPriority } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ScheduledTopicOverlay, ScheduledTopicRow } from "./ScheduledTopicRow";

const priorities: Array<{ value: TopicPriority; label: string; className: string }> = [
  { value: "high", label: "High", className: "border-red-400/30 bg-red-500/10 text-red-200" },
  { value: "medium", label: "Medium", className: "border-amber-400/30 bg-amber-500/10 text-amber-100" },
  { value: "low", label: "Low", className: "border-[var(--border)] bg-white/[0.04] text-[var(--text-secondary)]" },
];

/**
 * Drag-and-drop scheduled topic queue for publish priority management.
 */
export function TopicQueue() {
  const topics = useTopicQueueStore((state) => state.topics);
  const reorderTopics = useTopicQueueStore((state) => state.reorderTopics);
  const addTopic = useTopicQueueStore((state) => state.addTopic);
  const removeTopic = useTopicQueueStore((state) => state.removeTopic);
  const updatePriority = useTopicQueueStore((state) => state.updatePriority);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [topicText, setTopicText] = useState("");
  const [priority, setPriority] = useState<TopicPriority>("medium");
  const [scheduledAt, setScheduledAt] = useState(defaultDateTimeLocal());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
  );
  const activeTopic = useMemo(() => topics.find((topic) => topic.id === activeId) ?? null, [activeId, topics]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeTopicId = String(event.active.id);
    const overTopicId = event.over?.id ? String(event.over.id) : null;

    if (overTopicId && activeTopicId !== overTopicId) {
      reorderTopics(activeTopicId, overTopicId);
    }

    setActiveId(null);
  }

  function submitTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTopic = topicText.trim();

    if (!cleanTopic || !scheduledAt) {
      return;
    }

    addTopic({
      topic: cleanTopic,
      priority,
      scheduledAt: new Date(scheduledAt).toISOString(),
      estimatedDurationMinutes: estimateDuration(priority),
      tags: deriveTags(cleanTopic),
    });
    setTopicText("");
    setPriority("medium");
    setScheduledAt(defaultDateTimeLocal(12));
  }

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white/[0.03] p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">Topic Queue</h3>
          <p className="text-sm text-[var(--text-secondary)]">Drag by the handle to reprioritize upcoming topics.</p>
        </div>
        <span className="inline-flex h-8 w-fit items-center rounded-full border border-[var(--border)] bg-white/[0.04] px-3 text-xs font-black text-[var(--text-secondary)]">
          {topics.length} queued
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
        <SortableContext items={topics.map((topic) => topic.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {topics.map((topic) => (
                <motion.div
                  key={topic.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <ScheduledTopicRow topic={topic} onRemove={removeTopic} onUpdatePriority={updatePriority} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTopic ? <ScheduledTopicOverlay topic={activeTopic} /> : null}
        </DragOverlay>
      </DndContext>

      {!topics.length ? (
        <div className="mt-3 grid min-h-40 place-items-center rounded-2xl border border-dashed border-[var(--border)] bg-white/[0.025] px-6 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-white/[0.04] text-[var(--text-muted)]">
              <CalendarClock size={20} />
            </div>
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">No topics queued</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Add a topic below to schedule the next agent run.</p>
          </div>
        </div>
      ) : null}

      <form className="mt-4 grid gap-3 rounded-2xl border border-[var(--border)] bg-black/[0.08] p-3" onSubmit={submitTopic}>
        <Input
          value={topicText}
          onChange={(event) => setTopicText(event.target.value)}
          placeholder="Add a scheduled topic..."
          aria-label="New scheduled topic"
        />
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap gap-2">
            {priorities.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-black transition",
                  priority === item.value ? item.className : "border-[var(--border)] bg-white/[0.03] text-[var(--text-muted)] hover:border-[var(--border-active)]",
                )}
                onClick={() => setPriority(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Input
            className="lg:w-[230px]"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            aria-label="Scheduled date and time"
          />
        </div>
        <Button type="submit" className="w-full sm:w-fit" disabled={!topicText.trim()}>
          <Plus size={17} />
          Add Topic
        </Button>
      </form>
    </section>
  );
}

function defaultDateTimeLocal(hoursFromNow = 6): string {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return toDateTimeLocalValue(date);
}

function toDateTimeLocalValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function estimateDuration(priority: TopicPriority): number {
  if (priority === "high") return 20;
  if (priority === "medium") return 16;
  return 12;
}

function deriveTags(topic: string): string[] {
  const stopWords = new Set(["and", "the", "for", "with", "after", "into", "from"]);
  const tags = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 3);

  return tags.length ? tags : ["content"];
}
