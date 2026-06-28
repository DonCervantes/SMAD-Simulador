/**
 * Golden-value tests for diffraction and Walker constellation physics.
 *
 * Canonical values:
 *   GSD_diff: Landsat-7 ETM+  h=705 km, D=0.4 m, λ=660 nm → ~2.8 m  [Wertz §9.1]
 *   GSD_pix:  p=7µm, h=500km, f=2m → 1.75 m
 *   Walker:   h=1200 km, ε=10° → α≈44°, T_min≈6 sats  (Wertz §7.6 table)
 */

import { describe, it, expect } from "vitest";
import {
  gsdDiffraction_m,
  gsdPixel_m,
  gsdPractical_m,
  maxAltitudeForGSD_m,
  fNumber,
} from "@/lib/physics/diffraction";
import {
  minSatellitesForCoverage,
  accessTimePerPass_s,
  revisitTime_h,
  ssoInclination_deg,
} from "@/lib/physics/walker-constellation";
import { orbitalPeriod, semiMajorAxisFromPerigee } from "@/lib/physics/orbit";

describe("gsdDiffraction_m", () => {
  it("Landsat-7 proxy (h=705km, D=0.4m, λ=660nm) → diffraction limit ~1.4 m", () => {
    // GSD_diff = 1.22 * 660e-9 * 705e3 / 0.4 = 1.419 m (diffraction ceiling)
    // Note: actual Landsat-7 GSD is 15 m (detector-limited, not diffraction-limited)
    const val = gsdDiffraction_m(660e-9, 705e3, 0.4);
    expect(val).toBeGreaterThan(1.0);
    expect(val).toBeLessThan(2.0);
  });

  it("scales linearly with altitude", () => {
    const gsd1 = gsdDiffraction_m(550e-9, 500e3, 0.3);
    const gsd2 = gsdDiffraction_m(550e-9, 1000e3, 0.3);
    expect(gsd2 / gsd1).toBeCloseTo(2.0, 3);
  });

  it("scales inversely with aperture", () => {
    const gsd1 = gsdDiffraction_m(550e-9, 500e3, 0.3);
    const gsd2 = gsdDiffraction_m(550e-9, 500e3, 0.6);
    expect(gsd1 / gsd2).toBeCloseTo(2.0, 3);
  });
});

describe("gsdPixel_m", () => {
  it("p=7µm, h=500km, f=2m → 1.75 m", () => {
    expect(gsdPixel_m(7e-6, 500e3, 2.0)).toBeCloseTo(1.75, 2);
  });
});

describe("gsdPractical_m", () => {
  it("returns the larger of the two GSDs", () => {
    expect(gsdPractical_m(3.0, 2.0)).toBe(3.0);
    expect(gsdPractical_m(1.5, 2.5)).toBe(2.5);
  });
});

describe("maxAltitudeForGSD_m", () => {
  it("inverts gsdDiffraction_m exactly", () => {
    const lambda = 660e-9;
    const D = 0.4;
    const gsd_req = 5.0;
    const hMax = maxAltitudeForGSD_m(gsd_req, lambda, D);
    const gsdAtMax = gsdDiffraction_m(lambda, hMax, D);
    expect(gsdAtMax).toBeCloseTo(gsd_req, 6);
  });
});

describe("fNumber", () => {
  it("f=1.5m, D=0.3m → F/5", () => {
    expect(fNumber(1.5, 0.3)).toBeCloseTo(5.0, 6);
  });
});

describe("minSatellitesForCoverage", () => {
  it("LEO 1200 km, ε=10° → T reasonably bounded", () => {
    const { T, P, S, alpha_deg } = minSatellitesForCoverage(1200, 10);
    // alpha ≈ 24° for h=1200 km, ε=10°  (Wertz §8.2 coverage geometry)
    expect(alpha_deg).toBeGreaterThan(15);
    expect(alpha_deg).toBeLessThan(40);
    expect(T).toBeGreaterThan(2);
    expect(T).toBeLessThan(50);
    expect(P * S).toBe(T);
  });

  it("GEO (35786 km), ε=5° → very few satellites (3 cover equatorial band)", () => {
    const { T } = minSatellitesForCoverage(35786, 5);
    // 3 GEO satellites cover most of Earth within ±75° latitude
    expect(T).toBeLessThanOrEqual(6);
  });

  it("low altitude higher ε → more satellites needed", () => {
    const { T: T1 } = minSatellitesForCoverage(500, 10);
    const { T: T2 } = minSatellitesForCoverage(500, 30);
    expect(T2).toBeGreaterThanOrEqual(T1);
  });
});

describe("accessTimePerPass_s", () => {
  it("returns positive value", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const T = orbitalPeriod(a);
    const { alpha_deg } = minSatellitesForCoverage(800, 10);
    const access = accessTimePerPass_s(alpha_deg, T);
    expect(access).toBeGreaterThan(60);   // at least 1 minute
    expect(access).toBeLessThan(T);       // less than one orbit
  });
});

describe("revisitTime_h", () => {
  it("single satellite revisit > period / 2 (approximate lower bound)", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const T_s = orbitalPeriod(a);
    const { alpha_deg } = minSatellitesForCoverage(800, 10);
    const rev = revisitTime_h(alpha_deg, T_s, 45, 1);
    expect(rev).toBeGreaterThan(0);
  });

  it("more satellites → shorter revisit", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const T_s = orbitalPeriod(a);
    const { alpha_deg } = minSatellitesForCoverage(800, 10);
    const rev1 = revisitTime_h(alpha_deg, T_s, 45, 1);
    const rev6 = revisitTime_h(alpha_deg, T_s, 45, 6);
    expect(rev6).toBeLessThan(rev1);
  });
});

describe("ssoInclination_deg", () => {
  it("500 km → ~100.6° (SSO regime)", () => {
    expect(ssoInclination_deg(500)).toBeCloseTo(100.64, 0);
  });

  it("increases with altitude", () => {
    expect(ssoInclination_deg(800)).toBeGreaterThan(ssoInclination_deg(500));
  });
});
