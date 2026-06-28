"use client";

/**
 * Color-graded link margin indicator.
 * Red < 0 dB | Yellow 0–3 dB | Green ≥ 3 dB   (Wertz SMAD §13.3)
 */
interface Props {
  margin_dB: number;
}

export function LinkMarginGauge({ margin_dB }: Props) {
  const clamped = Math.max(-20, Math.min(30, margin_dB));
  // Map −20…+30 → 0…100 %
  const pct = ((clamped + 20) / 50) * 100;
  const { tone, label } =
    margin_dB >= 3
      ? { tone: "var(--color-ok)", label: "Adequate" }
      : margin_dB >= 0
        ? { tone: "var(--color-warn)", label: "Marginal" }
        : { tone: "var(--color-danger)", label: "Insufficient" };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-[var(--color-fg-muted)] font-mono uppercase tracking-wider">
          Link margin
        </span>
        <span
          className="text-2xl font-semibold readout tabular-nums"
          style={{ color: tone }}
        >
          {margin_dB >= 0 ? "+" : ""}
          {margin_dB.toFixed(2)} dB
        </span>
      </div>

      {/* bar */}
      <div className="relative h-3 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] overflow-hidden">
        {/* zero reference */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[var(--color-fg-dim)] opacity-50"
          style={{ left: `${((0 + 20) / 50) * 100}%` }}
        />
        {/* 3 dB threshold */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[var(--color-fg-dim)] opacity-30"
          style={{ left: `${((3 + 20) / 50) * 100}%` }}
        />
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${pct}%`, background: tone }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-[var(--color-fg-dim)] font-mono">
        <span>−20 dB</span>
        <span style={{ color: tone }} className="font-semibold">
          {label}
        </span>
        <span>+30 dB</span>
      </div>
    </div>
  );
}
