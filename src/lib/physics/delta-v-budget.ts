/**
 * Δv budget assembler — builds the per-phase waterfall a mission designer
 * actually presents in a PDR review.
 *
 * A budget is a list of named rows; each row carries its Δv contribution (in
 * m/s) and a free-form citation/note. The assembler also exposes a
 * `cumulative` running total so a waterfall chart can stack the bars.
 *
 * v1 phases supported:
 *   - Ascent to parking LEO (default 9.4 km/s with breakdown comment)
 *   - Hohmann burn 1
 *   - Hohmann burn 2
 *   - Plane change
 *   - Station-keeping over mission lifetime
 *   - End-of-life disposal
 *
 * Sources for the default heuristic numbers (all citable, all editable):
 *   - Ascent loss budget: Curtis §11.6 (gravity ~1.5 km/s, drag ~0.1 km/s,
 *     steering ~0.05 km/s on a typical Falcon-class trajectory).
 *   - GEO station-keeping: Wertz SMAD §10.7 (N-S ~50 m/s/yr from luni-solar
 *     perturbations, E-W ~2 m/s/yr from tesseral resonance).
 *   - LEO disposal: IADC-02-01 (controlled re-entry from 400 km ≈ 120 m/s).
 *   - GEO graveyard: IADC-02-01 (raise apogee 300 km above GEO ≈ 11 m/s).
 */

export interface BudgetRow {
  /** Short human-readable label (used as the bar label in the chart). */
  label: string;
  /** Δv contribution, m/s. */
  dv_m_s: number;
  /** Optional category for color-coding the waterfall. */
  category?: "ascent" | "transfer" | "plane-change" | "station-keeping" | "disposal" | "margin";
  /** Optional source / assumption note. */
  note?: string;
}

export interface AssembledBudget {
  rows: BudgetRow[];
  /** Per-row running total before adding the row's Δv (for waterfall bars). */
  cumulativeBefore: number[];
  /** Per-row running total after adding the row's Δv. */
  cumulativeAfter: number[];
  /** Final total Δv, m/s. */
  total_m_s: number;
  /** Total with margin applied, m/s. */
  totalWithMargin_m_s: number;
}

export function assembleBudget(
  rows: BudgetRow[],
  contingencyFraction = 0,
): AssembledBudget {
  const cumulativeBefore: number[] = [];
  const cumulativeAfter: number[] = [];
  let running = 0;
  for (const r of rows) {
    cumulativeBefore.push(running);
    running += r.dv_m_s;
    cumulativeAfter.push(running);
  }
  return {
    rows,
    cumulativeBefore,
    cumulativeAfter,
    total_m_s: running,
    totalWithMargin_m_s: running * (1 + contingencyFraction),
  };
}

/** Convenience: build a contingency row from a fraction of the rest of the budget. */
export function contingencyRow(
  baseTotal_m_s: number,
  fraction: number,
): BudgetRow {
  return {
    label: `Contingency (${(fraction * 100).toFixed(0)}%)`,
    dv_m_s: baseTotal_m_s * fraction,
    category: "margin",
    note: "Engineering reserve per typical agency Δv allocation policy.",
  };
}
