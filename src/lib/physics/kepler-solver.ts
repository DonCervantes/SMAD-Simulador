/**
 * Kepler's equation solver: M = E − e · sin(E).
 *
 * Newton–Raphson with the standard initial guess E_0 = M + e · sin(M) (Vallado
 * §2.2, algorithm KEPLER). Converges in <6 iterations for e ≤ 0.6 and the
 * typical 1e-10 tolerance used here.
 *
 * Sources:
 *   - Vallado, D. A., *Fundamentals of Astrodynamics and Applications*, 4th
 *     ed., §2.2 ("Kepler's Problem"), algorithms 1 and 2.
 *   - Curtis, H. D., *Orbital Mechanics for Engineering Students*, 3rd ed.,
 *     §3.3.
 */

/**
 * Solve Kepler's equation for the eccentric anomaly E given mean anomaly M
 * and eccentricity e (0 ≤ e < 1). M is wrapped to [-π, π] before iterating.
 *
 * @throws if convergence is not reached within `maxIter` steps.
 */
export function solveKepler(
  M_rad: number,
  e: number,
  tol = 1e-10,
  maxIter = 50,
): number {
  if (e < 0 || e >= 1) {
    throw new Error(`solveKepler: eccentricity ${e} outside [0, 1).`);
  }

  // Wrap M to [-π, π] to keep the Newton initial guess in a good basin.
  const M = ((((M_rad + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
    - Math.PI;

  let E = M + e * Math.sin(M);
  for (let i = 0; i < maxIter; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) < tol) return E;
  }
  throw new Error(
    `solveKepler did not converge after ${maxIter} iterations (M=${M_rad}, e=${e}).`,
  );
}

/**
 * Convert eccentric anomaly E to true anomaly ν using the half-angle form
 * (numerically well-behaved near E = π).
 *
 *   tan(ν/2) = sqrt((1 + e) / (1 − e)) · tan(E/2)
 *
 * Source: Vallado §2.2, eq. 2-14.
 */
export function trueAnomalyFromEccentric(E_rad: number, e: number): number {
  const num = Math.sqrt(1 + e) * Math.sin(E_rad / 2);
  const den = Math.sqrt(1 - e) * Math.cos(E_rad / 2);
  return 2 * Math.atan2(num, den);
}
