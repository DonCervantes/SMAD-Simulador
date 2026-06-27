"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { BudgetRow } from "@/lib/physics/delta-v-budget";

export interface WaterfallChartProps {
  rows: BudgetRow[];
  cumulativeBefore: number[];
  height?: number;
}

const CATEGORY_COLOR: Record<NonNullable<BudgetRow["category"]>, string> = {
  ascent: "#ff9d52",
  transfer: "#5cf0ff",
  "plane-change": "#b9a4ff",
  "station-keeping": "#7af0a4",
  disposal: "#8a98ac",
  margin: "#ffb547",
};

const DEFAULT_COLOR = "#5cf0ff";

interface ChartDatum {
  name: string;
  base: number;
  value: number;
  total: number;
  color: string;
  note: string;
}

export function WaterfallChart({
  rows,
  cumulativeBefore,
  height = 320,
}: WaterfallChartProps) {
  const data: ChartDatum[] = rows.map((r, i) => ({
    name: r.label,
    base: cumulativeBefore[i],
    value: r.dv_m_s,
    total: cumulativeBefore[i] + r.dv_m_s,
    color: r.category ? CATEGORY_COLOR[r.category] : DEFAULT_COLOR,
    note: r.note ?? "",
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, left: 12, bottom: 64 }}
        >
          <CartesianGrid
            stroke="#233247"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="#8a98ac"
            tick={{ fontSize: 10, fill: "#8a98ac" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#8a98ac"
            tick={{ fontSize: 10, fill: "#8a98ac" }}
            label={{
              value: "Δv (m/s)",
              angle: -90,
              position: "insideLeft",
              fill: "#8a98ac",
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#131c28",
              border: "1px solid #233247",
              borderRadius: 4,
              fontSize: 12,
              color: "#e6edf5",
            }}
            formatter={(value, key) => {
              if (key === "base") return ["", ""] as [string, string];
              const v = typeof value === "number" ? value : Number(value);
              return [`${v.toFixed(1)} m/s`, "Δv"] as [string, string];
            }}
            labelStyle={{ color: "#5cf0ff" }}
          />
          {/* Invisible spacer = cumulative total before this row */}
          <Bar dataKey="base" stackId="a" fill="transparent" />
          {/* Actual contribution */}
          <Bar dataKey="value" stackId="a">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
