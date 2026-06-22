import { Menu, Search } from "lucide-react";
import { useCommandPaletteStore } from "../../store/commandPaletteStore";
import { NotificationBell } from "./NotificationBell";
import { ThemeCycleButton } from "./ThemeCycleButton";

interface TopBarProps {
  onMenu: () => void;
}

export function TopBar({ onMenu }: TopBarProps) {
  const openPalette = useCommandPaletteStore((state) => state.openPalette);

  return (
    <header className="sticky top-4 z-30 mb-6 flex min-h-16 items-center gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/68 px-3 shadow-2xl shadow-black/10 backdrop-blur-2xl lg:px-4">
      <button
        className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--border)] text-[var(--text-secondary)] md:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>
      <button
        type="button"
        className="hidden min-h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.045] px-3 text-left transition hover:border-[var(--border-active)] hover:bg-white/[0.07] md:flex"
        onClick={openPalette}
      >
        <Search size={18} className="text-[var(--text-muted)]" />
        <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-muted)]">Search commands, articles, topics, pipeline runs...</span>
        <kbd className="rounded-lg border border-[var(--border)] bg-white/[0.04] px-2 py-1 font-mono text-[11px] font-bold text-[var(--text-muted)]">
          ⌘ K
        </kbd>
      </button>
      <ThemeCycleButton />
      <NotificationBell />
    </header>
  );
}
