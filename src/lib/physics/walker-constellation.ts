/**
 * Walker constellation sizing for continuous ground coverage.
 *
 * Walker Delta notation: i : T / P / F
 *   i  = inclination (degrees)
 *   T  = total number of satellites
 *   P  = number of orbital planes
 *   F  = phasing parameter (0 ≤ F < P)
 *
 * References
 *   Wertz SMAD (2011) §7.6 — constellation design
 *   Walker (1977) "Continuous whole-earth coverage by circular-orbit satellite
 *     patterns," RAE Tech Report TR-77044
 *   Ballard (1980) "Rosette constellations of Earth satellites," IEEE TAES
 */

import { R_EARTH_KM } from "@/lib/constants";

/**
 * Minimum number of satellites for continuous single-coverage of a latitude band.
 * Uses the Wertz §7.6 street-of-coverage approximation:
 *
 *   α_max = arccos(R⊕ / (R⊕ + h)) − ε_min_rad   (half Earth-central angle)
 *   P ≥ π / α_max                                 (planes for polar coverage)
 *   S_per_plane ≥ π / α_max
 *   T = P · S   (total satellites, rounded up)
 *
 * This is a lower bound — actual T depends on constellation geometry.
 * For a rigorous solution use the Walker tables in Wertz App. C.
 *
 * @param h_km          orbital altitude (km)
 * @param epsilon_deg   minimum elevation angle (degrees)
 * @param lat_max_deg   maximum latitude of coverage zone (degrees); 90 = global
 */
export function minSatellitesForCoverage(
  h_km: number,
  epsilon_deg: number,
  lat_max_deg = 90,
): { T: number; P: number; S: number; alpha_deg: number } {
  const rho = R_EARTH_KM / (R_EARTH_KM + h_km);
  const epsilon_rad = (epsilon_deg * Math.PI) / 180;

  // Earth central half-angle of coverage for one satellite  (Wertz §8.2)
  const alpha_rad = Math.acos(rho * Math.cos(epsilon_rad)) - epsilon_rad;
  const alpha_deg = (alpha_rad * 180) / Math.PI;

  // For polar/global coverage, street-of-coverage requires P streets
  // each 2α wide spanning 180° longitude → P ≥ π/(2α)
  const P_min = Math.ceil(Math.PI / (2 * alpha_rad));

  // Satellites per plane for continuous coverage along a great circle
  const S_min = Math.ceil(Math.PI / alpha_rad);

  const T = P_min * S_min;
  return { T, P: P_min, S: S_min, alpha_deg };
}

/**
 * Walker constellation inclination for sun-synchronous orbit.
 * Closed-form from J2 nodal regression = −ω⊕·cos(lat) (approximate).
 * More commonly looked up: SSO inclination vs altitude table (Wertz §6.2).
 *
 * @param h_km  altitude (km)
 * @returns inclination in degrees
 */
export function ssoInclination_deg(h_km: number): number {
  // Curve-fit from Wertz Table 6-4: i_SSO ≈ 97.8° + 0.00568·h_km (below 1000 km)
  return 97.8 + 0.00568 * h_km;
}

/**
 * Access time per pass (seconds) — time a ground point spends inside
 * the satellite's coverage circle during one overhead pass.
 * Approximate formula (assumes circular orbit, nadir pass):
 *
 *   t_access = (2 · α / 360) · T_orbital   [Wertz §8.2 eq. 8-30 simplified]
 *
 * @param alpha_deg   Earth central half-angle of single satellite (degrees)
 * @param T_s         orbital period (seconds)
 */
export function accessTimePerPass_s(alpha_deg: number, T_s: number): number {
  return (2 * alpha_deg / 360) * T_s;
}

/**
 * Revisit time (hours) for a single satellite over a given latitude.
 * Approximate: T_rev = T_orbital · 360 / (2·α·cos(lat))
 * [Wertz §7.4 revisit time approximation]
 *
 * @param alpha_deg   Earth central half-angle (degrees)
 * @param T_s         orbital period (seconds)
 * @param lat_deg     target latitude (degrees)
 * @param T_total     total satellites in constellation (increases coverage rate)
 */
export function revisitTime_h(
  alpha_deg: number,
  T_s: number,
  lat_deg: number,
  T_total = 1,
): number {
  const cos_lat = Math.cos((lat_deg * Math.PI) / 180);
  if (cos_lat <= 0) return 0;
  const rev_s = (T_s * 180) / (alpha_deg * cos_lat * T_total);
  return rev_s / 3600;
}

/** Format Walker notation string: "i:T/P/F" */
export function walkerNotation(
  i_deg: number,
  T: number,
  P: number,
  F = 0,
): string {
  return `${i_deg.toFixed(1)}° : ${T}/${P}/${F}`;
}
