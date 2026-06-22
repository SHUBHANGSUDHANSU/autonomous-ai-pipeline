import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils";
import type { ThemeMode } from "../../store/themeStore";

const themeOptions: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * Three-way theme selector with a sliding active pill.
 */
export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border)] bg-white/[0.04] p-1"
      role="radiogroup"
      aria-label="Theme preference"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={cn(
              "relative isolate flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition",
              active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
            onClick={() => setTheme(option.value)}
          >
            {active ? (
              <motion.span
                layoutId="theme-segment-active-pill"
                className="absolute inset-0 -z-10 rounded-xl border border-[var(--border-active)] bg-[var(--accent-glow)] shadow-[0_0_24px_var(--accent-glow)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon size={17} />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
