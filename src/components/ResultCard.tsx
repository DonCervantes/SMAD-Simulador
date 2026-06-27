import { clsx } from "@/lib/clsx";

export interface ResultCardProps {
  label: string;
  value: string | number;
  unit?: string;
  /** Optional smaller line below the value (formula reference, assumption, …). */
  caption?: string;
  /** Visual emphasis for the value. Defaults to "primary". */
  tone?: "primary" | "ok" | "warn" | "danger" | "muted";
}

const TONE_CLASSES: Record<NonNullable<ResultCardProps["tone"]>, string> = {
  primary: "text-[var(--color-readout)]",
  ok: "text-[var(--color-ok)]",
  warn: "text-[var(--color-warn)]",
  danger: "text-[var(--color-danger)]",
  muted: "text-[var(--color-fg-muted)]",
};

export function ResultCard({
  label,
  value,
  unit,
  caption,
  tone = "primary",
}: ResultCardProps) {
  return (
    <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-3 flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)]">
        {label}
      </div>
      <div className={clsx("readout text-xl font-semibold", TONE_CLASSES[tone])}>
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-[var(--color-fg-muted)]">
            {unit}
          </span>
        )}
      </div>
      {caption && (
        <div className="text-[11px] text-[var(--color-fg-dim)] leading-snug">
          {caption}
        </div>
      )}
    </div>
  );
}
