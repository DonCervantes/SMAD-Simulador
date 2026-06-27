import { describe, it, expect } from "vitest";
import {
  solveKepler,
  trueAnomalyFromEccentric,
} from "@/lib/physics/kepler-solver";

describe("solveKepler — Newton convergence", () => {
  it("at e = 0 returns E = M (within floating noise)", () => {
    for (const M of [-Math.PI, -1, 0, 1, Math.PI / 2, 2.5]) {
      expect(solveKepler(M, 0)).toBeCloseTo(M, 10);
    }
  });

  it("recovers M when round-tripped through Kepler's equation", () => {
    const cases: [number, number][] = [
      [0.3, 0.05],
      [1.2, 0.2],
      [-0.7, 0.4],
      [2.8, 0.6],
      [3.0, 0.74], // Molniya-like
    ];
    for (const [M, e] of cases) {
      const E = solveKepler(M, e);
      const M_recovered = E - e * Math.sin(E);
      expect(M_recovered).toBeCloseTo(M, 9);
    }
  });

  it("rejects invalid eccentricity", () => {
    expect(() => solveKepler(0.5, -0.1)).toThrow();
    expect(() => solveKepler(0.5, 1.0)).toThrow();
  });
});

describe("trueAnomalyFromEccentric", () => {
  it("ν = E when e = 0", () => {
    for (const E of [-2, -0.5, 0, 0.5, 2]) {
      expect(trueAnomalyFromEccentric(E, 0)).toBeCloseTo(E, 10);
    }
  });

  it("ν = ±π when E = ±π (apogee) for any e", () => {
    for (const e of [0.1, 0.5, 0.9]) {
      expect(Math.abs(trueAnomalyFromEccentric(Math.PI, e))).toBeCloseTo(
        Math.PI,
        9,
      );
    }
  });
});
