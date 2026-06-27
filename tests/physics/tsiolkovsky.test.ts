import { describe, it, expect } from "vitest";
import {
  deltaVFromMasses,
  propellantMass,
  massRatio,
  exhaustVelocity,
} from "@/lib/physics/tsiolkovsky";
import { planeChangeDeltaV } from "@/lib/physics/plane-change";

const DEG = Math.PI / 180;

describe("tsiolkovsky — rocket equation", () => {
  it("Δv = 0 when m₀ = m_f", () => {
    expect(deltaVFromMasses(1_000, 1_000, 300)).toBe(0);
  });

  it("Δv inversion: m_prop(Δv) then Δv(m₀, m_f) round-trips", () => {
    const Isp = 300;
    const mDry = 1_000;
    const dv = 3_000; // m/s
    const mProp = propellantMass(dv, Isp, mDry);
    const dvRecovered = deltaVFromMasses(mDry + mProp, mDry, Isp);
    expect(dvRecovered).toBeCloseTo(dv, 6);
  });

  it("typical bipropellant (Isp = 300 s, Δv = 3 km/s) yields MR ≈ 2.77", () => {
    // exp(3000 / (300 · 9.80665)) = exp(1.01972) ≈ 2.7724.
    const mr = massRatio(3_000, 300);
    expect(mr).toBeCloseTo(2.7724, 3);
  });

  it("electric (Isp = 2000 s) needs much less propellant for the same Δv", () => {
    const chemical = propellantMass(3_000, 300, 1_000);
    const electric = propellantMass(3_000, 2_000, 1_000);
    expect(electric).toBeLessThan(chemical * 0.2);
  });

  it("exhaust velocity = Isp · g₀", () => {
    expect(exhaustVelocity(300)).toBeCloseTo(300 * 9.80665, 6);
  });
});

describe("plane change", () => {
  it("Δv_plane = 0 at Δi = 0", () => {
    expect(planeChangeDeltaV(7.5, 0)).toBe(0);
  });

  it("Δv_plane = 2v at Δi = 180° (reverse direction)", () => {
    expect(planeChangeDeltaV(7.5, Math.PI)).toBeCloseTo(15, 6);
  });

  it("28° at LEO @ 7.7 km/s ≈ 3.7 km/s — the well-known 'why you launch east' number", () => {
    const dv = planeChangeDeltaV(7.7, 28 * DEG);
    expect(dv).toBeGreaterThan(3.6);
    expect(dv).toBeLessThan(3.8);
  });
});
