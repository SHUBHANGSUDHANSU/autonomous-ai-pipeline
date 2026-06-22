import { useEffect, useMemo, useState } from "react";
import {
  applyResolvedTheme,
  getNextTheme,
  resolveTheme,
  useThemeStore,
  type ResolvedTheme,
  type ThemeMode,
} from "../store/themeStore";

export interface ThemeApi {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  nextTheme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => ThemeMode;
}

/**
 * Resolves the selected theme, tracks OS preference changes, and applies html.dark.
 */
export function useTheme(): ThemeApi {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const cycleTheme = useThemeStore((state) => state.cycleTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => resolveTheme("system"));
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event?: MediaQueryListEvent) => {
      setSystemTheme(event?.matches ?? mediaQuery.matches ? "dark" : "light");
    };

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  return useMemo(
    () => ({
      theme,
      resolvedTheme,
      nextTheme: getNextTheme(theme),
      isDark: resolvedTheme === "dark",
      setTheme,
      cycleTheme,
    }),
    [cycleTheme, resolvedTheme, setTheme, theme],
  );
}
