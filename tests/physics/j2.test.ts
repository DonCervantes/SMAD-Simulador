import { describe, it, expect } from "vitest";
import {
  nodalRegressionRate,
  argPerigeeRate,
  radPerSecToDegPerDay,
} from "@/lib/physics/j2";
import { semiMajorAxisFromPerigee } from "@/lib/physics/orbit";

const DEG = Math.PI / 180;

describe("J2 — nodal regression rate", () => {
  it("is negative for a prograde LEO (i = 51.6°, ISS)", () => {
    const a = semiMajorAxisFromPerigee(400, 0);
    const i = 51.6 * DEG;
    const rate = nodalRegressionRate(a, 0, i);
    expect(rate).toBeLessThan(0);
    // Should be on the order of −5°/day for ISS-like orbit.
    const degPerDay = radPerSecToDegPerDay(rate);
    expect(degPerDay).toBeGreaterThan(-6);
    expect(degPerDay).toBeLessThan(-4);
  });

  it("is zero at i = 90° (polar)", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const rate = nodalRegressionRate(a, 0, Math.PI / 2);
    expect(Math.abs(rate)).toBeLessThan(1e-15);
  });

  it("is positive (eastward Ω drift) for retrograde orbits", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const i = 98 * DEG; // sun-synchronous-ish
    expect(nodalRegressionRate(a, 0, i)).toBeGreaterThan(0);
  });

  it("matches the sun-synchronous condition at i ≈ 98° (h = 800 km)", () => {
    // SSO condition: dΩ/dt = 2π / (365.25 d · 86400 s) ≈ 1.991e-7 rad/s.
    const a = semiMajorAxisFromPerigee(800, 0);
    const target = (2 * Math.PI) / (365.25 * 86_400);
    // Search i in [97°, 99°]; the root should lie near 98.6° at h = 800 km.
    let bestInc = 0;
    let bestErr = Infinity;
    for (let degInc = 96; degInc <= 100; degInc += 0.05) {
      const rate = nodalRegressionRate(a, 0, degInc * DEG);
      const err = Math.abs(rate - target);
      if (err < bestErr) {
        bestErr = err;
        bestInc = degInc;
      }
    }
    expect(bestInc).toBeGreaterThan(98);
    expect(bestInc).toBeLessThan(99);
  });
});

describe("J2 — argument-of-perigee rate", () => {
  it("vanishes at the critical inclination i ≈ 63.4°", () => {
    const a = semiMajorAxisFromPerigee(1_000, 0.01);
    // cos²(i_crit) = 1/5 ⇒ i_crit = arccos(1/√5) ≈ 63.4349°.
    const i_crit = Math.acos(1 / Math.sqrt(5));
    expect(Math.abs(argPerigeeRate(a, 0.01, i_crit))).toBeLessThan(1e-15);
  });
});
