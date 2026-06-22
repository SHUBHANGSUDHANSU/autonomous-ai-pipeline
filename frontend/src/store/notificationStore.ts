import { create } from "zustand";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface NexusNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  route?: string;
}

interface NotificationStore {
  notifications: NexusNotification[];
  addNotification: (notification: Omit<NexusNotification, "id" | "timestamp" | "read"> & Partial<Pick<NexusNotification, "id" | "timestamp" | "read">>) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const now = Date.now();

const mockNotifications: NexusNotification[] = [
  {
    id: "mock-notification-1",
    type: "success",
    title: "Article scheduled",
    message: "Scheduler Agent queued 'Healthcare AI Documentation' for the next publish slot.",
    timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
    read: false,
    route: "/content",
  },
  {
    id: "mock-notification-2",
    type: "info",
    title: "Research complete",
    message: "Research Agent synthesized five sources for climate tech funding trends.",
    timestamp: new Date(now - 28 * 60 * 1000).toISOString(),
    read: false,
    route: "/pipeline",
  },
  {
    id: "mock-notification-3",
    type: "warning",
    title: "Editor requested rewrite",
    message: "SEO score came in below target, so the writer loop was triggered once.",
    timestamp: new Date(now - 74 * 60 * 1000).toISOString(),
    read: true,
    route: "/pipeline",
  },
  {
    id: "mock-notification-4",
    type: "error",
    title: "Source scrape skipped",
    message: "One source timed out during scraping and was excluded from the research brief.",
    timestamp: new Date(now - 111 * 60 * 1000).toISOString(),
    read: true,
    route: "/pipeline",
  },
];

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: mockNotifications,
  addNotification: (notification) => {
    const id = notification.id ?? createId();
    set((state) => ({
      notifications: [
        {
          ...notification,
          id,
          timestamp: notification.timestamp ?? new Date().toISOString(),
          read: notification.read ?? false,
        },
        ...state.notifications,
      ],
    }));
    return id;
  },
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
    })),
  clearAll: () => set({ notifications: [] }),
}));

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
