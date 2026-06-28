/**
 * Payload resolution — diffraction limit and detector-pitch GSD.
 *
 * References
 *   Wertz SMAD (2011) §9.1 — EO payload sizing
 *   Rayleigh criterion: angular resolution θ = 1.22 λ / D
 */

/**
 * Rayleigh-limited GSD (m) — minimum resolvable ground sample distance.
 * GSD_diff = 1.22 · λ · h / D   [Wertz §9.1 eq. 9-4]
 *
 * @param lambda_m  wavelength (m)
 * @param h_m       orbital altitude (m)
 * @param D_m       aperture diameter (m)
 */
export function gsdDiffraction_m(
  lambda_m: number,
  h_m: number,
  D_m: number,
): number {
  return (1.22 * lambda_m * h_m) / D_m;
}

/**
 * Detector-pitch-limited GSD (m) — pixel size projected to ground.
 * GSD_pixel = p · h / f   where f = focal length [Wertz §9.1]
 *
 * @param p_m   detector pixel pitch (m)
 * @param h_m   orbital altitude (m)
 * @param f_m   focal length (m)
 */
export function gsdPixel_m(p_m: number, h_m: number, f_m: number): number {
  return (p_m * h_m) / f_m;
}

/**
 * Practical GSD — worst of diffraction and detector limits.
 * System-limited resolution cannot be better than either constraint.
 */
export function gsdPractical_m(
  gsdDiff: number,
  gsdPixel: number,
): number {
  return Math.max(gsdDiff, gsdPixel);
}

/**
 * Maximum altitude (m) to achieve a target GSD with given aperture.
 * Inverts GSD_diff = 1.22·λ·h/D → h_max = GSD·D / (1.22·λ)
 *
 * @param gsd_m     required GSD (m)
 * @param lambda_m  wavelength (m)
 * @param D_m       aperture diameter (m)
 */
export function maxAltitudeForGSD_m(
  gsd_m: number,
  lambda_m: number,
  D_m: number,
): number {
  return (gsd_m * D_m) / (1.22 * lambda_m);
}

/**
 * F-number (focal ratio) = f / D.
 */
export function fNumber(f_m: number, D_m: number): number {
  return f_m / D_m;
}

/** Ground swath width (m) from half-angle field of view. */
export function swathWidth_m(h_m: number, fov_half_deg: number): number {
  return 2 * h_m * Math.tan((fov_half_deg * Math.PI) / 180);
}

/**
 * Number of detector pixels across the swath.
 * N_pix = swath / GSD_pixel
 */
export function pixelsAcrossSwath(swath_m: number, gsdPixel: number): number {
  return swath_m / gsdPixel;
}
