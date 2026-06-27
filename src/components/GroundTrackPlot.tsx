"use client";

import { useMemo } from "react";
import type { GroundTrackPoint } from "@/lib/physics/ground-track";

export interface GroundTrackPlotProps {
  points: GroundTrackPoint[];
  /** Half-aperture of the coverage circle (Earth-central angle) in degrees. */
  swathCentralAngleDeg?: number;
  /** Index of the sample to mark as "current" (defaults to last). */
  highlightIndex?: number;
  width?: number;
  height?: number;
}

const VIEW_W = 720;
const VIEW_H = 360;

/** Equirectangular projection from (lat°, lon°) to SVG (x, y). */
function project(lat: number, lon: number): [number, number] {
  const x = ((lon + 180) / 360) * VIEW_W;
  const y = ((90 - lat) / 180) * VIEW_H;
  return [x, y];
}

/**
 * Split a track into segments at antimeridian crossings so a single <polyline>
 * does not draw a horizontal line across the entire map when longitude wraps.
 */
function splitAtAntimeridian(points: GroundTrackPoint[]): GroundTrackPoint[][] {
  if (points.length === 0) return [];
  const segments: GroundTrackPoint[][] = [[points[0]]];
  for (let i = 1; i < points.length; i++) {
    const dLon = points[i].lon_deg - points[i - 1].lon_deg;
    if (Math.abs(dLon) > 180) {
      segments.push([points[i]]);
    } else {
      segments[segments.length - 1].push(points[i]);
    }
  }
  return segments;
}

export function GroundTrackPlot({
  points,
  swathCentralAngleDeg,
  highlightIndex,
  width = VIEW_W,
  height = VIEW_H,
}: GroundTrackPlotProps) {
  const segments = useMemo(() => splitAtAntimeridian(points), [points]);
  const last = highlightIndex ?? points.length - 1;
  const current = points[last];
  const swathPx = swathCentralAngleDeg
    ? (swathCentralAngleDeg / 180) * VIEW_H
    : 0;

  return (
    <div className="w-full overflow-hidden rounded border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Ground track plot in equirectangular projection"
        className="w-full h-auto"
      >
        {/* Map background */}
        <rect width={VIEW_W} height={VIEW_H} fill="#08111c" />

        {/* Graticule: meridians every 30° */}
        {Array.from({ length: 11 }, (_, k) => -180 + (k + 1) * 30).map(
          (lon) => (
            <line
              key={`m-${lon}`}
              x1={((lon + 180) / 360) * VIEW_W}
              y1={0}
              x2={((lon + 180) / 360) * VIEW_W}
              y2={VIEW_H}
              stroke={lon === 0 ? "#2d4660" : "#1a2a3c"}
              strokeWidth={lon === 0 ? 1 : 0.5}
            />
          ),
        )}

        {/* Graticule: parallels every 30° */}
        {[-60, -30, 0, 30, 60].map((lat) => (
          <line
            key={`p-${lat}`}
            x1={0}
            y1={((90 - lat) / 180) * VIEW_H}
            x2={VIEW_W}
            y2={((90 - lat) / 180) * VIEW_H}
            stroke={lat === 0 ? "#2d4660" : "#1a2a3c"}
            strokeWidth={lat === 0 ? 1 : 0.5}
          />
        ))}

        {/* Lat/lon labels (sparse) */}
        {[60, 30, 0, -30, -60].map((lat) => (
          <text
            key={`pl-${lat}`}
            x={4}
            y={((90 - lat) / 180) * VIEW_H - 2}
            fill="#5d6a7e"
            fontSize={9}
            fontFamily="ui-monospace, monospace"
          >
            {lat}°
          </text>
        ))}

        {/* Ground track polylines, one per non-wrapped segment */}
        {segments.map((seg, idx) => {
          if (seg.length < 2) return null;
          const d = seg
            .map((p, k) => {
              const [x, y] = project(p.lat_deg, p.lon_deg);
              return `${k === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(" ");
          return (
            <path
              key={idx}
              d={d}
              fill="none"
              stroke="#5cf0ff"
              strokeWidth={1.5}
              opacity={0.9}
            />
          );
        })}

        {/* Coverage circle around current sub-satellite point */}
        {current && swathPx > 0 && (
          <circle
            cx={project(current.lat_deg, current.lon_deg)[0]}
            cy={project(current.lat_deg, current.lon_deg)[1]}
            r={swathPx}
            fill="#5cf0ff"
            fillOpacity={0.08}
            stroke="#5cf0ff"
            strokeOpacity={0.4}
            strokeWidth={0.8}
            strokeDasharray="3 2"
          />
        )}

        {/* Current position marker */}
        {current && (
          <>
            <circle
              cx={project(current.lat_deg, current.lon_deg)[0]}
              cy={project(current.lat_deg, current.lon_deg)[1]}
              r={5}
              fill="#5dffa0"
              stroke="#0a1018"
              strokeWidth={1}
            />
            <text
              x={project(current.lat_deg, current.lon_deg)[0] + 8}
              y={project(current.lat_deg, current.lon_deg)[1] - 6}
              fill="#5dffa0"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
            >
              {current.lat_deg.toFixed(1)}°, {current.lon_deg.toFixed(1)}°
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
