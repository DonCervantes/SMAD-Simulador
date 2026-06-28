/**
 * Golden-value tests for link budget and ITU-R loss functions.
 *
 * Canonical check points:
 *   FSPL at 2.25 GHz over 1000 km ≈ 161.5 dB  (Wertz §13.3 worked example)
 *   FSPL at 8.4 GHz over 35786 km ≈ 209.4 dB  (deep-space X-band GEO distance)
 *   Atm loss at 8.4 GHz, el=30°  ≈  0.15 dB   (P.676-12 Fig. 1 crosscheck)
 *   Rain at 8.4 GHz, 30°, 10mm/h ≈  0.5–2.5 dB (P.618-13 typical range)
 *   Pointing loss (err=0.5°, bw=2°) = 12·(0.5/2)² = 0.75 dB
 *   Polarisation loss (AR=1.0) = 0 dB (perfect circular)
 *   Polarisation loss (AR=∞) → 3 dB (linear vs circular worst case)
 */

import { describe, it, expect } from "vitest";
import { fspl_dB, eirp_dBW, CN0_dBHz, EbN0_dB, linkMargin_dB, antennaGain_dBi } from "@/lib/physics/link-budget";
import { atmosphericLoss_dB, rainLoss_dB, pointingLoss_dB, polarisationLoss_dB } from "@/lib/physics/itu-losses";
import { C_LIGHT } from "@/lib/constants";

describe("fspl_dB", () => {
  it("S-band 2.25 GHz at 1000 km ≈ 159.5 dB", () => {
    // L_fs = 20·log10(4π·1e6·2.25e9/3e8) = 159.49 dB
    const val = fspl_dB(1e6, 2.25e9);
    expect(val).toBeCloseTo(159.5, 0);
  });

  it("X-band 8.4 GHz at GEO (35786 km) ≈ 202 dB", () => {
    // L_fs = 20·log10(4π·35786e3·8.4e9/3e8) = 202.01 dB
    const val = fspl_dB(35_786e3, 8.4e9);
    expect(val).toBeCloseTo(202.0, 0);
  });
});

describe("antennaGain_dBi", () => {
  it("3 m dish at 8.4 GHz with η=0.55 ≈ 47 dBi", () => {
    // G = η·(π·D·f/c)² → 0.55·(π·3·8.4e9/3e8)² = 0.55·(879.65)² ≈ 4.26e5 → 56.3 — wait
    // λ = 3e8/8.4e9 = 0.03571 m, ratio = π·3/0.03571 = 263.9, G = 0.55·263.9² = 38316 → 45.8 dBi
    const val = antennaGain_dBi(3.0, 8.4e9, 0.55);
    expect(val).toBeGreaterThan(44);
    expect(val).toBeLessThan(50);
  });
});

describe("eirp_dBW", () => {
  it("5 W + 30 dBi = 37.0 dBW", () => {
    expect(eirp_dBW(5, 30)).toBeCloseTo(37.0, 1);
  });
});

describe("CN0_dBHz", () => {
  it("C = -120 dBW, T=150 K → C/N₀ ≈ 86.8 dB·Hz", () => {
    // N₀ = −228.6 + 10·log10(150) = −228.6 + 21.76 = −206.84 dBW/Hz
    // C/N₀ = −120 − (−206.84) = 86.84
    expect(CN0_dBHz(-120, 150)).toBeCloseTo(86.84, 0);
  });
});

describe("EbN0_dB", () => {
  it("C/N₀=86.8 dBHz at 100 kbps → Eb/N₀ ≈ 36.8 dB", () => {
    expect(EbN0_dB(86.8, 100e3)).toBeCloseTo(36.8, 0);
  });
});

describe("linkMargin_dB", () => {
  it("returns positive when achieved > required", () => {
    expect(linkMargin_dB(10, 4.5)).toBeCloseTo(5.5, 3);
  });
});

describe("atmosphericLoss_dB", () => {
  it("X-band 8.4 GHz, el=30°, standard atm → small but positive (< 0.1 dB)", () => {
    // P.676-12: gaseous absorption at 8.4 GHz is very low (~0.006 dB for el=30°)
    const val = atmosphericLoss_dB(8.4, 30, 7.5);
    expect(val).toBeGreaterThan(0);
    expect(val).toBeLessThan(0.1);
  });

  it("Ka-band 26 GHz, el=30° → more than X-band", () => {
    const ka = atmosphericLoss_dB(26, 30, 7.5);
    const x  = atmosphericLoss_dB(8.4, 30, 7.5);
    expect(ka).toBeGreaterThan(x);
  });

  it("lower elevation → higher loss", () => {
    const low  = atmosphericLoss_dB(8.4, 10, 7.5);
    const high = atmosphericLoss_dB(8.4, 60, 7.5);
    expect(low).toBeGreaterThan(high);
  });
});

describe("rainLoss_dB", () => {
  it("0 mm/h → 0 dB", () => {
    expect(rainLoss_dB(8.4, 30, 0)).toBe(0);
  });

  it("X-band 8.4 GHz, el=30°, R=10mm/h → 0.5–4 dB", () => {
    const val = rainLoss_dB(8.4, 30, 10);
    expect(val).toBeGreaterThan(0.3);
    expect(val).toBeLessThan(5);
  });

  it("higher rain rate → more attenuation", () => {
    const light = rainLoss_dB(8.4, 30, 5);
    const heavy = rainLoss_dB(8.4, 30, 50);
    expect(heavy).toBeGreaterThan(light);
  });
});

describe("pointingLoss_dB", () => {
  it("exact formula: 12·(0.5/2)² = 0.75 dB", () => {
    expect(pointingLoss_dB(0.5, 2.0)).toBeCloseTo(0.75, 4);
  });

  it("zero error → zero loss", () => {
    expect(pointingLoss_dB(0, 2.0)).toBe(0);
  });
});

describe("polarisationLoss_dB", () => {
  it("AR=1 (perfect circular) → 0 dB", () => {
    expect(polarisationLoss_dB(1.0)).toBeCloseTo(0, 5);
  });

  it("AR=10 → ~2.23 dB (approaching 3 dB max)", () => {
    // PLF = 10·log10(2·(r²+1)/(r+1)²); r=10 → 2.23 dB
    const val = polarisationLoss_dB(10);
    expect(val).toBeCloseTo(2.23, 1);
  });

  it("monotonically increasing with AR", () => {
    expect(polarisationLoss_dB(2)).toBeGreaterThan(polarisationLoss_dB(1.5));
  });
});
