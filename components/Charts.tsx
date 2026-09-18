"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PURPLE = "#5A287D";
const CORAL = "#E4002B";
const MUTED = "#9CA3AF";

const tipStyle = {
  background: "#fff",
  border: "1px solid #E8E4EC",
  borderRadius: 12,
  fontSize: 12,
};

function tipFmt(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : String(v ?? "");
}

export function RocChart({
  curves,
}: {
  curves: { name: string; data: { x: number; y: number }[]; color?: string }[];
}) {
  const diagonal = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE8F2" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(1)}
            label={{ value: "FPR", position: "insideBottom", offset: -2, fontSize: 11 }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(1)}
            label={{ value: "TPR", angle: -90, position: "insideLeft", fontSize: 11 }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip contentStyle={tipStyle} formatter={tipFmt} />
          <Line
            data={diagonal}
            type="linear"
            dataKey="y"
            name="Chance"
            stroke={MUTED}
            strokeDasharray="4 4"
            dot={false}
            legendType="none"
            isAnimationActive={false}
          />
          {curves.map((c, i) => (
            <Line
              key={c.name}
              data={c.data}
              type="monotone"
              dataKey="y"
              name={c.name}
              stroke={c.color ?? (i === 0 ? PURPLE : CORAL)}
              dot={false}
              strokeWidth={2.2}
              isAnimationActive
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PrChart({
  curves,
}: {
  curves: { name: string; data: { x: number; y: number }[]; color?: string }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE8F2" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(1)}
            label={{ value: "Recall", position: "insideBottom", offset: -2, fontSize: 11 }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(1)}
            label={{ value: "Precision", angle: -90, position: "insideLeft", fontSize: 11 }}
            tick={{ fontSize: 11 }}
          />
          <Tooltip contentStyle={tipStyle} formatter={tipFmt} />
          {curves.map((c, i) => (
            <Line
              key={c.name}
              data={c.data}
              type="monotone"
              dataKey="y"
              name={c.name}
              stroke={c.color ?? (i === 0 ? PURPLE : CORAL)}
              dot={false}
              strokeWidth={2.2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ImportanceBar({
  data,
  valueKey = "importance",
  nameKey = "feature",
}: {
  data: Record<string, string | number>[];
  valueKey?: string;
  nameKey?: string;
}) {
  const sorted = [...data].sort(
    (a, b) => Math.abs(Number(b[valueKey])) - Math.abs(Number(a[valueKey]))
  );
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE8F2" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={130}
            tick={{ fontSize: 10 }}
            tickFormatter={(v: string) =>
              v.length > 18 ? v.slice(0, 16) + "…" : v
            }
          />
          <Tooltip contentStyle={tipStyle} />
          <Bar dataKey={valueKey} radius={[0, 6, 6, 0]}>
            {sorted.map((row, i) => (
              <Cell
                key={i}
                fill={Number(row[valueKey]) >= 0 ? PURPLE : CORAL}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function F1BarChart({
  data,
}: {
  data: { category: string; lr_f1: number; rf_f1: number }[];
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE8F2" />
          <XAxis
            dataKey="category"
            angle={-35}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 10 }}
            height={60}
          />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={tipStyle} />
          <Bar dataKey="lr_f1" name="Logistic Regression" fill={PURPLE} radius={[4, 4, 0, 0]} />
          <Bar dataKey="rf_f1" name="Random Forest" fill="#7B4A9E" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrajectoryChart({
  data,
  threshold,
  crossedMonth,
}: {
  data: { month: number; distress_score_lr: number; distress_score_rf: number }[];
  threshold: number;
  crossedMonth: number | null;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDE8F2" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            label={{ value: "Month", position: "insideBottom", offset: -2, fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            label={{ value: "Distress score", angle: -90, position: "insideLeft", fontSize: 11 }}
          />
          <Tooltip contentStyle={tipStyle} />
          <ReferenceLine
            y={threshold}
            stroke={CORAL}
            strokeDasharray="6 4"
            label={{ value: `High risk (${threshold})`, fill: CORAL, fontSize: 11 }}
          />
          {crossedMonth != null && (
            <ReferenceLine
              x={crossedMonth}
              stroke={CORAL}
              strokeOpacity={0.45}
              label={{ value: "Crossed", fill: CORAL, fontSize: 10, position: "top" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="distress_score_lr"
            name="LR score"
            stroke={PURPLE}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="distress_score_rf"
            name="RF score"
            stroke="#9B6BB8"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConfusionHeatmap({
  matrix,
  labels,
}: {
  matrix: number[][];
  labels: string[];
}) {
  const flat = matrix.flat();
  const max = Math.max(...flat, 1);
  const n = labels.length;
  const short = (s: string) => (s.length > 10 ? s.slice(0, 8) + "…" : s);

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-0.5"
        style={{
          gridTemplateColumns: `72px repeat(${n}, minmax(36px, 1fr))`,
        }}
      >
        <div />
        {labels.map((l) => (
          <div
            key={`h-${l}`}
            className="px-0.5 pb-1 text-center text-[9px] font-medium text-natnorth-muted"
            title={l}
          >
            {short(l)}
          </div>
        ))}
        {matrix.map((row, i) => (
          <div key={`row-${labels[i]}`} className="contents">
            <div
              className="flex items-center pr-1 text-right text-[9px] font-medium text-natnorth-muted"
              title={labels[i]}
            >
              {short(labels[i])}
            </div>
            {row.map((v, j) => {
              const intensity = v / max;
              const bg =
                n === 2
                  ? i === j
                    ? `rgba(90,40,125,${0.15 + intensity * 0.75})`
                    : `rgba(228,0,43,${0.08 + intensity * 0.55})`
                  : `rgba(90,40,125,${0.08 + intensity * 0.85})`;
              return (
                <div
                  key={`${i}-${j}`}
                  className="flex h-9 min-w-[36px] items-center justify-center rounded text-[10px] font-semibold tabular-nums"
                  style={{
                    background: bg,
                    color: intensity > 0.55 ? "#fff" : "#1a1a1a",
                  }}
                  title={`${labels[i]} → ${labels[j]}: ${v}`}
                >
                  {v}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-natnorth-muted">
        Rows = true label · Columns = predicted · Darker = higher count
      </p>
    </div>
  );
}
