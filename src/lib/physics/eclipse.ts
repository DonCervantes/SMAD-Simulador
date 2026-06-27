/**
 * Earth-shadow eclipse model — cylindrical (umbra-only) approximation.
 *
 * Geometry:
 *   - Earth's shadow is treated as a cylinder of radius R_⊕ along the
 *     anti-solar direction. No penumbra is modeled.
 *   - β is the solar beta angle: angle between the Sun vector and the orbital
 *     plane. β = 0 → Sun in the orbital plane (longest eclipses).
 *     |β| ≥ β_crit = arcsin(R_⊕ / r)  →  orbit never enters shadow.
 *
 * For a CIRCULAR orbit of radius r, Wertz (SMAD §5.1.1, eq. 5-23) gives the
 * fraction of period in eclipse as
 *
 *     f_eclipse = (1/π) · arccos( sqrt(r² − R_⊕²) / (r · cos β) )
 *
 * when the orbit intersects the shadow cylinder; zero otherwise.
 *
 * v1 simplification: for elliptic orbits we evaluate this expression at the
 * semi-major axis a. This is exact at e = 0 and is a representative average
 * for low-eccentricity orbits; the eclipse fraction in a high-e orbit varies
 * significantly with the location of perigee relative to the shadow and
 * requires anomaly-based integration. We mark this assumption in the UI.
 *
 * Source: Wertz, J. R., Everett, D. F., Puschell, J. J., *Space Mission
 * Engineering: SMAD*, 2011, §5.1.1 ("Eclipses").
 */

import { R_EARTH_KM } from "@/lib/constants";

/** Critical β angle above which no eclipse occurs. */
export function criticalBeta(r_km: number, R = R_EARTH_KM): number {
  return Math.asin(R / r_km);
}

/**
 * Fraction of one orbital period spent in Earth's shadow (cylindrical model).
 * Returns a value in [0, 1].
 */
export function eclipseFraction(
  r_km: number,
  beta_rad: number,
  R = R_EARTH_KM,
): number {
  const sinBeta = Math.abs(Math.sin(beta_rad));
  const sinBetaCrit = R / r_km;
  if (sinBeta >= sinBetaCrit) return 0;

  const cosBeta = Math.cos(beta_rad);
  // cos(β) ≥ 0 for |β| ≤ π/2; for |β| > π/2 the sun is behind the orbit
  // plane and the cylindrical model still applies by symmetry.
  const absCosBeta = Math.abs(cosBeta);
  if (absCosBeta === 0) return 0;

  const numerator = Math.sqrt(r_km * r_km - R * R);
  const denominator = r_km * absCosBeta;
  if (numerator >= denominator) return 0;
  return Math.acos(numerator / denominator) / Math.PI;
}

/**
 * Duration of one eclipse pass, in seconds, given the orbital period.
 * Convenience wrapper for the UI.
 */
export function eclipseDurationSeconds(
  r_km: number,
  beta_rad: number,
  period_s: number,
): number {
  return eclipseFraction(r_km, beta_rad) * period_s;
}
