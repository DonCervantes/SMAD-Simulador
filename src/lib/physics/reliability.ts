/**
 * Spacecraft reliability models — exponential failure law (constant hazard rate).
 *
 * References
 *   MIL-HDBK-217F Notice 2 (1995) — Reliability Prediction of Electronic Equipment
 *   Wertz SMAD (2011) §19 — Reliability and fault tolerance
 *   Birolini — Reliability Engineering (7th ed.) §2
 *
 * All models assume the exponential distribution (constant failure rate λ),
 * which is the standard for space electronics operating in the useful-life period.
 *
 * Units: λ in failures / hour  (convert from FIT: 1 FIT = 1e-9 /h)
 */

// ─── primitives ──────────────────────────────────────────────────────────────

/**
 * Single-component reliability R(t) = e^(−λt).  [Wertz §19.2 / Birolini §2.2]
 */
export function rSingle(lambda_per_h: number, t_h: number): number {
  return Math.exp(-lambda_per_h * t_h);
}

/**
 * Series reliability — all N components must survive.
 * R_s = ∏ R_i = e^(−Σλ_i · t)   [Wertz §19.3 eq. 19-3]
 */
export function rSeries(lambdas: number[], t_h: number): number {
  const sum = lambdas.reduce((a, b) => a + b, 0);
  return Math.exp(-sum * t_h);
}

/**
 * Active parallel (hot redundancy) — system fails only if ALL fail.
 * R_p = 1 − ∏(1 − R_i)   [Wertz §19.3 eq. 19-5]
 *
 * For n identical components: R_p = 1 − (1 − e^(−λt))^n
 */
export function rParallel(lambda_per_h: number, n: number, t_h: number): number {
  const q = 1 - Math.exp(-lambda_per_h * t_h); // unreliability of one
  return 1 - Math.pow(q, n);
}

/**
 * k-of-n voting (active redundancy) — at least k of n must survive.
 * R_{k/n} = Σ_{i=k}^{n} C(n,i) · R^i · (1−R)^(n−i)   [Wertz §19.3 / Birolini §2.5]
 */
export function rKofN(
  lambda_per_h: number,
  k: number,
  n: number,
  t_h: number,
): number {
  const r = Math.exp(-lambda_per_h * t_h);
  const q = 1 - r;
  let sum = 0;
  for (let i = k; i <= n; i++) {
    sum += binomCoeff(n, i) * Math.pow(r, i) * Math.pow(q, n - i);
  }
  return sum;
}

/**
 * Cold standby — one active unit; on failure, a cold spare is switched in.
 * Assumes perfect switch and identical units (failure rate λ each).
 * R_cs(t) = e^(−λt) · (1 + λt)   [Birolini §2.6 eq. 2-57, n=2 units]
 *
 * Generalized to m spares (m+1 total units):
 * R_cs(t) = e^(−λt) · Σ_{k=0}^{m} (λt)^k / k!   (Poisson sum)
 */
export function rColdStandby(
  lambda_per_h: number,
  m_spares: number,
  t_h: number,
): number {
  const x = lambda_per_h * t_h;
  let sum = 0;
  let term = 1; // k=0: x^0/0! = 1
  sum += term;
  for (let k = 1; k <= m_spares; k++) {
    term *= x / k;
    sum += term;
  }
  return Math.exp(-x) * sum;
}

/** Mean time between failures (hours): MTBF = 1/λ. */
export function mtbf_h(lambda_per_h: number): number {
  return 1 / lambda_per_h;
}

// ─── 6 redundancy architectures (Wertz SMAD §19 / course syllabus) ───────────
//
// The SPEC lists: FCSSTV, CSSTV, CBTV, FCSSC, FCSBSC, CBSC.
// These acronyms are not in MIL-HDBK-217F or Birolini.
// After searching Gutiérrez-Martínez (2014, SOMECyTA), Fortescue ch. 14,
// and NASA State-of-the-Art Small Spacecraft Technology (2023), no primary
// definition was found. The mapping below is derived from the structural
// interpretation of the acronym tokens:
//   FC = Full Cold (cold standby), C = Cold, CB = Cross-strapped Bypass
//   SS = Series-Series, STV = Series-Triple-Voting,
//   SC = Series-Cold, BSC = Bypass-Series-Cold
// Each is mapped to a primitive combination and flagged in the UI.

export type ArchitectureId =
  | "FCSSTV"
  | "CSSTV"
  | "CBTV"
  | "FCSSC"
  | "FCSBSC"
  | "CBSC";

export interface Architecture {
  id: ArchitectureId;
  label: string;
  description: string;
  primitive: "series" | "parallel" | "kofn" | "coldstandby" | "compound";
  /** Number of redundant units (spares for cold-standby; parallel units for others). */
  n: number;
  /** k required for k-of-n, 1 otherwise. */
  k: number;
  sourceNote: string;
}

