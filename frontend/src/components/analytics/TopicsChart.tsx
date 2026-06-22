import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsTopic } from "../../types";
import { Card } from "../ui/Card";

export function TopicsChart({ data }: { data: AnalyticsTopic[] }) {
  return (
    <Card className="p-5">
      <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Top Topics</h2>
      <div className="h-72">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis dataKey="topic" stroke="#8888aa" tick={{ fontSize: 11 }} />
              <YAxis stroke="#8888aa" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#16161f", border: "1px solid #ffffff20", borderRadius: 14, color: "#f0f0ff" }} />
              <Bar dataKey="count" fill="#6c63ff" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)]">
            No topics yet.
          </div>
        )}
      </div>
    </Card>
  );
}
