/**
 * Tsiolkovsky rocket equation and its inversions for sizing propellant.
 *
 *     Δv = I_sp · g₀ · ln(m₀ / m_f)
 *
 * with m₀ the wet (initial) mass, m_f the dry (final) mass, I_sp in seconds
 * and g₀ the SI standard gravity (9.80665 m/s²).
 *
 * Sources:
 *   - Wertz SMAD §17.4 ("Propulsion Sizing").
 *   - Curtis, *Orbital Mechanics for Engineering Students*, §6.5.
 */

import { G0_M_S2 } from "@/lib/constants";

/**
 * Total Δv delivered by a propulsion stage given its wet and dry masses.
 *
 * @param m0_kg wet (initial) mass, kg
 * @param mf_kg dry (final) mass, kg
 * @param Isp_s specific impulse, seconds
 * @returns Δv in m/s
 */
export function deltaVFromMasses(m0_kg: number, mf_kg: number, Isp_s: number): number {
  return Isp_s * G0_M_S2 * Math.log(m0_kg / mf_kg);
}

/**
 * Propellant mass required to deliver a Δv from a known dry mass at a given
 * Isp.
 *
 *     m_prop = m_dry · ( exp(Δv / (I_sp · g₀)) − 1 )
 *
 * @param deltaV_m_s required Δv in m/s (NOT km/s)
 * @param Isp_s specific impulse, seconds
 * @param mDry_kg dry mass that must be accelerated by the burn, kg
 * @returns propellant mass, kg
 */
export function propellantMass(
  deltaV_m_s: number,
  Isp_s: number,
  mDry_kg: number,
): number {
  const massRatio = Math.exp(deltaV_m_s / (Isp_s * G0_M_S2));
  return mDry_kg * (massRatio - 1);
}

/** Mass ratio m₀/m_f for a given Δv and Isp. */
export function massRatio(deltaV_m_s: number, Isp_s: number): number {
  return Math.exp(deltaV_m_s / (Isp_s * G0_M_S2));
}

/**
 * Effective exhaust velocity v_e = Isp · g₀, in m/s. Useful as an alternative
 * way of expressing propulsion performance.
 */
export function exhaustVelocity(Isp_s: number): number {
  return Isp_s * G0_M_S2;
}
