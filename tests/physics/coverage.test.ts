import { describe, it, expect } from "vitest";
import {
  nadirAngle,
  centralAngle,
  slantRange,
  swathRadius,
  footprintArea,
} from "@/lib/physics/coverage";
import { semiMajorAxisFromPerigee } from "@/lib/physics/orbit";
import { R_EARTH_KM, A_GEO_KM } from "@/lib/constants";

const DEG = Math.PI / 180;

describe("coverage — Earth-satellite triangle geometry", () => {
  it("LEO @ 400 km, ε = 10°: λ ≈ 12.1° (sanity check vs. closed-form)", () => {
    // sin(η) = (R/r)·cos(ε) = (6378.137/6778.137)·cos 10° = 0.9268
    // η = 67.9°, λ = 90° − 10° − 67.9° = 12.1°.
    const r = semiMajorAxisFromPerigee(400, 0);
    const lambda = centralAngle(10 * DEG, r);
    expect(lambda / DEG).toBeGreaterThan(11.5);
    expect(lambda / DEG).toBeLessThan(12.5);
  });

  it("LEO @ 800 km, ε = 10°: λ ≈ 19° (matches Wertz §8.2 worked example)", () => {
    const r = semiMajorAxisFromPerigee(800, 0);
    const lambda = centralAngle(10 * DEG, r);
    expect(lambda / DEG).toBeGreaterThan(18);
    expect(lambda / DEG).toBeLessThan(20);
  });

  it("nadir angle ≤ horizon angle = arcsin(R_⊕/r) for ε ≥ 0", () => {
    const r = semiMajorAxisFromPerigee(800, 0);
    const horizon = Math.asin(R_EARTH_KM / r);
    expect(nadirAngle(0, r)).toBeCloseTo(horizon, 9);
    expect(nadirAngle(10 * DEG, r)).toBeLessThan(horizon);
  });

  it("slant range at ε = 90° (overhead) equals altitude", () => {
    const r = semiMajorAxisFromPerigee(600, 0);
    const altitude = r - R_EARTH_KM;
    // At ε = 90°, target is sub-satellite; ρ → altitude (taking limit).
    // Implementation: sin(η)/sin(λ) with η → 0, λ → 0 ⇒ use ε just below 90°.
    const rho = slantRange((90 - 1e-4) * DEG, r);
    expect(rho).toBeCloseTo(altitude, 0);
  });

  it("GEO swath radius @ ε = 10°: between 6_000 km and 9_000 km", () => {
    const swath = swathRadius(10 * DEG, A_GEO_KM);
    expect(swath).toBeGreaterThan(6_000);
    expect(swath).toBeLessThan(9_000);
  });

  it("footprint area equals 2π R²(1 − cos λ) and is positive", () => {
    const r = semiMajorAxisFromPerigee(400, 0);
    const lambda = centralAngle(5 * DEG, r);
    const expected = 2 * Math.PI * R_EARTH_KM * R_EARTH_KM * (1 - Math.cos(lambda));
    expect(footprintArea(5 * DEG, r)).toBeCloseTo(expected, 3);
    expect(footprintArea(5 * DEG, r)).toBeGreaterThan(0);
  });
});
