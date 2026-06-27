/**
 * Simple impulsive plane change at a given orbital speed.
 *
 *     Δv_plane = 2 · v · sin(Δi / 2)
 *
 * The cost is minimized when the burn is executed where v is smallest — for an
 * elliptic transfer that means at apoapsis. We expose the formula in its
 * dependence on v so the caller can pick the speed (periapsis, apoapsis, or
 * circular).
 *
 * Source: Wertz SMAD §6.3, eq. 6-32 ("Plane Change").
 */
export function planeChangeDeltaV(v_km_s: number, deltaInclination_rad: number): number {
  return 2 * v_km_s * Math.sin(Math.abs(deltaInclination_rad) / 2);
}
