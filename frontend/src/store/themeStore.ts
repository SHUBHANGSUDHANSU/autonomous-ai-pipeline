import { create } from "zustand";

export type ThemeMode = "light" | "system" | "dark";
export type ResolvedTheme = "light" | "dark";

export const themeOrder: ThemeMode[] = ["light", "system", "dark"];

const storageKey = "nexus-theme-mode";
const legacyStorageKey = "nexus-theme";

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => ThemeMode;
}

const initialTheme = readStoredTheme();
applyThemePreference(initialTheme);

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    persistTheme(theme);
    applyThemePreference(theme);
    set({ theme });
  },
  cycleTheme: () => {
    const nextTheme = getNextTheme(get().theme);
    persistTheme(nextTheme);
    applyThemePreference(nextTheme);
    set({ theme: nextTheme });
    return nextTheme;
  },
}));

export function getNextTheme(theme: ThemeMode): ThemeMode {
  const index = themeOrder.indexOf(theme);
  return themeOrder[(index + 1) % themeOrder.length];
}

export function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme !== "system") {
    return theme;
  }

  if (typeof window === "undefined" || !window.matchMedia) {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyResolvedTheme(resolvedTheme: ResolvedTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.classList.remove("nexus-light-theme");
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
}

export function applyThemePreference(theme: ThemeMode): void {
  applyResolvedTheme(resolveTheme(theme));
}

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const storage = window.localStorage;
    if (!storage) {
      return "system";
    }

    const saved = normalizeTheme(storage.getItem(storageKey));
    if (saved) {
      return saved;
    }

    const legacy = normalizeTheme(storage.getItem(legacyStorageKey));
    if (legacy) {
      storage.setItem(storageKey, legacy);
      storage.removeItem(legacyStorageKey);
      return legacy;
    }
  } catch {
    return "system";
  }

  return "system";
}

function persistTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storage = window.localStorage;
    storage?.setItem(storageKey, theme);
    storage?.removeItem(legacyStorageKey);
  } catch {
    // Theme still applies for the active session when storage is unavailable.
  }
}

function normalizeTheme(value: string | null): ThemeMode | null {
  return value === "light" || value === "system" || value === "dark" ? value : null;
}
