import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/72 shadow-2xl shadow-black/20 backdrop-blur-2xl",
        className,
      )}
      whileHover={{ y: -3, borderColor: "var(--border-active)" }}
      transition={{ duration: 0.18 }}
      {...props}
    />
  );
}