export const ARCHITECTURES: Architecture[] = [
  {
    id: "FCSSTV",
    label: "FC-SS-TV",
    description: "Full cold standby with series sub-system and triple-voting output",
    primitive: "compound",
    n: 3,
    k: 2,
    sourceNote: "⚠ Interpreted: cold-standby primary + 2-of-3 voter on output. No primary source found for this acronym.",
  },
  {
    id: "CSSTV",
    label: "C-SS-TV",
    description: "Cold standby with series sub-system and triple-voting",
    primitive: "kofn",
    n: 3,
    k: 2,
    sourceNote: "⚠ Interpreted: 2-of-3 voting (Birolini §2.5). Acronym not in MIL-HDBK-217F.",
  },
  {
    id: "CBTV",
    label: "CB-TV",
    description: "Cross-strapped bypass with triple-voting output",
    primitive: "parallel",
    n: 3,
    k: 1,
    sourceNote: "⚠ Interpreted: active parallel (hot redundancy, 3 units). Acronym not in MIL-HDBK-217F.",
  },
  {
    id: "FCSSC",
    label: "FC-SS-C",
    description: "Full cold standby with series sub-system, cold-spare chain",
    primitive: "coldstandby",
    n: 2,
    k: 1,
    sourceNote: "⚠ Interpreted: cold standby with 1 spare (Birolini §2.6 eq. 2-57). Acronym not in MIL-HDBK-217F.",
  },
  {
    id: "FCSBSC",
    label: "FC-SB-SC",
    description: "Full cold standby with bypass switch and series-cold spare",
    primitive: "coldstandby",
    n: 3,
    k: 1,
    sourceNote: "⚠ Interpreted: cold standby with 2 spares (Poisson sum, Birolini §2.6). Acronym not in MIL-HDBK-217F.",
  },
  {
    id: "CBSC",
    label: "CB-SC",
    description: "Cross-strapped bypass with series-cold spare",
    primitive: "kofn",
    n: 2,
    k: 1,
    sourceNote: "⚠ Interpreted: active parallel (2 units). Acronym not in MIL-HDBK-217F.",
  },
];

/**
 * Evaluate R(t) for a given architecture.
 */
export function evaluateArchitecture(
  arch: Architecture,
  lambda_per_h: number,
  t_h: number,
): number {
  switch (arch.primitive) {
    case "parallel":
      return rParallel(lambda_per_h, arch.n, t_h);
    case "kofn":
      return rKofN(lambda_per_h, arch.k, arch.n, t_h);
    case "coldstandby":
      return rColdStandby(lambda_per_h, arch.n - 1, t_h);
    case "compound":
      // FC-SS-TV: cold standby primary unit + 2-of-3 voter
      // Model as: R_cs(t, m=1) × R_kofn(2-of-3) — conservative series composition
      return rColdStandby(lambda_per_h, 1, t_h) * rKofN(lambda_per_h, 2, 3, t_h);
    case "series":
    default:
      return rSingle(lambda_per_h, t_h);
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function binomCoeff(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < Math.min(k, n - k); i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

// ─── MIL-HDBK-217F representative failure rates ───────────────────────────────
/**
 * Representative failure rates from MIL-HDBK-217F Notice 2, §5–§9.
 * Values are base rates (λ_b) for ground/space environment class at rated conditions.
 * Units: failures per 10⁶ hours (converted to /h by ×1e-6).
 *
 * ⚠ MIL-HDBK-217F was officially superseded but remains industry reference for
 * relative comparisons. Space-grade parts show 2–10× better than MIL-217 predictions.
 */
export const MIL217_COMPONENTS: Array<{
  label: string;
  lambda_fit: number; // failures per 10⁹ hours (FIT)
  note: string;
}> = [
  { label: "Space-grade ASIC / FPGA",     lambda_fit: 50,   note: "MIL-HDBK-217F §5.1, EEE-INST-002" },
  { label: "RF amplifier (GaAs MMIC)",    lambda_fit: 200,  note: "MIL-HDBK-217F §6" },
  { label: "Electromechanical relay",     lambda_fit: 2000, note: "MIL-HDBK-217F §14.1" },
  { label: "Solar cell string (ATOX)",    lambda_fit: 100,  note: "Fortescue ch. 10 / ECSS-E-ST-20" },
  { label: "Li-ion battery cell",         lambda_fit: 500,  note: "Fortescue ch. 10" },
  { label: "Star tracker assembly",       lambda_fit: 300,  note: "Wertz §19.2 Table 19-2" },
  { label: "Reaction wheel bearing",      lambda_fit: 1000, note: "Wertz §19.2 Table 19-2" },
  { label: "Thruster valve (pyro)",       lambda_fit: 150,  note: "MIL-HDBK-217F §14.3" },
  { label: "Optical receiver (Si PIN)",   lambda_fit: 80,   note: "MIL-HDBK-217F §6.8" },
  { label: "Custom (user-defined)",       lambda_fit: 100,  note: "User input" },
];

/** Convert FIT (failures / 10⁹ h) to failures / hour. */
export function fitToLambda(fit: number): number {
  return fit * 1e-9;
}

/** Convert mission lifetime (years) to hours. */
export function yearsToHours(years: number): number {
  return years * 8760;
}
