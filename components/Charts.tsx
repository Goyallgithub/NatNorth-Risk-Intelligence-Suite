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

const CYAN = "#5EF2FF";
const RED = "#FF4D5E";
const MUTED = "rgba(255,255,255,0.35)";
const GRID = "rgba(255,255,255,0.08)";

const tipStyle = {
  background: "#12061f",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 0,
  fontSize: 11,
  color: "#fff",
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
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis type="number" dataKey="x" domain={[0, 1]} tick={{ fill: MUTED, fontSize: 10 }} />
          <YAxis type="number" domain={[0, 1]} tick={{ fill: MUTED, fontSize: 10 }} />
          <Tooltip contentStyle={tipStyle} formatter={tipFmt} />
          <Line
            data={[
              { x: 0, y: 0 },
              { x: 1, y: 1 },
            ]}
            type="linear"
            dataKey="y"
            stroke={MUTED}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
          {curves.map((c, i) => (
            <Line
              key={c.name}
              data={c.data}
              type="monotone"
              dataKey="y"
              name={c.name}
              stroke={c.color ?? (i === 0 ? CYAN : RED)}
              dot={false}
              strokeWidth={2}
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
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis type="number" dataKey="x" domain={[0, 1]} tick={{ fill: MUTED, fontSize: 10 }} />
          <YAxis type="number" domain={[0, 1]} tick={{ fill: MUTED, fontSize: 10 }} />
          <Tooltip contentStyle={tipStyle} formatter={tipFmt} />
          {curves.map((c, i) => (
            <Line
              key={c.name}
              data={c.data}
              type="monotone"
              dataKey="y"
              name={c.name}
              stroke={c.color ?? (i === 0 ? CYAN : RED)}
              dot={false}
              strokeWidth={2}
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
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ left: 4, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={120}
            tick={{ fill: MUTED, fontSize: 9 }}
            tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 14) + "…" : v)}
          />
          <Tooltip contentStyle={tipStyle} />
          <Bar dataKey={valueKey}>
            {sorted.map((row, i) => (
              <Cell key={i} fill={Number(row[valueKey]) >= 0 ? CYAN : RED} />
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
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis
            dataKey="category"
            angle={-35}
            textAnchor="end"
            interval={0}
            tick={{ fill: MUTED, fontSize: 9 }}
            height={55}
          />
          <YAxis domain={[0, 1]} tick={{ fill: MUTED, fontSize: 10 }} />
          <Tooltip contentStyle={tipStyle} />
          <Bar dataKey="lr_f1" name="LR" fill={CYAN} />
          <Bar dataKey="rf_f1" name="RF" fill="#9B6BB8" />
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
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 10 }} />
          <Tooltip contentStyle={tipStyle} />
          <ReferenceLine y={threshold} stroke={RED} strokeDasharray="6 4" />
          {crossedMonth != null && (
            <ReferenceLine x={crossedMonth} stroke={RED} strokeOpacity={0.45} />
          )}
          <Line
            type="monotone"
            dataKey="distress_score_lr"
            name="LR"
            stroke={CYAN}
            strokeWidth={2.2}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="distress_score_rf"
            name="RF"
            stroke="#9B6BB8"
            strokeWidth={1.8}
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
  const max = Math.max(...matrix.flat(), 1);
  const n = labels.length;
  const short = (s: string) => (s.length > 10 ? s.slice(0, 8) + "…" : s);

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `64px repeat(${n}, minmax(32px, 1fr))` }}
      >
        <div />
        {labels.map((l) => (
          <div key={`h-${l}`} className="px-0.5 pb-1 text-center text-[8px] text-white/45" title={l}>
            {short(l)}
          </div>
        ))}
        {matrix.map((row, i) => (
          <div key={`row-${labels[i]}`} className="contents">
            <div className="flex items-center pr-1 text-right text-[8px] text-white/45" title={labels[i]}>
              {short(labels[i])}
            </div>
            {row.map((v, j) => {
              const intensity = v / max;
              return (
                <div
                  key={`${i}-${j}`}
                  className="flex h-8 min-w-[32px] items-center justify-center text-[10px] font-semibold tabular-nums"
                  style={{
                    background:
                      n === 2
                        ? i === j
                          ? `rgba(94,242,255,${0.12 + intensity * 0.7})`
                          : `rgba(255,77,94,${0.08 + intensity * 0.55})`
                        : `rgba(94,242,255,${0.08 + intensity * 0.75})`,
                    color: intensity > 0.5 ? "#12061f" : "#fff",
                    border: "1px solid rgba(255,255,255,0.08)",
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
      <p className="mt-2 text-[10px] uppercase tracking-wider text-white/40">
        Rows = true · Columns = predicted
      </p>
    </div>
  );
}
