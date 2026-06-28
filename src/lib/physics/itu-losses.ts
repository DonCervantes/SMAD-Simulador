/**
 * ITU-R atmospheric and rain attenuation models.
 *
 * References
 *   ITU-R P.676-12 (2019) — Attenuation by atmospheric gases
 *   ITU-R P.618-13 (2017) — Propagation data for Earth-space paths
 *   ITU-R P.838-3 (2005)  — Specific attenuation model for rain
 */

// ---------------------------------------------------------------------------
// ITU-R P.676-12 §1 — simplified gaseous absorption (oxygen + water vapour)
// Valid 1–350 GHz for elevation angles > ~5°.
// ---------------------------------------------------------------------------

/**
 * Specific oxygen attenuation γ_O (dB/km) at sea level.
 * Curve-fitted from ITU-R P.676-12 Fig. 1 — accurate to ~15% below 57 GHz.
 *
 * @param f_GHz  frequency in GHz (1–100)
 */
function oxygenAttenuation_dBperKm(f_GHz: number): number {
  // ITU-R P.676-12 eq. (1) simplified form for f < 57 GHz (below O₂ band)
  const f = f_GHz;
  const f2 = f * f;
  return (
    (7.2e-3 * f2) /
    ((f - 57) ** 2 + 0.9) +
    (6.09e-3) / (f2 + 0.227) +
    (4.81e-3) / ((f - 57) ** 2 + 1.5)
  );
}

/**
 * Specific water-vapour attenuation γ_W (dB/km).
 * Simplified fit valid 1–100 GHz (excludes 22 GHz resonance peak detail).
 * ITU-R P.676-12 eq. (1b).
 *
 * @param f_GHz         frequency (GHz)
 * @param rho_gm3       water-vapour density (g/m³), default 7.5 (ITU midlat)
 */
function waterVapourAttenuation_dBperKm(f_GHz: number, rho_gm3 = 7.5): number {
  const f = f_GHz;
  const f2 = f * f;
  // resonances at 22.235 GHz and 183.3 GHz
  const g1 = 3.98 / ((f - 22.235) ** 2 + 9.42);
  const g2 = 11.96 / ((f - 183.31) ** 2 + 11.14);
  return (rho_gm3 / 7.5) * (0.05 + 0.0021 * rho_gm3 + g1 + g2) * f2 * 1e-4;
}

/**
 * Total gaseous attenuation on an Earth-space path (dB).
 * Uses equivalent height approximation: h_O = 6 km, h_W = 2 km (P.676-12 §2.2).
 *
 * @param f_GHz         frequency (GHz)
 * @param el_deg        elevation angle to satellite (degrees)
 * @param rho_gm3       water-vapour density at surface (g/m³)
 */
export function atmosphericLoss_dB(
  f_GHz: number,
  el_deg: number,
  rho_gm3 = 7.5,
): number {
  const sinEl = Math.sin((el_deg * Math.PI) / 180);
  const gamma_O = oxygenAttenuation_dBperKm(f_GHz);
  const gamma_W = waterVapourAttenuation_dBperKm(f_GHz, rho_gm3);
  const A_O = (gamma_O * 6.0) / sinEl;   // h_O = 6 km  (P.676-12 §2.2)
  const A_W = (gamma_W * 2.0) / sinEl;   // h_W = 2 km
  return A_O + A_W;
}

// ---------------------------------------------------------------------------
// ITU-R P.618-13 §2.2 — rain attenuation (simplified for engineering use)
// ---------------------------------------------------------------------------

/**
 * Specific rain attenuation γ_R (dB/km) per ITU-R P.838-3.
 * γ_R = k · R^α  where k and α depend on frequency and polarisation.
 * Horizontal polarisation coefficients used (conservative / worst-case).
 *
 * Coefficient table: P.838-3 Table 1 (selected frequencies).
 */
const RAIN_COEFF: Array<{ f: number; kH: number; alphaH: number }> = [
  { f: 0.4,  kH: 1.59e-5, alphaH: 0.953 },
  { f: 1.0,  kH: 1.52e-4, alphaH: 0.935 },
  { f: 2.0,  kH: 9.96e-4, alphaH: 0.888 },
  { f: 4.0,  kH: 5.86e-3, alphaH: 0.828 },
  { f: 8.0,  kH: 2.53e-2, alphaH: 0.765 },
  { f: 10.0, kH: 4.12e-2, alphaH: 0.745 },
  { f: 14.0, kH: 9.67e-2, alphaH: 0.734 },
  { f: 20.0, kH: 2.22e-1, alphaH: 0.730 },
  { f: 26.0, kH: 3.96e-1, alphaH: 0.738 },
  { f: 30.0, kH: 5.87e-1, alphaH: 0.748 },
];

