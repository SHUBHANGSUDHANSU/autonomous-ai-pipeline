export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatScore(value: number | undefined): string {
  return Number.isFinite(value) ? Number(value).toFixed(1) : "-";
}

export function scoreColor(value: number): string {
  if (value >= 8.5) return "var(--accent-success)";
  if (value >= 7) return "var(--accent-warning)";
  return "var(--accent-danger)";
}
