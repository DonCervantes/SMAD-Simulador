/**
 * Physical and astrodynamical constants used across the SMAD simulator.
 *
 * Every value carries an inline citation. Do not redefine these elsewhere —
 * import from this module. ESLint's no-magic-numbers rule depends on this
 * being the single source of truth.
 *
 * Naming convention: SI / metric units unless noted (orbital constants use km
 * because Vallado and Wertz SMAD use km for ranges, and double-precision floats
 * keep more digits in km than in m for typical orbital quantities).
 */

/**
 * Standard gravitational parameter of Earth (G·M_⊕).
 * Source: Vallado, *Fundamentals of Astrodynamics and Applications*, 4th ed.,
 * Appendix D-1, Table D-3. Consistent with EGM-96 / EGM2008.
 * Units: km³ / s².
 */
export const MU_EARTH_KM3_S2 = 398_600.4418;

/**
 * Equatorial radius of Earth (WGS-84).
 * Source: NIMA TR8350.2, "Department of Defense World Geodetic System 1984",
 * 3rd ed., 2000-01-03. Reproduced in IERS Conventions 2010.
 * Units: km.
 */
export const R_EARTH_KM = 6_378.137;

/**
 * Second zonal harmonic coefficient of Earth's geopotential (J2).
 * Source: Wertz, Everett & Puschell, *Space Mission Engineering: SMAD*, 2011,
 * §6.2; consistent with EGM2008 J_2 = 1.0826267 × 10⁻³ (5-digit truncation
 * used by Wertz). Dimensionless.
 */
export const J2_EARTH = 1.082_63e-3;

/**
 * Standard acceleration due to gravity, used in the Tsiolkovsky rocket equation
 * via specific impulse: Δv = I_sp · g0 · ln(m0/mf).
 * Source: 3rd General Conference on Weights and Measures (CGPM, 1901);
 * adopted by ISO 80000-3 and BIPM. Exact by definition.
 * Units: m / s².
 */
export const G0_M_S2 = 9.806_65;

/**
 * Boltzmann constant. Exact since the 2019 SI redefinition.
 * Source: CODATA 2018; SI Brochure, 9th ed., BIPM.
 * Units: J / K.
 */
export const K_BOLTZMANN_J_K = 1.380_649e-23;

/**
 * Boltzmann constant expressed in dBW / K / Hz, the form used in link budgets.
 * Equal to 10 · log10(K_BOLTZMANN_J_K) ≈ -228.5991 dBW/K/Hz; SMAD truncates to
 * -228.6.
 * Source: Wertz SMAD §13.3 ("Communications Architecture"), eq. for C/N₀.
 * Units: dBW / K / Hz.
 */
export const K_BOLTZMANN_DBW_K_HZ = -228.6;

/**
 * Speed of light in vacuum. Exact by SI definition (since 1983).
 * Source: 17th CGPM, 1983; SI Brochure.
 * Units: km / s.
 */
export const C_LIGHT_KM_S = 299_792.458;

/**
 * Earth's sidereal rotation rate, used for ECI ↔ ECEF transforms in ground-track
 * propagation. Equivalent to one revolution in 86 164.0905 s.
 * Source: IERS Conventions (2010), Technical Note No. 36, §1.
 * Units: rad / s.
 */
export const EARTH_ROTATION_RAD_S = 7.292_115_9e-5;

/**
 * Geosynchronous semi-major axis derived from Kepler's third law with the
 * Earth's sidereal day. Provided as a convenience constant so Module 2 can
 * reference GEO without recomputing each render.
 * a_geo = ( μ · T_sid² / (4π²) )^(1/3) ≈ 42 164.17 km
 * Source: derived from MU_EARTH_KM3_S2 and the IERS sidereal day.
 * Units: km.
 */
export const A_GEO_KM = 42_164.172;
