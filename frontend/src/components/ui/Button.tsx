import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "ghost" | "danger" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "border-transparent bg-[linear-gradient(135deg,#6c63ff,#00d4aa)] text-white shadow-lg shadow-[var(--accent-glow)] hover:brightness-110",
  secondary:
    "border-[var(--border)] bg-white/5 text-[var(--text-primary)] hover:border-[var(--border-active)] hover:bg-white/10",
  ghost:
    "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
  danger:
    "border-red-400/20 bg-red-500/10 text-red-200 hover:border-red-400/40 hover:bg-red-500/15",
};

export function Button({ className, variant = "primary", children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
