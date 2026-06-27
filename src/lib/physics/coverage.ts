/**
 * Earth-pointing coverage geometry from a satellite at radius r.
 *
 * Standard Earth-satellite triangle (Wertz §8.2 / Vallado §11.1):
 *
 *       satellite (at r from Earth center)
 *           /|
 *          / |
 *      ρ  /  |
 *        /   |
 *       /  η |  (η = nadir angle at satellite)
 *      /     |
 *     T______C    (T = target on Earth surface, C = Earth center)
 *        R_⊕
 *
 * with ε the minimum elevation angle of the satellite above the local horizon
 * at T, λ the Earth-central angle (T-C-subsat), and ρ the slant range.
 *
 * Law of sines on the triangle (T, satellite, C):
 *
 *     sin(η) / R_⊕  =  sin(90° + ε) / r   ⇒   sin(η) = (R_⊕ / r) · cos(ε)
 *
 * and the angles of any triangle sum to 180°, hence
 *
 *     λ = 90° − ε − η
 *
 * The instantaneous coverage footprint is the spherical cap of half-angle λ
 * on the Earth's surface, with area  A = 2π R_⊕² (1 − cos λ).
 *
 * Source: Wertz, J. R., Everett, D. F., Puschell, J. J., *Space Mission
 * Engineering: SMAD*, 2011, §8.2 ("Geometry of Earth Coverage"). The same
 * triangle formulation appears in Vallado §11.1.
 */

import { R_EARTH_KM } from "@/lib/constants";

/** Nadir angle η at the satellite, in radians. */
export function nadirAngle(
  epsilon_rad: number,
  r_km: number,
  R = R_EARTH_KM,
): number {
  return Math.asin((R / r_km) * Math.cos(epsilon_rad));
}

/** Earth-central angle λ from sub-satellite point to target horizon, in radians. */
export function centralAngle(
  epsilon_rad: number,
  r_km: number,
  R = R_EARTH_KM,
): number {
  return Math.PI / 2 - epsilon_rad - nadirAngle(epsilon_rad, r_km, R);
}

/**
 * Slant range ρ from satellite to a target seen at elevation ε, in km.
 *   ρ = R_⊕ · (sin λ / sin η)
 */
export function slantRange(
  epsilon_rad: number,
  r_km: number,
  R = R_EARTH_KM,
): number {
  const eta = nadirAngle(epsilon_rad, r_km, R);
  const lambda = centralAngle(epsilon_rad, r_km, R);
  return (R * Math.sin(lambda)) / Math.sin(eta);
}

/** Great-circle ground-range radius of the instantaneous coverage circle, in km. */
export function swathRadius(
  epsilon_rad: number,
  r_km: number,
  R = R_EARTH_KM,
): number {
  return R * centralAngle(epsilon_rad, r_km, R);
}

/** Area of the spherical-cap footprint at minimum elevation ε, in km². */
export function footprintArea(
  epsilon_rad: number,
  r_km: number,
  R = R_EARTH_KM,
): number {
  const lambda = centralAngle(epsilon_rad, r_km, R);
  return 2 * Math.PI * R * R * (1 - Math.cos(lambda));
}
