/**
 * Link budget core — free-space path loss, EIRP, G/T, C/N₀, Eb/N₀, margin.
 *
 * References
 *   Wertz SMAD (2011) §13.3 — link budget methodology
 *   Haykin & Moher — Communication Systems (5th ed.) §8
 */

import { C_LIGHT } from "@/lib/constants";

export type Band = "UHF" | "S" | "X" | "Ku" | "Ka";

/** Center frequencies in GHz per band (typical spacecraft allocations). */
export const BAND_FREQ_GHZ: Record<Band, number> = {
  UHF: 0.4,   // 400 MHz NOAA/amateur
  S: 2.25,    // 2.25 GHz downlink (Wertz SMAD §13-4)
  X: 8.4,     // 8.4 GHz deep-space / EO downlink
  Ku: 14.0,   // 14 GHz uplink / 12 GHz downlink
  Ka: 26.0,   // 26 GHz HTS
};

/**
 * Free-space path loss (dB).
 * L_fs = 20·log₁₀(4π·d·f / c)   [Wertz §13.3, eq. 13-15]
 *
 * @param d_m  slant range in metres
 * @param f_hz carrier frequency in Hz
 */
export function fspl_dB(d_m: number, f_hz: number): number {
  return 20 * Math.log10((4 * Math.PI * d_m * f_hz) / C_LIGHT);
}

/**
 * Received carrier power (dBW).
 * C = EIRP + G_r - L_fs - L_misc
 *
 * @param eirp_dBW  transmitter EIRP in dBW
 * @param G_r_dBi   receive antenna gain in dBi
 * @param L_fs_dB   free-space path loss (positive number, dB)
 * @param L_misc_dB sum of all additional losses (positive, dB)
 */
export function carrierPower_dBW(
  eirp_dBW: number,
  G_r_dBi: number,
  L_fs_dB: number,
  L_misc_dB: number,
): number {
  return eirp_dBW + G_r_dBi - L_fs_dB - L_misc_dB;
}

/**
 * C/N₀ (dB·Hz) — carrier-to-noise spectral density ratio.
 * C/N₀ = C - N₀  where  N₀ = k_B·T_sys (dBW/Hz)
 * T_sys in Kelvin, k_B = −228.6 dBW/(Hz·K)  [CODATA 2018 via Wertz §13.3]
 *
 * @param C_dBW     received carrier power (dBW)
 * @param T_sys_K   system noise temperature (K)
 */
export function CN0_dBHz(C_dBW: number, T_sys_K: number): number {
  const N0_dBW_Hz = -228.6 + 10 * Math.log10(T_sys_K); // kB·T in dBW/Hz
  return C_dBW - N0_dBW_Hz;
}

/**
 * Eb/N₀ (dB) from C/N₀ and data rate.
 * Eb/N₀ = C/N₀ - 10·log₁₀(R_b)   [Wertz §13.3, eq. 13-17]
 *
 * @param CN0_dBHz  C/N₀ in dB·Hz
 * @param Rb_bps    data rate in bit/s
 */
export function EbN0_dB(CN0_dBHz: number, Rb_bps: number): number {
  return CN0_dBHz - 10 * Math.log10(Rb_bps);
}

/**
 * Required Eb/N₀ for BPSK/QPSK with rate-1/2 convolutional FEC.
 * Values from Wertz SMAD Table 13-10.
 *
 * Modulation  BER 1e-5   BER 1e-6
 * BPSK        9.6 dB     10.5 dB
 * QPSK        9.6 dB     10.5 dB   (same Eb/N₀ vs BER curve)
 * BPSK+FEC    4.5 dB      5.2 dB
 * QPSK+FEC    4.5 dB      5.2 dB
 */
export type Modulation = "BPSK" | "QPSK" | "BPSK_FEC" | "QPSK_FEC";

export const REQ_EBN0_dB: Record<Modulation, { ber1e5: number; ber1e6: number }> = {
  BPSK:     { ber1e5: 9.6,  ber1e6: 10.5 },
  QPSK:     { ber1e5: 9.6,  ber1e6: 10.5 },
  BPSK_FEC: { ber1e5: 4.5,  ber1e6: 5.2  },
  QPSK_FEC: { ber1e5: 4.5,  ber1e6: 5.2  },
};

/**
 * Link margin (dB) = achieved Eb/N₀ − required Eb/N₀.
 * Green ≥ 3 dB, Yellow 0–3 dB, Red < 0 dB.  (Wertz §13.3)
 */
export function linkMargin_dB(
  EbN0_achieved: number,
  EbN0_required: number,
): number {
  return EbN0_achieved - EbN0_required;
}

/** Antenna gain from diameter and efficiency: G = η·(π·D·f/c)²  [Wertz §13.3] */
export function antennaGain_dBi(D_m: number, f_hz: number, eta = 0.55): number {
  const ratio = (Math.PI * D_m * f_hz) / C_LIGHT;
  return 10 * Math.log10(eta * ratio * ratio);
}

/** EIRP in dBW from transmit power (W) and antenna gain (dBi). */
export function eirp_dBW(P_tx_W: number, G_tx_dBi: number): number {
  return 10 * Math.log10(P_tx_W) + G_tx_dBi;
}
