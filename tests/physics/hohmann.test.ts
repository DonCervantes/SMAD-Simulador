import { describe, it, expect } from "vitest";
import { hohmannTransfer } from "@/lib/physics/hohmann";
import { semiMajorAxisFromPerigee } from "@/lib/physics/orbit";
import { A_GEO_KM } from "@/lib/constants";

describe("hohmann — canonical LEO → GEO transfer", () => {
  const rLeo = semiMajorAxisFromPerigee(300, 0); // 300 km circular
  const t = hohmannTransfer(rLeo, A_GEO_KM);

  it("Δv₁ ≈ 2.42 km/s (Curtis worked example)", () => {
    expect(t.dv1_km_s).toBeGreaterThan(2.39);
    expect(t.dv1_km_s).toBeLessThan(2.46);
  });

  it("Δv₂ ≈ 1.46 km/s (Curtis worked example)", () => {
    expect(t.dv2_km_s).toBeGreaterThan(1.44);
    expect(t.dv2_km_s).toBeLessThan(1.48);
  });

  it("Δv total ≈ 3.9 km/s (matches all SMAD/Curtis tables)", () => {
    expect(t.dvTotal_km_s).toBeGreaterThan(3.85);
    expect(t.dvTotal_km_s).toBeLessThan(3.94);
  });

  it("time of flight ≈ 5.25 hours", () => {
    const hours = t.tof_s / 3600;
    expect(hours).toBeGreaterThan(5.2);
    expect(hours).toBeLessThan(5.35);
  });
});

describe("hohmann — degenerate / sanity cases", () => {
  it("r1 = r2 ⇒ zero Δv on both burns", () => {
    const t = hohmannTransfer(7_000, 7_000);
    expect(t.dv1_km_s).toBeCloseTo(0, 9);
    expect(t.dv2_km_s).toBeCloseTo(0, 9);
  });

  it("lowering transfer (r2 < r1) returns positive |Δv| on both burns", () => {
    const t = hohmannTransfer(A_GEO_KM, semiMajorAxisFromPerigee(400, 0));
    expect(t.dv1_km_s).toBeGreaterThan(0);
    expect(t.dv2_km_s).toBeGreaterThan(0);
  });

  it("rejects non-positive radii", () => {
    expect(() => hohmannTransfer(0, 7_000)).toThrow();
    expect(() => hohmannTransfer(7_000, -1)).toThrow();
  });
});
