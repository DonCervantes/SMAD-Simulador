import { describe, it, expect } from "vitest";
import {
  semiMajorAxisFromPerigee,
  perigeeRadius,
  apogeeRadius,
  visViva,
  orbitalPeriod,
  meanMotion,
  specificEnergy,
  semiLatusRectum,
} from "@/lib/physics/orbit";
import { A_GEO_KM, MU_EARTH_KM3_S2, R_EARTH_KM } from "@/lib/constants";

// Golden-value tests for canonical orbits. All references taken from Vallado
// 4th ed. appendices or directly recomputed from definitions; absolute tols
// chosen to reflect the precision of the truncated constants (e.g. R_⊕ to
// 6_378.137 km).

describe("orbit — circular ISS-like LEO at 400 km altitude", () => {
  const a = semiMajorAxisFromPerigee(400, 0);

  it("a = R_⊕ + h = 6778.137 km", () => {
    expect(a).toBeCloseTo(6_778.137, 3);
  });

  it("v ≈ 7.668 km/s (Vallado example 7-6)", () => {
    const v = visViva(a, a);
    expect(v).toBeCloseTo(7.6685, 3);
  });

  it("T ≈ 92.56 min for an exactly-400-km circular orbit", () => {
    // ISS' often-quoted 92.7 min corresponds to its mean altitude (~408 km),
    // not 400 km. We test the value our inputs actually imply.
    const T = orbitalPeriod(a);
    expect(T / 60).toBeCloseTo(92.56, 1);
  });

  it("specific energy is negative for a bound orbit", () => {
    expect(specificEnergy(a)).toBeLessThan(0);
  });
});

describe("orbit — geostationary orbit (GEO)", () => {
  it("v(GEO) ≈ 3.0747 km/s", () => {
    const v = visViva(A_GEO_KM, A_GEO_KM);
    expect(v).toBeCloseTo(3.0747, 3);
  });

  it("n(GEO) ≈ ω_⊕ (one revolution per sidereal day)", () => {
    const n = meanMotion(A_GEO_KM);
    // ω_⊕ = 7.2921159e-5 rad/s
    expect(n).toBeCloseTo(7.2921159e-5, 9);
  });
});

describe("orbit — elliptic orbit (Molniya-like)", () => {
  // Real Molniya: h_p ≈ 600 km, h_a ≈ 39_750 km. Solving the perigee/apogee
  // system: e = (r_a − r_p)/(r_a + r_p) = 0.7372.
  const e = 0.7372;
  const a = semiMajorAxisFromPerigee(600, e);
  const rp = perigeeRadius(a, e);
  const ra = apogeeRadius(a, e);

  it("r_p reconstructed from a and e equals R_⊕ + 600 km", () => {
    expect(rp).toBeCloseTo(R_EARTH_KM + 600, 3);
  });

  it("apogee altitude ≈ 39_750 km for the chosen elements", () => {
    expect(ra - R_EARTH_KM).toBeCloseTo(39_750, -2); // within 100 km
  });

  it("v_perigee > v_apogee (energy conservation)", () => {
    const vp = visViva(rp, a);
    const va = visViva(ra, a);
    expect(vp).toBeGreaterThan(va);
  });

  it("semi-latus rectum p = a(1 − e²) is positive and < a", () => {
    const p = semiLatusRectum(a, e);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(a);
  });
});

describe("orbit — sanity / dimensional checks", () => {
  it("mean motion equals 2π / period", () => {
    const a = 7_000;
    const n = meanMotion(a);
    const T = orbitalPeriod(a);
    expect(n * T).toBeCloseTo(2 * Math.PI, 6);
  });

  it("specific energy equals (v²/2 − μ/r) at perigee of any orbit", () => {
    const a = 10_000;
    const e = 0.3;
    const rp = perigeeRadius(a, e);
    const vp = visViva(rp, a);
    const energyFromState = (vp * vp) / 2 - MU_EARTH_KM3_S2 / rp;
    expect(energyFromState).toBeCloseTo(specificEnergy(a), 6);
  });
});
