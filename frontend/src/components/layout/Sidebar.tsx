import { useCallback, useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, BarChart3, FileText, Home, Settings, Zap, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { usePipelineStore } from "../../store/pipelineStore";
import { Tooltip } from "../ui/Tooltip";
import { cn } from "../../lib/utils";

const nexusIcon = `${import.meta.env.BASE_URL}brand/nexus-icon.svg`;
const nexusLogoAnimated = `${import.meta.env.BASE_URL}brand/nexus-logo-animated.svg`;
const SIDEBAR_WIDTH_KEY = "nexus-sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 380;

const navItems = [
  { label: "Dashboard", icon: Home, to: "/" },
  { label: "Pipeline", icon: Zap, to: "/pipeline" },
  { label: "Content", icon: FileText, to: "/content" },
  { label: "Analytics", icon: BarChart3, to: "/analytics" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  connected: boolean;
}

export function Sidebar({ open, onClose, connected }: SidebarProps) {
  const [desktopWidth, setDesktopWidth] = useState(readInitialSidebarWidth);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", `${desktopWidth}px`);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(desktopWidth));
    } catch {
      // Ignore storage failures, for example in restricted browser contexts.
    }
  }, [desktopWidth]);

  const startResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    document.body.classList.add("cursor-col-resize", "select-none");

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setDesktopWidth(clampSidebarWidth(moveEvent.clientX));
    };

    const handlePointerUp = () => {
      document.body.classList.remove("cursor-col-resize", "select-none");
      window.removeEventListener("pointermove", handlePointerMove);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }, []);

  const resetSidebarWidth = useCallback(() => {
    setDesktopWidth(DEFAULT_SIDEBAR_WIDTH);
  }, []);

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden h-screen shrink-0 border-r border-[var(--border)] bg-[var(--bg-card)]/58 p-4 shadow-2xl shadow-black/10 backdrop-blur-2xl lg:block"
        style={{ width: desktopWidth }}
      >
        <SidebarContent connected={connected} />
        <div
          role="separator"
          aria-label="Resize sidebar"
          aria-orientation="vertical"
          title="Drag to resize. Double-click to reset."
          className="group absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none bg-transparent transition hover:bg-[var(--accent-glow)]"
          onPointerDown={startResize}
          onDoubleClick={resetSidebarWidth}
        >
          <span className="absolute right-0 top-1/2 h-16 w-px -translate-y-1/2 rounded-full bg-white/15 opacity-0 transition group-hover:opacity-100" />
        </div>
      </aside>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[86px] border-r border-[var(--border)] bg-[var(--bg-card)]/58 p-3 shadow-2xl shadow-black/10 backdrop-blur-2xl md:block lg:hidden">
        <SidebarCompact connected={connected} />
      </aside>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.aside
              className="h-full w-72 border-r border-[var(--border)] bg-[var(--bg-card)]/90 p-4 backdrop-blur-2xl"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
            >
              <button
                className="mb-4 ml-auto grid h-10 w-10 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-white/5"
                onClick={onClose}
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
              <SidebarContent connected={connected} onNavigate={onClose} />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function readInitialSidebarWidth(): number {
  try {
    const savedWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(savedWidth) ? clampSidebarWidth(savedWidth) : DEFAULT_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

function clampSidebarWidth(width: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

function SidebarCompact({ connected }: { connected: boolean }) {
  const isRunning = usePipelineStore((state) => state.isRunning);

  return (
    <div className="flex h-full flex-col items-center">
      <img
        src={nexusIcon}
        alt="Nexus AI Pipeline"
        className="mb-8 h-12 w-12 rounded-2xl object-contain shadow-glow"
      />

      <nav className="flex flex-col gap-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.to} label={item.label}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative grid h-12 w-12 place-items-center rounded-2xl border border-transparent text-[var(--text-secondary)] transition hover:border-[var(--border)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]",
                    isActive && "border-[var(--border-active)] bg-white/[0.07] text-[var(--text-primary)]",
                  )
                }
                aria-label={item.label}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        "absolute left-0 top-2 h-8 w-1 rounded-full bg-[linear-gradient(180deg,#6c63ff,#00d4aa)] opacity-0 transition",
                        isActive && "opacity-100",
                      )}
                    />
                    <Icon size={19} />
                    {item.to === "/pipeline" && isRunning ? (
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent-success)]" />
                    ) : null}
                  </>
                )}
              </NavLink>
            </Tooltip>
          );
        })}
      </nav>

      <div className="mt-auto grid place-items-center gap-3">
        <Tooltip label={connected ? "Connected" : "Disconnected"}>
          <span className={cn("block h-3 w-3 rounded-full", connected ? "bg-[var(--accent-success)]" : "bg-[var(--accent-danger)]")} />
        </Tooltip>
        <p className="font-mono text-[10px] text-[var(--text-muted)]">v1</p>
      </div>
    </div>
  );
}

function SidebarContent({ connected, onNavigate }: { connected: boolean; onNavigate?: () => void }) {
  const isRunning = usePipelineStore((state) => state.isRunning);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 px-1">
        <img
          src={nexusLogoAnimated}
          alt="Nexus AI Pipeline"
          className="h-auto w-full rounded-2xl object-contain shadow-glow"
        />
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "group relative flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-white/[0.04] hover:text-[var(--text-primary)]",
                  isActive && "bg-white/[0.06] text-[var(--text-primary)]",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute left-0 top-2 h-8 w-1 rounded-full bg-[linear-gradient(180deg,#6c63ff,#00d4aa)] opacity-0 transition",
                      isActive && "opacity-100",
                    )}
                  />
                  <Icon size={19} />
                  <span>{item.label}</span>
                  {item.to === "/pipeline" && isRunning ? (
                    <span className="ml-auto h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent-success)]" />
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <Activity size={16} />
          API Status
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className={cn("h-2.5 w-2.5 rounded-full", connected ? "bg-[var(--accent-success)]" : "bg-[var(--accent-danger)]")} />
          {connected ? "Connected" : "Disconnected"}
        </div>
        <p className="mt-4 font-mono text-xs text-[var(--text-muted)]">v1.0.0</p>
      </div>
    </div>
  );
}
