/**
 * Ground-track propagator: integrates a set of Keplerian elements (with J2
 * secular RAAN drift) and returns sub-satellite (lat, lon) samples in the
 * Earth-fixed frame.
 *
 * Pipeline at each time step t:
 *   1. M(t) = M_0 + n · t                                  mean anomaly
 *   2. solve M = E − e · sin E for E                       Kepler's equation
 *   3. ν(E) = 2·atan2(√(1+e)·sin(E/2), √(1−e)·cos(E/2))    true anomaly
 *   4. r(E) = a · (1 − e·cos E)                            radius
 *   5. r_pqw = ( r·cos ν, r·sin ν, 0 )                     perifocal
 *   6. r_eci = R_z(−Ω(t)) · R_x(−i) · R_z(−ω) · r_pqw      with
 *      Ω(t) = Ω_0 + (dΩ/dt)_J2 · t                         J2 nodal drift
 *   7. r_ecef = R_z(θ_GST(t)) · r_eci                      Earth rotation
 *      θ_GST(t) = θ_GST0 + ω_⊕ · t
 *   8. lat = asin(z / |r|),  lon = atan2(y, x)
 *
 * Limitations of v1 (declared in the UI):
 *   - No SGP4 / drag / SRP. Pure J2 secular perturbation only.
 *   - ω̇ and Ṁ from J2 are not propagated (the perigee precession across
 *     one or two orbits is millidegree-scale and invisible at plot resolution).
 *   - Earth is treated as a perfect sphere for the lat/lon back-projection.
 *     For ground-station visibility / footprint we use R_⊕ throughout.
 *
 * Source: Vallado §3 (frame transformations), §9.6 (J2 secular).
 */

import {
  solveKepler,
  trueAnomalyFromEccentric,
} from "@/lib/physics/kepler-solver";
import { meanMotion } from "@/lib/physics/orbit";
import { nodalRegressionRate } from "@/lib/physics/j2";
import { EARTH_ROTATION_RAD_S } from "@/lib/constants";

export interface OrbitElements {
  a_km: number;
  e: number;
  i_rad: number;
  raan0_rad: number;
  argPerigee_rad: number;
  M0_rad: number;
}

export interface GroundTrackPoint {
  t_s: number;
  lat_deg: number;
  lon_deg: number;
  r_km: number;
}

/** Convert PQW (perifocal) coordinates to ECI given Ω, i, ω. */
function perifocalToECI(
  x_pqw: number,
  y_pqw: number,
  raan: number,
  i: number,
  argp: number,
): [number, number, number] {
  const cw = Math.cos(argp);
  const sw = Math.sin(argp);
  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const ci = Math.cos(i);
  const si = Math.sin(i);

  const x_eci =
    (cO * cw - sO * sw * ci) * x_pqw + (-cO * sw - sO * cw * ci) * y_pqw;
  const y_eci =
    (sO * cw + cO * sw * ci) * x_pqw + (-sO * sw + cO * cw * ci) * y_pqw;
  const z_eci = sw * si * x_pqw + cw * si * y_pqw;
  return [x_eci, y_eci, z_eci];
}

/**
 * Compute a sequence of ground-track samples spanning `durationSeconds`,
 * with `numSamples` evenly-spaced points (including endpoints).
 *
 * `gst0_rad` is the Greenwich Sidereal Time at t = 0; defaults to 0, which is
 * fine for visualization purposes (the absolute longitude offset is arbitrary
 * without an epoch).
 */
export function computeGroundTrack(
  elements: OrbitElements,
  durationSeconds: number,
  numSamples: number,
  gst0_rad = 0,
): GroundTrackPoint[] {
  if (numSamples < 2) {
    throw new Error("computeGroundTrack: numSamples must be ≥ 2.");
  }

  const { a_km, e, i_rad, raan0_rad, argPerigee_rad, M0_rad } = elements;
  const n = meanMotion(a_km);
  const dRAAN_dt = nodalRegressionRate(a_km, e, i_rad);

  const points: GroundTrackPoint[] = new Array(numSamples);
  const dt = durationSeconds / (numSamples - 1);

  for (let k = 0; k < numSamples; k++) {
    const t = k * dt;

    const M = M0_rad + n * t;
    const E = solveKepler(M, e);
    const nu = trueAnomalyFromEccentric(E, e);
    const r = a_km * (1 - e * Math.cos(E));

    const x_pqw = r * Math.cos(nu);
    const y_pqw = r * Math.sin(nu);

    const raan = raan0_rad + dRAAN_dt * t;
    const [x_eci, y_eci, z_eci] = perifocalToECI(
      x_pqw,
      y_pqw,
      raan,
      i_rad,
      argPerigee_rad,
    );

    // ECI → ECEF: rotate by −θ_GST around z.
    const gst = gst0_rad + EARTH_ROTATION_RAD_S * t;
    const cg = Math.cos(gst);
    const sg = Math.sin(gst);
    const x_ecef = cg * x_eci + sg * y_eci;
    const y_ecef = -sg * x_eci + cg * y_eci;
    const z_ecef = z_eci;

    const r_mag = Math.sqrt(
      x_ecef * x_ecef + y_ecef * y_ecef + z_ecef * z_ecef,
    );
    const lat = Math.asin(z_ecef / r_mag);
    const lon = Math.atan2(y_ecef, x_ecef);

    points[k] = {
      t_s: t,
      lat_deg: (lat * 180) / Math.PI,
      lon_deg: (lon * 180) / Math.PI,
      r_km: r_mag,
    };
  }

  return points;
}
