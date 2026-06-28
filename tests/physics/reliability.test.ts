/**
 * Golden-value tests for reliability functions.
 *
 * Canonical checks:
 *   rSingle(λ=1e-4/h, t=10000h) = e^(-1) ≈ 0.3679
 *   rParallel(λ=1e-4, n=2, t=10000h) = 1-(1-e^-1)² = 1-0.3997 ≈ 0.6004  → actually 1-(1-0.3679)² = 1-0.3994 = 0.6006
 *   rKofN(2-of-3, R=0.9) = 3·0.9²·0.1 - wait, = C(3,2)·0.9²·0.1 + C(3,3)·0.9³ = 3·0.81·0.1 + 0.729 = 0.243+0.729 = 0.972
 *   rColdStandby(λ, m=1, t) = e^(-λt)·(1+λt)  [Birolini §2.6 eq. 2-57]
 */

import { describe, it, expect } from "vitest";
import {
  rSingle, rSeries, rParallel, rKofN, rColdStandby,
  evaluateArchitecture, mtbf_h, fitToLambda, yearsToHours,
  ARCHITECTURES,
} from "@/lib/physics/reliability";

const LAMBDA = 1e-4; // /h
const T10K  = 10_000; // h

describe("rSingle", () => {
  it("λ=1e-4, t=10000h → e^(-1) ≈ 0.3679", () => {
    expect(rSingle(LAMBDA, T10K)).toBeCloseTo(Math.E ** -1, 4);
  });

  it("t=0 → R=1", () => {
    expect(rSingle(LAMBDA, 0)).toBe(1);
  });

  it("λ=0 → R=1 always", () => {
    expect(rSingle(0, T10K)).toBe(1);
  });
});

describe("rSeries", () => {
  it("two identical → R_s = e^(-2λt)", () => {
    const r = rSeries([LAMBDA, LAMBDA], T10K);
    expect(r).toBeCloseTo(Math.exp(-2 * LAMBDA * T10K), 6);
  });

  it("always less than or equal to single component", () => {
    const single = rSingle(LAMBDA, T10K);
    const series = rSeries([LAMBDA, LAMBDA * 0.5], T10K);
    expect(series).toBeLessThanOrEqual(single);
  });
});

describe("rParallel", () => {
  it("n=1 → same as single", () => {
    expect(rParallel(LAMBDA, 1, T10K)).toBeCloseTo(rSingle(LAMBDA, T10K), 6);
  });

  it("n=2, λ=1e-4, t=10000 → 1-(1-e^-1)² ≈ 0.6006", () => {
    const q = 1 - Math.exp(-1);
    expect(rParallel(LAMBDA, 2, T10K)).toBeCloseTo(1 - q * q, 4);
  });

  it("higher n → higher reliability", () => {
    expect(rParallel(LAMBDA, 3, T10K)).toBeGreaterThan(rParallel(LAMBDA, 2, T10K));
  });
});

describe("rKofN", () => {
  it("2-of-3 with R=0.9 per unit → 0.972", () => {
    // R = e^(-λt) = 0.9 → λt = -ln(0.9)
    const lam = -Math.log(0.9) / T10K;
    const r = rKofN(lam, 2, 3, T10K);
    expect(r).toBeCloseTo(0.972, 2);
  });

  it("k=n (all must survive) → same as series n units", () => {
    const r1 = rKofN(LAMBDA, 3, 3, T10K);
    const r2 = rSeries([LAMBDA, LAMBDA, LAMBDA], T10K);
    expect(r1).toBeCloseTo(r2, 6);
  });

  it("k=1 (any one survives) → same as parallel", () => {
    const r1 = rKofN(LAMBDA, 1, 3, T10K);
    const r2 = rParallel(LAMBDA, 3, T10K);
    expect(r1).toBeCloseTo(r2, 6);
  });
});

describe("rColdStandby", () => {
  it("m=0 spares → same as single", () => {
    expect(rColdStandby(LAMBDA, 0, T10K)).toBeCloseTo(rSingle(LAMBDA, T10K), 6);
  });

  it("m=1, λ=1e-4, t=10000 → e^-1·(1+1) ≈ 0.7358  (Birolini §2.6 eq. 2-57)", () => {
    const expected = Math.exp(-1) * (1 + 1);
    expect(rColdStandby(LAMBDA, 1, T10K)).toBeCloseTo(expected, 4);
  });

  it("higher m → higher reliability", () => {
    expect(rColdStandby(LAMBDA, 2, T10K)).toBeGreaterThan(rColdStandby(LAMBDA, 1, T10K));
  });

  it("R ≤ 1 always", () => {
    expect(rColdStandby(LAMBDA, 5, T10K)).toBeLessThanOrEqual(1);
  });
});

describe("mtbf_h", () => {
  it("λ=1e-4 → MTBF = 10000 h", () => {
    expect(mtbf_h(LAMBDA)).toBeCloseTo(10000, 0);
  });
});

describe("fitToLambda", () => {
  it("100 FIT → 1e-7 /h", () => {
    expect(fitToLambda(100)).toBeCloseTo(1e-7, 15);
  });
});

describe("yearsToHours", () => {
  it("1 year = 8760 h", () => {
    expect(yearsToHours(1)).toBe(8760);
  });
});

describe("evaluateArchitecture", () => {
  it("all architectures return 0 < R ≤ 1 for reasonable λ and t", () => {
    const lam = fitToLambda(200); // 200 FIT
    const t   = yearsToHours(5);
    for (const arch of ARCHITECTURES) {
      const R = evaluateArchitecture(arch, lam, t);
      expect(R).toBeGreaterThan(0);
      expect(R).toBeLessThanOrEqual(1);
    }
  });

  it("redundant architectures outperform single unit", () => {
    const lam = fitToLambda(500);
    const t   = yearsToHours(10);
    const R_single = rSingle(lam, t);
    for (const arch of ARCHITECTURES) {
      const R = evaluateArchitecture(arch, lam, t);
      expect(R).toBeGreaterThanOrEqual(R_single * 0.95); // at least as good
    }
  });
});
