import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsChartPoint } from "../../types";
import { Card } from "../ui/Card";

export function ContentChart({ data }: { data: AnalyticsChartPoint[] }) {
  return (
    <Card className="p-5">
      <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Articles Generated</h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">Last 30 days from PostgreSQL records</p>
      <div className="h-80">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="articles" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#6c63ff" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#6c63ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ffffff10" />
              <XAxis dataKey="label" stroke="#8888aa" tick={{ fontSize: 12 }} />
              <YAxis stroke="#8888aa" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#16161f", border: "1px solid #ffffff20", borderRadius: 14, color: "#f0f0ff" }} />
              <Area type="monotone" dataKey="articles" stroke="#6c63ff" fill="url(#articles)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)]">
            No generated content yet.
          </div>
        )}
      </div>
    </Card>
  );
}
