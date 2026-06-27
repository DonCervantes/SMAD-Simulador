import { describe, it, expect } from "vitest";
import {
  eclipseFraction,
  eclipseDurationSeconds,
  criticalBeta,
} from "@/lib/physics/eclipse";
import {
  semiMajorAxisFromPerigee,
  orbitalPeriod,
} from "@/lib/physics/orbit";

const DEG = Math.PI / 180;

describe("eclipse — cylindrical shadow", () => {
  it("ISS at 400 km, β = 0: f_eclipse ≈ 38–40%", () => {
    const a = semiMajorAxisFromPerigee(400, 0);
    const f = eclipseFraction(a, 0);
    expect(f).toBeGreaterThan(0.38);
    expect(f).toBeLessThan(0.40);
  });

  it("ISS at 400 km, β = 0: eclipse duration ≈ 35–37 min", () => {
    const a = semiMajorAxisFromPerigee(400, 0);
    const T = orbitalPeriod(a);
    const dt = eclipseDurationSeconds(a, 0, T);
    expect(dt / 60).toBeGreaterThan(35);
    expect(dt / 60).toBeLessThan(37);
  });

  it("returns 0 when β exceeds the critical angle (full-sun orbit)", () => {
    const a = semiMajorAxisFromPerigee(400, 0);
    const beta_crit = criticalBeta(a);
    const beta_above = beta_crit + 1 * DEG;
    expect(eclipseFraction(a, beta_above)).toBe(0);
  });

  it("monotonically decreases as |β| grows toward β_crit", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const samples = [0, 10, 20, 30, 40, 50, 60].map(
      (deg) => eclipseFraction(a, deg * DEG),
    );
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1] + 1e-9);
    }
  });

  it("GEO at β = 0 (equinox): f ≈ 4.8% (≈ 69 min of a 24 h orbit)", () => {
    // At GEO, β_crit ≈ arcsin(R_⊕/a_GEO) ≈ 8.7°.
    // arccos(sqrt(a²−R²)/a)/π = arccos(0.9885)/π ≈ 0.0481.
    // This matches the often-cited "maximum GEO eclipse ≈ 70 min" at equinox.
    const a = 42_164;
    const f = eclipseFraction(a, 0);
    expect(f).toBeGreaterThan(0.045);
    expect(f).toBeLessThan(0.052);
  });
});
