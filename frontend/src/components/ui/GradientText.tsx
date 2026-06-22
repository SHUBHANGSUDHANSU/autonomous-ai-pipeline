import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function GradientText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "bg-[linear-gradient(135deg,#f0f0ff,#6c63ff,#00d4aa)] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
