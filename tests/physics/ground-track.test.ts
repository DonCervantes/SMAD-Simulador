import { describe, it, expect } from "vitest";
import {
  computeGroundTrack,
  type OrbitElements,
} from "@/lib/physics/ground-track";
import {
  semiMajorAxisFromPerigee,
  orbitalPeriod,
} from "@/lib/physics/orbit";
import { A_GEO_KM } from "@/lib/constants";

const DEG = Math.PI / 180;

function makeElements(
  overrides: Partial<OrbitElements> & Pick<OrbitElements, "a_km">,
): OrbitElements {
  return {
    e: 0,
    i_rad: 0,
    raan0_rad: 0,
    argPerigee_rad: 0,
    M0_rad: 0,
    ...overrides,
  };
}

describe("ground-track — propagator", () => {
  it("equatorial circular orbit: latitude is 0 at every sample", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const T = orbitalPeriod(a);
    const samples = computeGroundTrack(
      makeElements({ a_km: a, i_rad: 0 }),
      T,
      40,
    );
    for (const p of samples) {
      expect(Math.abs(p.lat_deg)).toBeLessThan(1e-9);
    }
  });

  it("max |latitude| equals inclination for a circular orbit", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const T = orbitalPeriod(a);
    const inclinations = [10, 30, 51.6, 80];
    for (const incDeg of inclinations) {
      const samples = computeGroundTrack(
        makeElements({ a_km: a, i_rad: incDeg * DEG }),
        T,
        400,
      );
      const maxLat = samples.reduce(
        (acc, p) => Math.max(acc, Math.abs(p.lat_deg)),
        0,
      );
      expect(maxLat).toBeGreaterThan(incDeg - 0.2);
      expect(maxLat).toBeLessThan(incDeg + 0.05);
    }
  });

  it("GEO (i = 0): sub-satellite longitude drifts by ≤ 1° over one sidereal day", () => {
    const samples = computeGroundTrack(
      makeElements({ a_km: A_GEO_KM, i_rad: 0 }),
      86_164,
      48,
    );
    const lonRange =
      Math.max(...samples.map((p) => p.lon_deg)) -
      Math.min(...samples.map((p) => p.lon_deg));
    expect(lonRange).toBeLessThan(1);
  });

  it("polar orbit (i = 90°) reaches |lat| ≈ 90° within a quarter period", () => {
    const a = semiMajorAxisFromPerigee(800, 0);
    const T = orbitalPeriod(a);
    const samples = computeGroundTrack(
      makeElements({ a_km: a, i_rad: 90 * DEG }),
      T / 4,
      30,
    );
    const maxLat = samples.reduce(
      (acc, p) => Math.max(acc, Math.abs(p.lat_deg)),
      0,
    );
    expect(maxLat).toBeGreaterThan(89);
  });

  it("two-orbit ground track has its second pass shifted westward by ≈ 22.5° per orbit at LEO", () => {
    // For a ~95-min LEO, Earth rotates by 95·15°/60 ≈ 23.7° between passes;
    // J2 drift accounts for a small extra offset. We test the order of magnitude.
    const a = semiMajorAxisFromPerigee(800, 0);
    const T = orbitalPeriod(a);
    const samples = computeGroundTrack(
      makeElements({ a_km: a, i_rad: 51.6 * DEG }),
      2 * T,
      200,
    );
    // Ascending-node longitudes: pick samples where lat crosses 0 going +.
    const ascending: number[] = [];
    for (let k = 1; k < samples.length; k++) {
      if (samples[k - 1].lat_deg < 0 && samples[k].lat_deg >= 0) {
        ascending.push(samples[k].lon_deg);
      }
    }
    expect(ascending.length).toBeGreaterThanOrEqual(2);
    // Difference between consecutive ascending nodes, wrapped to [−180, 180].
    let delta = ascending[1] - ascending[0];
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    // Westward shift: delta should be negative and in [-30°, -15°].
    expect(delta).toBeLessThan(-15);
    expect(delta).toBeGreaterThan(-30);
  });
});
