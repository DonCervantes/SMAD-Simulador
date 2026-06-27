/**
 * Orbital mechanics — Keplerian (two-body) primitives.
 *
 * All radii / semi-major axes are in km, velocities in km/s, periods in s.
 * Angles are in radians unless suffixed _DEG.
 *
 * Sources:
 *   - Vallado, D. A., *Fundamentals of Astrodynamics and Applications*, 4th ed.
 *     §1.5 (vis-viva), §1.7 (period).
 *   - Wertz, J. R., Everett, D. F., Puschell, J. J., *Space Mission
 *     Engineering: SMAD*, 2011, §6.1.
 */

import { MU_EARTH_KM3_S2, R_EARTH_KM } from "@/lib/constants";

/**
 * Semi-major axis of an orbit specified by perigee altitude and eccentricity.
 *
 *   r_p = R_⊕ + h
 *   a   = r_p / (1 − e)
 *
 * Convention adopted by the simulator: when e > 0, the user-supplied altitude
 * `h` is interpreted as the **perigee** altitude (not the mean altitude).
 */
export function semiMajorAxisFromPerigee(
  perigeeAltitudeKm: number,
  eccentricity: number,
): number {
  const rp = R_EARTH_KM + perigeeAltitudeKm;
  return rp / (1 - eccentricity);
}

/** Perigee radius from semi-major axis and eccentricity. */
export function perigeeRadius(a: number, e: number): number {
  return a * (1 - e);
}

/** Apogee radius from semi-major axis and eccentricity. */
export function apogeeRadius(a: number, e: number): number {
  return a * (1 + e);
}

/** Perigee / apogee altitudes above the WGS-84 equatorial radius. */
export function perigeeAltitude(a: number, e: number): number {
  return perigeeRadius(a, e) - R_EARTH_KM;
}
export function apogeeAltitude(a: number, e: number): number {
  return apogeeRadius(a, e) - R_EARTH_KM;
}

/**
 * Vis-viva: v(r) = sqrt( μ · (2/r − 1/a) ).
 * Source: Vallado §1.5 / Wertz SMAD eq. 6-7.
 */
export function visViva(r_km: number, a_km: number): number {
  return Math.sqrt(MU_EARTH_KM3_S2 * (2 / r_km - 1 / a_km));
}

/**
 * Orbital period via Kepler's third law: T = 2π · sqrt(a³ / μ).
 * Source: Vallado §1.7 / Wertz SMAD eq. 6-8.
 */
export function orbitalPeriod(a_km: number): number {
  return 2 * Math.PI * Math.sqrt((a_km * a_km * a_km) / MU_EARTH_KM3_S2);
}

/**
 * Mean motion n = sqrt(μ / a³), in rad/s.
 * Source: Vallado §2.2.
 */
export function meanMotion(a_km: number): number {
  return Math.sqrt(MU_EARTH_KM3_S2 / (a_km * a_km * a_km));
}

/**
 * Specific orbital energy ε = − μ / (2 a), in km² / s².
 * Negative for bound orbits.
 * Source: Vallado §1.4.
 */
export function specificEnergy(a_km: number): number {
  return -MU_EARTH_KM3_S2 / (2 * a_km);
}

/**
 * Semi-latus rectum p = a · (1 − e²), in km.
 * Used in the J2 nodal regression and in the polar form r = p / (1 + e·cos ν).
 */
export function semiLatusRectum(a_km: number, e: number): number {
  return a_km * (1 - e * e);
}
