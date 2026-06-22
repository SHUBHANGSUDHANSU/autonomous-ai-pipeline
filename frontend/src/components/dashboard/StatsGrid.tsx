import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, BarChart3, FileText, Gauge, Send } from "lucide-react";
import { useEffect } from "react";
import { Card } from "../ui/Card";
import { staggerContainer, staggerItem } from "../layout/PageWrapper";

const icons = [FileText, Send, Gauge, BarChart3];

interface Stat {
  label: string;
  value: number;
  suffix?: string;
  change: string;
  positive: boolean;
}

export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <motion.div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {stats.map((stat, index) => {
        const Icon = icons[index] || FileText;
        return (
          <motion.div key={stat.label} variants={staggerItem}>
            <Card className="p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06] text-[var(--accent-secondary)]">
                  <Icon size={20} />
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold ${
                    stat.positive ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]"
                  }`}
                >
                  {stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </span>
              </div>
              <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{stat.label}</p>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => `${latest.toFixed(suffix ? 1 : 0)}${suffix}`);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [motionValue, value]);

  return <motion.strong className="font-display text-4xl font-extrabold text-[var(--text-primary)]">{rounded}</motion.strong>;
}
