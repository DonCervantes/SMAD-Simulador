"use client";

import { InlineMath, BlockMath } from "react-katex";

export interface EquationDisplayProps {
  tex: string;
  inline?: boolean;
  /** Optional caption rendered under a block equation. */
  caption?: string;
}

export function EquationDisplay({
  tex,
  inline = false,
  caption,
}: EquationDisplayProps) {
  if (inline) {
    return <InlineMath math={tex} />;
  }
  return (
    <div className="my-2">
      <div className="overflow-x-auto py-1">
        <BlockMath math={tex} />
      </div>
      {caption && (
        <p className="text-[11px] text-[var(--color-fg-muted)] mt-1">
          {caption}
        </p>
      )}
    </div>
  );
}
