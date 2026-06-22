import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import type { ThemeMode } from "../../store/themeStore";
import { Tooltip } from "../ui/Tooltip";

const icons: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
};

const labels: Record<ThemeMode, string> = {
  light: "Light",
  system: "System",
  dark: "Dark",
};

/**
 * Compact top-bar theme button that cycles Light -> System -> Dark.
 */
export function ThemeCycleButton() {
  const { theme, nextTheme, cycleTheme } = useTheme();
  const Icon = icons[theme];

  return (
    <Tooltip label={`Switch to ${labels[nextTheme]}`}>
      <button
        type="button"
        className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-white/[0.03] text-[var(--text-secondary)] transition hover:border-[var(--border-active)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
        onClick={cycleTheme}
        aria-label={`Current theme: ${labels[theme]}. Switch to ${labels[nextTheme]}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            className="grid h-5 w-5 place-items-center"
            initial={{ rotateY: -90, opacity: 0, scale: 0.82 }}
            animate={{ rotateY: 0, opacity: 1, scale: 1 }}
            exit={{ rotateY: 90, opacity: 0, scale: 0.82 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Icon size={19} />
          </motion.span>
        </AnimatePresence>
      </button>
    </Tooltip>
  );
}
