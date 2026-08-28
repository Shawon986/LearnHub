"use client";

import { useId, useRef, useState } from "react";
import type { DailyPoint } from "@/lib/analytics";

// SVG charts following the dataviz method (docs/analytics):
// thin marks, recessive grid, hover crosshair + tooltips, direct labels,
// validated categorical palette via CSS vars (--viz-series-N).


/* ---------------- Area / line (single series, change over time) ---------------- */

export function AreaChart({
  data,
  money = false,
  height = 220,
}: {
  data: DailyPoint[];
  money?: boolean;
  height?: number;
}) {
  const fmt = (n: number) => (money ? `৳${n.toLocaleString()}` : n.toLocaleString());
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 640;
  const H = height;
  const PAD = { l: 44, r: 12, t: 12, b: 26 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = Math.max(...data.map((d) => d.value), 1);

  const x = (i: number) => PAD.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
  const areaPath = `${linePath} L${x(data.length - 1)},${PAD.t + innerH} L${PAD.l},${PAD.t + innerH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Time series chart"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = ref.current?.getBoundingClientRect();
          if (!rect) return;
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((px - PAD.l) / innerW) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, idx)));
        }}
      >
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-series-1)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--viz-series-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid + labels */}
        {gridLines.map((g) => {
          const gy = PAD.t + innerH * g;
          const value = Math.round(max * (1 - g));
          return (
            <g key={g}>
              <line x1={PAD.l} y1={gy} x2={W - PAD.r} y2={gy} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={PAD.l - 6} y={gy + 3.5} textAnchor="end" fontSize={10} fill="var(--viz-label)">
                {fmt(value)}
              </text>
            </g>
          );
        })}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={W - PAD.r} y2={PAD.t + innerH} stroke="var(--viz-grid)" strokeWidth={1} />

        {data.length > 14
          ? data.map((d, i) =>
              i % Math.ceil(data.length / 7) === 0 ? (
                <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--viz-label)">
                  {d.label}
                </text>
              ) : null,
            )
          : data.map((d, i) => (
              <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--viz-label)">
                {d.label}
              </text>
            ))}

        <path d={areaPath} fill={`url(#grad-${id})`} />
        <path d={linePath} fill="none" stroke="var(--viz-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Endpoint dot */}
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].value)} r={3.5} fill="var(--viz-series-1)" stroke="var(--card)" strokeWidth={2} />

        {/* Hover crosshair */}
        {hover !== null && (
          <g>
            <line x1={x(hover)} y1={PAD.t} x2={x(hover)} y2={PAD.t + innerH} stroke="var(--viz-label)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill="var(--viz-series-1)" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-bold text-background shadow-lift"
          style={{ left: `${(x(hover) / W) * 100}%`, top: Math.max(0, (y(data[hover].value) / H) * 100 - 40) }}
        >
          {data[hover].label}: {fmt(data[hover].value)}
        </div>
      )}
    </div>
  );
}

/* ---------------- Vertical bars (magnitude over time) ---------------- */

export function BarChart({
  data,
  money = false,
  height = 200,
}: {
  data: DailyPoint[];
  money?: boolean;
  height?: number;
}) {
  const fmt = (n: number) => (money ? `৳${n.toLocaleString()}` : n.toLocaleString());
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const PAD = { l: 8, r: 8, t: 12, b: 26 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = Math.max(...data.map((d) => d.value), 1);
  const band = innerW / data.length;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart" onMouseLeave={() => setHover(null)}>
        <line x1={PAD.l} y1={PAD.t + innerH} x2={W - PAD.r} y2={PAD.t + innerH} stroke="var(--viz-grid)" strokeWidth={1} />
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const bx = PAD.l + i * band + band * 0.18;
          const bw = band * 0.64;
          const active = hover === i;
          return (
            <g key={d.date}>
              <rect
                x={bx}
                y={PAD.t + innerH - h}
                width={bw}
                height={h}
                rx={4}
                fill="var(--viz-series-1)"
                opacity={active ? 1 : 0.82}
                onMouseEnter={() => setHover(i)}
              />
              {data.length <= 14 && (
                <text x={bx + bw / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--viz-label)">
                  {d.label.split(" ")[0]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute z-10 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-bold text-background shadow-lift"
          style={{
            left: `${((PAD.l + hover * band + band / 2) / W) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          {data[hover].label}: {fmt(data[hover].value)}
        </div>
      )}
    </div>
  );
}

/* ---------------- Horizontal magnitude bars (ranked lists) ---------------- */

export function HBarList({
  rows,
  money = false,
}: {
  rows: { label: string; value: number; sub?: string }[];
  money?: boolean;
}) {
  const fmt = (n: number) => (money ? `৳${n.toLocaleString()}` : n.toLocaleString());
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-[12px] font-bold text-foreground">
              <span className="mr-1.5 text-faint-fg">{i + 1}.</span>
              {r.label}
            </p>
            <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-foreground">{fmt(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-card-2">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(r.value / max) * 100}%`, backgroundColor: "var(--viz-series-1)" }}
            />
          </div>
          {r.sub && <p className="text-[10px] text-faint-fg">{r.sub}</p>}
        </li>
      ))}
      {rows.length === 0 && <p className="py-4 text-center text-[12px] text-faint-fg">No data in this window.</p>}
    </ul>
  );
}

/* ---------------- Donut (categorical identity) ---------------- */

export function DonutChart({
  rows,
  money = false,
}: {
  rows: { label: string; value: number }[];
  money?: boolean;
}) {
  const fmt = (n: number) => (money ? `৳${n.toLocaleString()}` : n.toLocaleString());
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const R = 60;
  const C = 2 * Math.PI * R;
  const SERIES = ["var(--viz-series-1)", "var(--viz-series-2)", "var(--viz-series-3)", "var(--viz-series-4)", "var(--viz-series-5)", "var(--viz-series-6)"];
  const GAP = 2; // px surface gap between segments

  const segments = rows.map((r, i) => {
    const frac = total > 0 ? r.value / total : 0;
    const offset = rows.slice(0, i).reduce((sum, prev) => sum + (total > 0 ? prev.value / total : 0), 0);
    return {
      ...r,
      color: SERIES[i % SERIES.length],
      dash: Math.max(0, frac * C - GAP),
      offset: offset * C,
      frac,
    };
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" role="img" aria-label="Donut chart">
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={80}
              cy={80}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={20}
              strokeDasharray={`${s.dash} ${C - s.dash}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-xl font-extrabold text-foreground">{fmt(total)}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-faint-fg">total</p>
        </div>
      </div>
      {/* Legend with direct values — identity is never color-alone. */}
      <ul className="min-w-40 space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
            <span className="flex-1 font-semibold text-foreground">{s.label}</span>
            <span className="font-extrabold tabular-nums text-foreground">
              {fmt(s.value)}
              <span className="ml-1 font-semibold text-faint-fg">({Math.round(s.frac * 100)}%)</span>
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-[12px] text-faint-fg">No data in this window.</li>}
      </ul>
    </div>
  );
}
