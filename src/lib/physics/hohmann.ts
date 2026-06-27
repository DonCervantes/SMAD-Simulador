/**
 * Hohmann two-impulse transfer between two coplanar circular orbits.
 *
 * Given initial and target orbital radii r1 and r2 (measured from the Earth's
 * center, NOT altitudes), the elliptic transfer has semi-major axis
 *
 *     a_t = (r1 + r2) / 2
 *
 * and the two burns are
 *
 *     Δv₁ = sqrt(μ/r1) · ( sqrt(2·r2/(r1+r2)) − 1 )       (at periapsis)
 *     Δv₂ = sqrt(μ/r2) · ( 1 − sqrt(2·r1/(r1+r2)) )       (at apoapsis)
 *
 * Both quantities are positive for raising transfers (r2 > r1) and negative
 * for lowering. Conventionally the budget uses absolute values.
 *
 * Sources:
 *   - Wertz, J. R., Everett, D. F., Puschell, J. J. — *Space Mission
 *     Engineering: SMAD*, §6.3 ("Orbit Maneuvers"), eq. 6-39 and 6-40.
 *   - Curtis, H. D. — *Orbital Mechanics for Engineering Students*, 3rd ed.,
 *     §6.2.
 *   - Vallado, D. A. — *Fundamentals of Astrodynamics*, §6.3.1.
 */

import { MU_EARTH_KM3_S2 } from "@/lib/constants";

export interface HohmannTransfer {
  /** Magnitude of the first impulse (periapsis of the transfer ellipse), km/s. */
  dv1_km_s: number;
  /** Magnitude of the second impulse (apoapsis), km/s. */
  dv2_km_s: number;
  /** Total Δv = |Δv₁| + |Δv₂|, km/s. */
  dvTotal_km_s: number;
  /** Time of flight along the transfer ellipse (half period), s. */
  tof_s: number;
  /** Semi-major axis of the transfer ellipse, km. */
  aTransfer_km: number;
}

/**
 * Compute a Hohmann transfer between circular orbits of radii r1 and r2
 * (around the same primary, Earth here). Both radii must be > 0.
 */
export function hohmannTransfer(
  r1_km: number,
  r2_km: number,
  mu = MU_EARTH_KM3_S2,
): HohmannTransfer {
  if (r1_km <= 0 || r2_km <= 0) {
    throw new Error("hohmannTransfer: radii must be positive.");
  }
  const aT = (r1_km + r2_km) / 2;
  const v1 = Math.sqrt(mu / r1_km);
  const v2 = Math.sqrt(mu / r2_km);
  const dv1 = v1 * (Math.sqrt((2 * r2_km) / (r1_km + r2_km)) - 1);
  const dv2 = v2 * (1 - Math.sqrt((2 * r1_km) / (r1_km + r2_km)));
  const tof = Math.PI * Math.sqrt((aT * aT * aT) / mu);

  return {
    dv1_km_s: Math.abs(dv1),
    dv2_km_s: Math.abs(dv2),
    dvTotal_km_s: Math.abs(dv1) + Math.abs(dv2),
    tof_s: tof,
    aTransfer_km: aT,
  };
}
