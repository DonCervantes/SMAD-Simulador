import { describe, it, expect } from "vitest";
import {
  MU_EARTH_KM3_S2,
  R_EARTH_KM,
  J2_EARTH,
  G0_M_S2,
  K_BOLTZMANN_J_K,
  K_BOLTZMANN_DBW_K_HZ,
  C_LIGHT_KM_S,
  EARTH_ROTATION_RAD_S,
  A_GEO_KM,
} from "@/lib/constants";

describe("constants — values agree with the cited sources", () => {
  it("μ_⊕ matches Vallado App. D-3", () => {
    expect(MU_EARTH_KM3_S2).toBe(398_600.4418);
  });

  it("R_⊕ matches WGS-84 equatorial radius", () => {
    expect(R_EARTH_KM).toBe(6_378.137);
  });

  it("J2 matches Wertz SMAD §6.2 truncation", () => {
    expect(J2_EARTH).toBeCloseTo(1.082_63e-3, 8);
  });

  it("g0 is the CGPM-1901 standard value", () => {
    expect(G0_M_S2).toBe(9.806_65);
  });

  it("Boltzmann is exact CODATA-2018 value", () => {
    expect(K_BOLTZMANN_J_K).toBe(1.380_649e-23);
  });

  it("k in dBW/K/Hz is 10·log10(k) truncated to SMAD's -228.6", () => {
    const computed = 10 * Math.log10(K_BOLTZMANN_J_K);
    expect(K_BOLTZMANN_DBW_K_HZ).toBeCloseTo(computed, 1);
  });

  it("c is the SI-exact value", () => {
    expect(C_LIGHT_KM_S).toBe(299_792.458);
  });

  it("Earth rotation rate gives a sidereal day ≈ 86 164.09 s", () => {
    const sidereal_day_s = (2 * Math.PI) / EARTH_ROTATION_RAD_S;
    expect(sidereal_day_s).toBeCloseTo(86_164.09, 1);
  });

  it("a_GEO satisfies Kepler's third law for the sidereal day", () => {
    const sidereal_day_s = (2 * Math.PI) / EARTH_ROTATION_RAD_S;
    const a_computed = Math.cbrt(
      (MU_EARTH_KM3_S2 * sidereal_day_s ** 2) / (4 * Math.PI ** 2),
    );
    expect(A_GEO_KM).toBeCloseTo(a_computed, 0);
  });
});
