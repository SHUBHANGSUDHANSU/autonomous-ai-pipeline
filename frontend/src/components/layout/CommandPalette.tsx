import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Clipboard,
  FileSearch,
  FileText,
  Home,
  KeyRound,
  LucideIcon,
  Monitor,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockContent } from "../../api/mockData";
import { useTheme } from "../../hooks/useTheme";
import { useToast } from "../../hooks/useToast";
import { cn } from "../../lib/utils";
import { useCommandPaletteStore } from "../../store/commandPaletteStore";
import { useContentStore } from "../../store/contentStore";
import { usePipelineStore } from "../../store/pipelineStore";
import type { ThemeMode } from "../../store/themeStore";

type CommandCategory = "Navigation" | "Pipeline" | "Content" | "Utilities";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  category: CommandCategory;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void | Promise<void>;
}

interface ScoredCommand extends CommandItem {
  score: number;
}

const categoryOrder: CommandCategory[] = ["Navigation", "Pipeline", "Content", "Utilities"];
const themeIcons: Record<ThemeMode, LucideIcon> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
};
const themeLabels: Record<ThemeMode, string> = {
  light: "Light",
  system: "System",
  dark: "Dark",
};

/**
 * App-wide command palette with keyboard navigation and fuzzy filtering.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const { isOpen, query, setQuery, closePalette } = useCommandPaletteStore();
  const { clearLogs, resetAgents, setActiveRun, setRunning } = usePipelineStore();
  const { setSearch, setStatus, setSortMode } = useContentStore();
  const { theme, nextTheme, cycleTheme } = useTheme();
  const toast = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const latestArticle = [...mockContent].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )[0];

    const goTo = (path: string) => {
      closePalette();
      navigate(path);
    };

    return [
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        description: "Open the main overview with stats, quick run, and activity feed.",
        category: "Navigation",
        icon: Home,
        shortcut: "G D",
        action: () => goTo("/"),
      },
      {
        id: "nav-pipeline",
        label: "Go to Pipeline",
        description: "View the animated agent flow, live terminal, and past runs.",
        category: "Navigation",
        icon: Zap,
        shortcut: "G P",
        action: () => goTo("/pipeline"),
      },
      {
        id: "nav-content",
        label: "Go to Content Library",
        description: "Browse generated, scheduled, draft, and published articles.",
        category: "Navigation",
        icon: FileText,
        shortcut: "G C",
        action: () => goTo("/content"),
      },
      {
        id: "nav-analytics",
        label: "Go to Analytics",
        description: "Open article volume, score, and topic performance charts.",
        category: "Navigation",
        icon: BarChart3,
        shortcut: "G A",
        action: () => goTo("/analytics"),
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        description: "Configure API keys, schedule rules, and pipeline defaults.",
        category: "Navigation",
        icon: Settings,
        shortcut: "G S",
        action: () => goTo("/settings"),
      },
      {
        id: "pipeline-run-new",
        label: "Run a New Pipeline",
        description: "Open the launch modal to research, write, edit, and schedule a topic.",
        category: "Pipeline",
        icon: Sparkles,
        shortcut: "N",
        action: () => {
          closePalette();
          navigate("/pipeline?newRun=1");
          toast.info("New pipeline", "Choose a topic to launch the agent pipeline.", {
            persistToNotifications: false,
          });
        },
      },
      {
        id: "pipeline-clear-queue",
        label: "Clear Pipeline Queue",
        description: "Stop the current frontend run state and clear live pipeline logs.",
        category: "Pipeline",
        icon: Trash2,
        shortcut: "Shift C",
        action: () => {
          setRunning(false);
          setActiveRun(null, null);
          resetAgents();
          clearLogs();
          closePalette();
          toast.success("Pipeline queue cleared", "The local run state and live logs were reset.", {
            route: "/pipeline",
          });
        },
      },
      {
        id: "content-search",
        label: "Search Content",
        description: "Open the content library and search generated articles by topic or title.",
        category: "Content",
        icon: FileSearch,
        shortcut: "/",
        action: () => {
          setStatus("all");
          setSearch("");
          closePalette();
          navigate("/content");
          toast.info("Content search ready", "Search generated articles by topic, title, or excerpt.", {
            persistToNotifications: false,
          });
        },
      },
      {
        id: "content-scheduled",
        label: "Show Scheduled Articles",
        description: "Filter the content library to articles waiting for publication.",
        category: "Content",
        icon: Clipboard,
        shortcut: "S",
        action: () => {
          setStatus("scheduled");
          setSearch("");
          closePalette();
          navigate("/content");
        },
      },
      {
        id: "content-published",
        label: "Show Published Articles",
        description: "Filter the content library to articles already published.",
        category: "Content",
        icon: FileText,
        shortcut: "P",
        action: () => {
          setStatus("published");
          setSearch("");
          closePalette();
          navigate("/content");
        },
      },
      {
        id: "content-latest",
        label: "View Latest Article",
        description: "Open the newest generated article in reader mode.",
        category: "Content",
        icon: FileText,
        shortcut: "L",
        action: () => {
          if (!latestArticle) {
            toast.error("No articles available", "Generate content before opening the latest article.", {
              persistToNotifications: false,
            });
            return;
          }
          setSortMode("newest");
          closePalette();
          navigate(`/content/${latestArticle.id}`);
        },
      },
      {
        id: "utility-toggle-theme",
        label: "Cycle Theme",
        description: `Switch from ${themeLabels[theme]} to ${themeLabels[nextTheme]} mode.`,
        category: "Utilities",
        icon: themeIcons[nextTheme],
        shortcut: "T",
        action: () => {
          const selectedTheme = cycleTheme();
          closePalette();
          toast.success("Theme updated", `${themeLabels[selectedTheme]} mode enabled.`, {
            persistToNotifications: false,
          });
        },
      },
      {
        id: "utility-copy-api-key",
        label: "Copy API Key",
        description: "Copy the configured Groq API key reference without exposing secrets in source.",
        category: "Utilities",
        icon: KeyRound,
        shortcut: "⌘ Shift C",
        action: async () => {
          const storedKey = localStorage.getItem("nexus-groq-api-key") || "configured-in-env-file";
          await navigator.clipboard.writeText(storedKey);
          closePalette();
          toast.success("API key copied", "The configured API key reference was copied.", {
            persistToNotifications: false,
          });
        },
      },
    ];
  }, [
    clearLogs,
    closePalette,
    navigate,
    resetAgents,
    setActiveRun,
    cycleTheme,
    setRunning,
    setSearch,
    setSortMode,
    setStatus,
    nextTheme,
    theme,
    toast,
  ]);

  const filteredCommands = useMemo(() => filterCommands(commands, query), [commands, query]);
  const groupedCommands = useMemo(
    () =>
      categoryOrder
        .map((category) => ({
          category,
          commands: filteredCommands.filter((command) => command.category === category),
        }))
        .filter((group) => group.commands.length > 0),
    [filteredCommands],
  );
  const orderedCommands = useMemo(() => groupedCommands.flatMap((group) => group.commands), [groupedCommands]);
  const selectedCommand = orderedCommands[selectedIndex];

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);
  }, [isOpen, query]);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => (orderedCommands.length ? (index + 1) % orderedCommands.length : 0));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => (orderedCommands.length ? (index - 1 + orderedCommands.length) % orderedCommands.length : 0));
        return;
      }

      if (event.key === "Enter" && selectedCommand) {
        event.preventDefault();
        void runCommand(selectedCommand);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePalette, isOpen, orderedCommands.length, selectedCommand]);

  async function runCommand(command: CommandItem) {
    try {
      await command.action();
    } catch {
      toast.error("Command failed", "The selected command could not be completed.", {
        persistToNotifications: false,
      });
    } finally {
      closePalette();
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-black/55 px-4 pt-[10vh] backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePalette();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--border-active)] bg-[#0a0814]/95 shadow-2xl shadow-[#6c63ff]/15 ring-1 ring-white/5"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex min-h-16 items-center gap-3 border-b border-[var(--border)] px-4">
              <Search size={20} className="shrink-0 text-[var(--accent-secondary)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search commands, pages, articles, actions..."
                className="h-16 min-w-0 flex-1 bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="rounded-lg border border-[var(--border)] bg-white/[0.05] px-2 py-1 font-mono text-[11px] font-bold text-[var(--text-muted)]">
                ESC
              </kbd>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-2 py-3">
              {groupedCommands.length ? (
                groupedCommands.map((group) => (
                  <div key={group.category} className="py-1">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {group.category}
                    </p>
                    <div className="space-y-1">
                      {group.commands.map((command) => {
                        const flatIndex = orderedCommands.findIndex((item) => item.id === command.id);
                        const Icon = command.icon;
                        const isSelected = flatIndex === selectedIndex;

                        return (
                          <button
                            key={command.id}
                            type="button"
                            className={cn(
                              "group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border-l-2 px-3 py-3 text-left transition",
                              isSelected
                                ? "border-l-[#6c63ff] bg-white/[0.08] text-[var(--text-primary)]"
                                : "border-l-transparent text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]",
                            )}
                            onMouseEnter={() => setSelectedIndex(flatIndex)}
                            onClick={() => void runCommand(command)}
                          >
                            <span
                              className={cn(
                                "grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-white/[0.04]",
                                isSelected && "border-[#6c63ff]/40 bg-[#6c63ff]/15 text-[#00c9a7]",
                              )}
                            >
                              <Icon size={18} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold">{command.label}</span>
                              <span className="block truncate text-xs text-[var(--text-muted)]">{command.description}</span>
                            </span>
                            {command.shortcut ? (
                              <kbd className="rounded-lg border border-[var(--border)] bg-black/20 px-2 py-1 font-mono text-[10px] font-bold text-[var(--text-muted)]">
                                {command.shortcut}
                              </kbd>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid min-h-44 place-items-center px-6 text-center">
                  <div>
                    <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border)] bg-white/[0.04] text-[var(--text-muted)]">
                      <Search size={20} />
                    </div>
                    <p className="font-display text-lg font-bold text-[var(--text-primary)]">No commands found</p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">Try a page name, agent action, or content status.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
              <span>Nexus command center</span>
              <div className="flex flex-wrap items-center gap-2">
                <Hint keys="↑ ↓" label="Navigate" />
                <Hint keys="Enter" label="Select" />
                <Hint keys="Esc" label="Close" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="rounded-md border border-[var(--border)] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-bold">{keys}</kbd>
      {label}
    </span>
  );
}

function filterCommands(commands: CommandItem[], query: string): ScoredCommand[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return commands.map((command, index) => ({ ...command, score: commands.length - index }));
  }

  return commands
    .map((command) => ({
      ...command,
      score: fuzzyScore(normalizedQuery, `${command.label} ${command.description} ${command.category}`.toLowerCase()),
    }))
    .filter((command) => command.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

function fuzzyScore(query: string, target: string): number {
  if (target.includes(query)) {
    return 100 + query.length * 2;
  }

  let score = 0;
  let queryIndex = 0;
  let previousMatchIndex = -1;

  for (let targetIndex = 0; targetIndex < target.length && queryIndex < query.length; targetIndex += 1) {
    if (target[targetIndex] !== query[queryIndex]) continue;

    score += previousMatchIndex === targetIndex - 1 ? 8 : 3;
    previousMatchIndex = targetIndex;
    queryIndex += 1;
  }

  return queryIndex === query.length ? score - Math.max(0, target.length - query.length) * 0.02 : 0;
}
