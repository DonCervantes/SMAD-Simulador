"use client";

import { Fragment } from "react";

export interface GanttPhase {
  label: string;
  durationYears: number;
  color: string;
}

export interface MissionGanttProps {
  phases: GanttPhase[];
  /** Optional vertical marker between phases (e.g. "Launch"). Position is the
   *  index of the phase BEFORE which the marker is drawn. */
  markers?: { label: string; afterIndex: number; color: string }[];
}

/**
 * Simple SVG Gantt for mission lifecycle phases. Each phase occupies a
 * fraction of total width proportional to its duration. Renders a horizontal
 * timeline with phase labels, year tick marks, and optional event markers
 * (e.g. Launch).
 */
export function MissionGantt({ phases, markers = [] }: MissionGanttProps) {
  const total = phases.reduce((s, p) => s + p.durationYears, 0);
  if (total <= 0) return null;

  const WIDTH = 720;
  const HEIGHT = 110;
  const PAD_L = 8;
  const PAD_R = 8;
  const TRACK_Y = 40;
  const TRACK_H = 28;
  const trackW = WIDTH - PAD_L - PAD_R;

  // Build cumulative positions
  let cum = 0;
  const segments = phases.map((p) => {
    const x = PAD_L + (cum / total) * trackW;
    const w = (p.durationYears / total) * trackW;
    cum += p.durationYears;
    return { phase: p, x, w };
  });

  // Year ticks every ~1 year if total < 15 else every 2y, etc.
  const tickStep = total <= 15 ? 1 : total <= 30 ? 2 : 5;
  const ticks: number[] = [];
  for (let t = 0; t <= total + 1e-6; t += tickStep) ticks.push(t);

  return (
    <div className="w-full overflow-hidden rounded border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label="Mission Gantt"
      >
        {/* Phase bars */}
        {segments.map((s, i) => (
          <Fragment key={i}>
            <rect
              x={s.x}
              y={TRACK_Y}
              width={Math.max(0, s.w - 1)}
              height={TRACK_H}
              fill={s.phase.color}
              opacity={0.85}
              rx={2}
            />
            <text
              x={s.x + s.w / 2}
              y={TRACK_Y + TRACK_H / 2 + 4}
              fill="#08111c"
              fontSize={10}
              fontWeight="600"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              {s.phase.label}
            </text>
            <text
              x={s.x + s.w / 2}
              y={TRACK_Y - 6}
              fill="#8a98ac"
              fontSize={9}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              {s.phase.durationYears.toFixed(1)} y
            </text>
          </Fragment>
        ))}

        {/* Event markers (Launch, etc.) */}
        {markers.map((m, i) => {
          const targetCum = phases
            .slice(0, m.afterIndex)
            .reduce((s, p) => s + p.durationYears, 0);
          const x = PAD_L + (targetCum / total) * trackW;
          return (
            <Fragment key={`m-${i}`}>
              <line
                x1={x}
                y1={TRACK_Y - 8}
                x2={x}
                y2={TRACK_Y + TRACK_H + 8}
                stroke={m.color}
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <text
                x={x + 4}
                y={TRACK_Y - 12}
                fill={m.color}
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {m.label}
              </text>
            </Fragment>
          );
        })}

        {/* Year ticks */}
        {ticks.map((t) => {
          const x = PAD_L + (t / total) * trackW;
          return (
            <Fragment key={`tk-${t}`}>
              <line
                x1={x}
                y1={TRACK_Y + TRACK_H + 2}
                x2={x}
                y2={TRACK_Y + TRACK_H + 6}
                stroke="#5d6a7e"
                strokeWidth={1}
              />
              <text
                x={x}
                y={TRACK_Y + TRACK_H + 18}
                fill="#5d6a7e"
                fontSize={9}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                {t.toFixed(0)} y
              </text>
            </Fragment>
          );
        })}
      </svg>
    </div>
  );
}
