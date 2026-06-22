import { formatDistanceToNow } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useNotificationStore, type NotificationType } from "../../store/notificationStore";

const typeDotClass: Record<NotificationType, string> = {
  success: "bg-[#00c9a7] shadow-[0_0_14px_#00c9a780]",
  error: "bg-[var(--accent-danger)] shadow-[0_0_14px_rgba(255,107,107,0.45)]",
  info: "bg-[#6c63ff] shadow-[0_0_14px_#6c63ff80]",
  warning: "bg-[var(--accent-warning)] shadow-[0_0_14px_rgba(255,159,67,0.45)]",
};

/**
 * Top-bar notification inbox with unread badge, relative times, and route-aware items.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const notifications = useNotificationStore((state) => state.notifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const visibleNotifications = useMemo(() => notifications.slice(0, 10), [notifications]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function openNotification(id: string, route?: string) {
    markAsRead(id);
    setOpen(false);
    if (route) {
      navigate(route);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-white/[0.03] text-[var(--text-secondary)] transition hover:border-[var(--border-active)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open notifications"
      >
        <Bell size={19} />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 animate-pulse place-items-center rounded-full border border-[#0a0814] bg-[var(--accent-danger)] px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="absolute right-0 top-14 z-[70] w-[min(92vw,420px)] overflow-hidden rounded-[26px] border border-[var(--border-active)] bg-[#0a0814]/95 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-2xl"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="font-display text-lg font-bold text-[var(--text-primary)]">Notifications</p>
                <p className="text-xs text-[var(--text-muted)]">{unreadCount} unread updates</p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
                onClick={markAllAsRead}
              >
                <CheckCheck size={15} />
                Mark all read
              </button>
            </div>

            <div className="max-h-[440px] overflow-y-auto p-2">
              {visibleNotifications.length ? (
                visibleNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "group grid grid-cols-[auto_1fr_auto] gap-3 rounded-2xl p-3 transition",
                      notification.read
                        ? "hover:bg-white/[0.04]"
                        : "bg-[#6c63ff]/10 ring-1 ring-[#6c63ff]/10 hover:bg-[#6c63ff]/15",
                    )}
                  >
                    <button
                      type="button"
                      className="col-span-2 grid min-w-0 grid-cols-[auto_1fr] gap-3 text-left"
                      onClick={() => openNotification(notification.id, notification.route)}
                    >
                      <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", typeDotClass[notification.type])} />
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-bold text-[var(--text-primary)]">{notification.title}</span>
                          {!notification.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00c9a7]" /> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{notification.message}</span>
                        <span className="mt-2 block text-[11px] font-bold text-[var(--text-secondary)]">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-xl text-[var(--text-muted)] opacity-0 transition hover:bg-white/[0.06] hover:text-[var(--text-primary)] group-hover:opacity-100"
                      onClick={() => removeNotification(notification.id)}
                      aria-label={`Remove ${notification.title}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="grid min-h-40 place-items-center px-6 text-center">
                  <div>
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-white/[0.04] text-[var(--text-muted)]">
                      <Bell size={20} />
                    </div>
                    <p className="font-display text-lg font-bold text-[var(--text-primary)]">No notifications</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Agent updates will appear here.</p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 border-t border-[var(--border)] px-4 py-3 text-xs font-bold text-[var(--text-muted)] transition hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
              onClick={clearAll}
            >
              <Trash2 size={14} />
              Clear all
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
