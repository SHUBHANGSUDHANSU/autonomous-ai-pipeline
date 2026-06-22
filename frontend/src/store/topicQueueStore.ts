import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { ScheduledTopic, TopicPriority } from "../types";

interface TopicQueueStore {
  topics: ScheduledTopic[];
  reorderTopics: (activeId: string, overId: string) => void;
  addTopic: (topic: Omit<ScheduledTopic, "id"> & Partial<Pick<ScheduledTopic, "id">>) => void;
  removeTopic: (id: string) => void;
  updatePriority: (id: string, priority: TopicPriority) => void;
}

const now = Date.now();
const hour = 60 * 60 * 1000;

const seedTopics: ScheduledTopic[] = [
  {
    id: "topic-ai-regulation",
    topic: "AI regulation impact on enterprise software teams",
    scheduledAt: new Date(now + 3 * hour).toISOString(),
    priority: "high",
    estimatedDurationMinutes: 18,
    tags: ["ai", "policy", "enterprise"],
  },
  {
    id: "topic-renewable-grid",
    topic: "Grid-scale renewable energy storage economics",
    scheduledAt: new Date(now + 8 * hour).toISOString(),
    priority: "high",
    estimatedDurationMinutes: 16,
    tags: ["energy", "storage", "climate"],
  },
  {
    id: "topic-blockchain-finance",
    topic: "Blockchain finance risk controls for modern fintech",
    scheduledAt: new Date(now + 14 * hour).toISOString(),
    priority: "medium",
    estimatedDurationMinutes: 14,
    tags: ["fintech", "blockchain", "risk"],
  },
  {
    id: "topic-healthcare-ai",
    topic: "Healthcare AI documentation workflows in hospitals",
    scheduledAt: new Date(now + 26 * hour).toISOString(),
    priority: "medium",
    estimatedDurationMinutes: 20,
    tags: ["healthcare", "ai", "workflow"],
  },
  {
    id: "topic-supply-chain",
    topic: "Predictive logistics after supply chain volatility",
    scheduledAt: new Date(now + 38 * hour).toISOString(),
    priority: "low",
    estimatedDurationMinutes: 13,
    tags: ["logistics", "forecasting"],
  },
  {
    id: "topic-carbon-capture",
    topic: "Carbon capture infrastructure and policy incentives",
    scheduledAt: new Date(now + 52 * hour).toISOString(),
    priority: "low",
    estimatedDurationMinutes: 17,
    tags: ["climate", "infrastructure"],
  },
];

export const useTopicQueueStore = create<TopicQueueStore>()(
  persist(
    (set) => ({
      topics: seedTopics,
      reorderTopics: (activeId, overId) =>
        set((state) => {
          const activeIndex = state.topics.findIndex((topic) => topic.id === activeId);
          const overIndex = state.topics.findIndex((topic) => topic.id === overId);

          if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
            return state;
          }

          const topics = [...state.topics];
          [topics[activeIndex], topics[overIndex]] = [topics[overIndex], topics[activeIndex]];
          return { topics };
        }),
      addTopic: (topic) =>
        set((state) => ({
          topics: [
            ...state.topics,
            {
              ...topic,
              id: topic.id ?? createTopicId(),
            },
          ],
        })),
      removeTopic: (id) =>
        set((state) => ({
          topics: state.topics.filter((topic) => topic.id !== id),
        })),
      updatePriority: (id, priority) =>
        set((state) => ({
          topics: state.topics.map((topic) => (topic.id === id ? { ...topic, priority } : topic)),
        })),
    }),
    {
      name: "nexus-topic-queue",
      storage: createJSONStorage(getSafeStorage),
      version: 1,
    },
  ),
);

const memoryStorage = new Map<string, string>();

function getSafeStorage(): StateStorage {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Fall through to in-memory storage for restricted browser contexts.
  }

  return {
    getItem: (name) => memoryStorage.get(name) ?? null,
    setItem: (name, value) => {
      memoryStorage.set(name, value);
    },
    removeItem: (name) => {
      memoryStorage.delete(name);
    },
  };
}

function createTopicId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `scheduled-topic-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
