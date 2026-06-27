/**
 * J2 secular perturbations — RAAN regression and argument-of-perigee rotation.
 *
 * For a near-circular orbit the second zonal harmonic J2 of the Earth produces
 * two well-known secular drifts in the Keplerian elements:
 *
 *   dΩ/dt  = −3/2 · n · J2 · (R_⊕ / p)² · cos(i)              (Wertz eq. 6-19)
 *   dω/dt  =  3/4 · n · J2 · (R_⊕ / p)² · (5·cos²(i) − 1)     (Wertz eq. 6-20)
 *
 * with p = a · (1 − e²) the semi-latus rectum and n the unperturbed mean
 * motion. Both rates are in rad/s.
 *
 * The sun-synchronous condition (dΩ/dt = 360°/365.25 d ≈ 1.991e-7 rad/s)
 * is obtained when cos(i) is negative — i.e. retrograde orbits with i ≈ 98°
 * for typical LEO.
 *
 * Source:
 *   Wertz, J. R., Everett, D. F., Puschell, J. J., *Space Mission Engineering:
 *   SMAD*, 2011, §6.2 ("Orbit Perturbations"); equivalent treatment in
 *   Vallado §9.6 (eq. 9-37 for Ω̇, eq. 9-38 for ω̇).
 */

import { J2_EARTH, R_EARTH_KM } from "@/lib/constants";
import { meanMotion, semiLatusRectum } from "@/lib/physics/orbit";

/**
 * Secular RAAN regression rate dΩ/dt due to J2, in rad/s.
 *
 * Sign convention: negative for prograde orbits (i < 90°), zero at i = 90°
 * (polar), positive for retrograde (i > 90°). Multiply by 86_400 to obtain
 * rad/day, or by 86_400 · 180/π for deg/day.
 */
export function nodalRegressionRate(
  a_km: number,
  e: number,
  i_rad: number,
  J2 = J2_EARTH,
  R = R_EARTH_KM,
): number {
  const n = meanMotion(a_km);
  const p = semiLatusRectum(a_km, e);
  return -1.5 * n * J2 * Math.pow(R / p, 2) * Math.cos(i_rad);
}

/**
 * Secular argument-of-perigee rotation rate dω/dt due to J2, in rad/s.
 * Vanishes at the critical inclination i = 63.4° (and its supplement).
 * Exposed for completeness — Module 1 only displays Ω̇ in v1.
 */
export function argPerigeeRate(
  a_km: number,
  e: number,
  i_rad: number,
  J2 = J2_EARTH,
  R = R_EARTH_KM,
): number {
  const n = meanMotion(a_km);
  const p = semiLatusRectum(a_km, e);
  const cosI = Math.cos(i_rad);
  return 0.75 * n * J2 * Math.pow(R / p, 2) * (5 * cosI * cosI - 1);
}

/** Convert a rate from rad/s to degrees per day (convenience for the UI). */
export function radPerSecToDegPerDay(rate_rad_s: number): number {
  return (rate_rad_s * 86_400 * 180) / Math.PI;
}