function interpolateRainCoeff(f_GHz: number): { k: number; alpha: number } {
  const tbl = RAIN_COEFF;
  if (f_GHz <= tbl[0].f) return { k: tbl[0].kH, alpha: tbl[0].alphaH };
  if (f_GHz >= tbl[tbl.length - 1].f)
    return { k: tbl[tbl.length - 1].kH, alpha: tbl[tbl.length - 1].alphaH };
  for (let i = 0; i < tbl.length - 1; i++) {
    if (f_GHz >= tbl[i].f && f_GHz <= tbl[i + 1].f) {
      const t = (f_GHz - tbl[i].f) / (tbl[i + 1].f - tbl[i].f);
      return {
        k: tbl[i].kH + t * (tbl[i + 1].kH - tbl[i].kH),
        alpha: tbl[i].alphaH + t * (tbl[i + 1].alphaH - tbl[i].alphaH),
      };
    }
  }
  return { k: tbl[0].kH, alpha: tbl[0].alphaH };
}

/**
 * Rain attenuation on an Earth-space path (dB).
 * Uses the P.618-13 §2.2.1 effective path length approach.
 *
 * @param f_GHz     frequency (GHz)
 * @param el_deg    elevation angle (degrees)
 * @param R_mmh     surface rain rate (mm/h) at the 0.01% exceedance level
 * @param h_rain_km rain height above MSL (km), default 3.0 (ITU midlat)
 * @param lat_deg   station latitude (degrees) — used to cap effective height
 */
export function rainLoss_dB(
  f_GHz: number,
  el_deg: number,
  R_mmh: number,
  h_rain_km = 3.0,
  lat_deg = 25,
): number {
  if (R_mmh <= 0) return 0;

  const el_rad = (el_deg * Math.PI) / 180;
  const { k, alpha } = interpolateRainCoeff(f_GHz);
  const gamma_R = k * Math.pow(R_mmh, alpha); // dB/km  (P.838-3 eq. 1)

  // Slant-path length through rain layer  (P.618-13 eq. 5)
  const h_s = 0.0; // station height above MSL (km) — assume 0
  const L_S = (h_rain_km - h_s) / Math.sin(el_rad); // km

  // Horizontal projection
  const L_G = L_S * Math.cos(el_rad);

  // Horizontal reduction factor r₀.₀₁  (P.618-13 eq. 6)
  const r = 1 / (1 + 0.78 * Math.sqrt((L_G * gamma_R) / f_GHz) - 0.38 * (1 - Math.exp(-2 * L_G)));

  // Adjusted slant length and angle (P.618-13 eq. 7–9)
  const xi = Math.atan((h_rain_km - h_s) / (L_G * r)) * (180 / Math.PI);
  const L_E =
    xi > el_deg
      ? (L_G * r) / Math.cos(el_rad)
      : (h_rain_km - h_s) / Math.sin(el_rad);

  // Vertical adjustment factor v₀.₀₁  (P.618-13 eq. 10)
  const chi = Math.abs(lat_deg) < 36 ? 36 - Math.abs(lat_deg) : 0;
  const v =
    1 /
    (1 +
      Math.sqrt(Math.sin(el_rad)) *
        (31 * (1 - Math.exp(-(el_deg / (1 + chi)))) * Math.sqrt(L_E * gamma_R) / f_GHz ** 2 - 0.45));

  const L_eff = L_E * v;
  return gamma_R * L_eff; // dB  (P.618-13 eq. 12)
}

// ---------------------------------------------------------------------------
// Pointing and polarisation losses
// ---------------------------------------------------------------------------

/**
 * Antenna pointing loss (dB).
 * For a Gaussian beam: L_pt = 12·(θ_e / θ_3dB)²   [Wertz §13.3 eq. 13-20]
 *
 * @param theta_e_deg    pointing error (degrees)
 * @param theta_3dB_deg  3-dB beamwidth (degrees)
 */
export function pointingLoss_dB(
  theta_e_deg: number,
  theta_3dB_deg: number,
): number {
  if (theta_3dB_deg <= 0) return 0;
  return 12 * (theta_e_deg / theta_3dB_deg) ** 2;
}

/**
 * Polarisation mismatch loss (dB) from axial ratio.
 * L_pol = 10·log₁₀[ (r²+1)² / (4r²) ]   where r = axial ratio (linear, ≥1)
 * [Balanis — Antenna Theory eq. 2-71]
 *
 * @param axialRatio  linear axial ratio (1 = perfect circular, ∞ = linear)
 */
export function polarisationLoss_dB(axialRatio: number): number {
  // PLF = (r+1)² / (2·(r²+1))   Balanis Antenna Theory eq. 2-71 (worst-case tilt)
  // Loss → 0 dB as r→1 (perfect circular); → 3 dB as r→∞ (linear mismatch)
  const r = Math.max(1, axialRatio);
  return 10 * Math.log10((2 * (r * r + 1)) / ((r + 1) * (r + 1)));
}

/**
 * 3-dB beamwidth approximation for a circular aperture:
 * θ_3dB ≈ 70·λ/D  (degrees)  [Wertz §13.3]
 */
export function beamwidth3dB_deg(D_m: number, f_hz: number): number {
  const lambda = 3e8 / f_hz;
  return (70 * lambda) / D_m;
}
