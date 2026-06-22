import { useMemo } from "react";
import { useNotificationStore, type NotificationType } from "../store/notificationStore";
import { useToastStore } from "../store/toastStore";

interface ToastOptions {
  route?: string;
  persistToNotifications?: boolean;
}

type ToastMethod = (title: string, message: string, options?: ToastOptions) => string;

export interface ToastApi {
  success: ToastMethod;
  error: ToastMethod;
  info: ToastMethod;
  warning: ToastMethod;
}

/**
 * Creates transient slide-in toasts and optionally persists them in the notification feed.
 */
export function useToast(): ToastApi {
  const addToast = useToastStore((state) => state.addToast);
  const addNotification = useNotificationStore((state) => state.addNotification);

  return useMemo(
    () => ({
      success: (title, message, options) => addToastAndNotification("success", title, message, options, addToast, addNotification),
      error: (title, message, options) => addToastAndNotification("error", title, message, options, addToast, addNotification),
      info: (title, message, options) => addToastAndNotification("info", title, message, options, addToast, addNotification),
      warning: (title, message, options) => addToastAndNotification("warning", title, message, options, addToast, addNotification),
    }),
    [addNotification, addToast],
  );
}

function addToastAndNotification(
  type: NotificationType,
  title: string,
  message: string,
  options: ToastOptions | undefined,
  addToast: ReturnType<typeof useToastStore.getState>["addToast"],
  addNotification: ReturnType<typeof useNotificationStore.getState>["addNotification"],
): string {
  const id = addToast({ type, title, message, route: options?.route });

  if (options?.persistToNotifications !== false) {
    addNotification({ type, title, message, route: options?.route });
  }

  return id;
}
