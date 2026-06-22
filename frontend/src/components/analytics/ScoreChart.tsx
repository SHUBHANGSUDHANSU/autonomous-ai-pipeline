import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AnalyticsScorePoint } from "../../types";
import { Card } from "../ui/Card";

export function ScoreChart({ data }: { data: AnalyticsScorePoint[] }) {
  return (
    <Card className="p-5">
      <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">Average Scores</h2>
      <div className="h-72">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke="#ffffff16" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#8888aa", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#16161f", border: "1px solid #ffffff20", borderRadius: 14, color: "#f0f0ff" }} />
              <Radar dataKey="value" fill="#00d4aa" fillOpacity={0.25} stroke="#00d4aa" strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)]">
            No quality scores yet.
          </div>
        )}
      </div>
    </Card>
  );
}
