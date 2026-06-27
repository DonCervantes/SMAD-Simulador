"use client";

import { useId } from "react";

export interface SliderInputProps {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Optional description shown below the label (e.g., physical meaning). */
  hint?: string;
  /** Optional formatter for the numeric value displayed next to the slider. */
  format?: (value: number) => string;
}

/**
 * Numeric input with a synchronized slider. Sliding or typing both call
 * `onChange`; out-of-range typed values are clamped to [min, max].
 *
 * The numeric input is rendered as a small editable readout (not a wide text
 * field) so the panel remains scannable. Both controls share the same state
 * via the parent.
 */
export function SliderInput({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  hint,
  format,
}: SliderInputProps) {
  const id = useId();
  const displayValue = format ? format(value) : value.toString();

  function handleNumber(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number.parseFloat(e.target.value);
    if (Number.isNaN(v)) return;
    const clamped = Math.min(max, Math.max(min, v));
    onChange(clamped);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-sm font-medium text-[var(--color-fg)]"
        >
          {label}
        </label>
        <div className="flex items-baseline gap-1.5 readout">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleNumber}
            className="w-24 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-2 py-0.5 text-right text-sm text-[var(--color-readout)] focus:border-[var(--color-accent)] focus:outline-none"
            aria-label={`${label} numeric input`}
          />
          {unit && (
            <span className="text-xs text-[var(--color-fg-muted)] min-w-8">
              {unit}
            </span>
          )}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
      <div className="flex justify-between text-[10px] text-[var(--color-fg-dim)] readout">
        <span>
          {format ? format(min) : min} {unit}
        </span>
        <span>
          {format ? format(max) : max} {unit}
        </span>
      </div>
      {hint && (
        <p className="text-[11px] leading-snug text-[var(--color-fg-muted)]">
          {hint}
        </p>
      )}
      {displayValue && null /* displayValue is shown in the number input above */}
    </div>
  );
}
