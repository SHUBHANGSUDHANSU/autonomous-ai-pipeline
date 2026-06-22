import { create } from "zustand";
import type { NotificationType } from "./notificationStore";

export interface NexusToast {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  route?: string;
}

interface ToastStore {
  toasts: NexusToast[];
  addToast: (toast: Omit<NexusToast, "id"> & Partial<Pick<NexusToast, "id">>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = toast.id ?? createId();
    set((state) => ({
      toasts: [{ ...toast, id }, ...state.toasts].slice(0, 5),
    }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
