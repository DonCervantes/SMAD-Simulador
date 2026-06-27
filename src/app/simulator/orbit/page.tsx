"use client";

import { useMemo, useState } from "react";
import { SliderInput } from "@/components/SliderInput";
import { ResultCard } from "@/components/ResultCard";
import { CitationFooter } from "@/components/CitationFooter";
import { EquationDisplay } from "@/components/EquationDisplay";
import { GroundTrackPlot } from "@/components/GroundTrackPlot";
import {
  semiMajorAxisFromPerigee,
  perigeeRadius,
  apogeeRadius,
  visViva,
  orbitalPeriod,
  meanMotion,
  specificEnergy,
} from "@/lib/physics/orbit";
import { nodalRegressionRate, radPerSecToDegPerDay } from "@/lib/physics/j2";
import { eclipseFraction, criticalBeta } from "@/lib/physics/eclipse";
import {
  centralAngle,
  swathRadius,
  footprintArea,
  slantRange,
} from "@/lib/physics/coverage";
import { computeGroundTrack } from "@/lib/physics/ground-track";
import {
  MU_EARTH_KM3_S2,
  R_EARTH_KM,
  J2_EARTH,
} from "@/lib/constants";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const SAMPLES = 240;

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function OrbitPage() {
  // Inputs
  const [h_p, setHp] = useState(400);
  const [e, setE] = useState(0);
  const [i_deg, setIDeg] = useState(51.6);
  const [eps_deg, setEpsDeg] = useState(10);
  const [beta_deg, setBetaDeg] = useState(0);

  const derived = useMemo(() => {
    const a = semiMajorAxisFromPerigee(h_p, e);
    const rp = perigeeRadius(a, e);
    const ra = apogeeRadius(a, e);
    const vp = visViva(rp, a);
    const va = visViva(ra, a);
    const T = orbitalPeriod(a);
    const n = meanMotion(a);
    const energy = specificEnergy(a);
    const dRAAN = nodalRegressionRate(a, e, i_deg * DEG);
    const dRAAN_degPerDay = radPerSecToDegPerDay(dRAAN);

    // Eclipse uses a as representative radius (assumption declared in eclipse.ts).
    const fEclipse = eclipseFraction(a, beta_deg * DEG);
    const eclipseSec = fEclipse * T;
    const betaCritDeg = criticalBeta(a) * RAD;

    // Coverage at perigee (worst case for range / best case for resolution).
    const lambda = centralAngle(eps_deg * DEG, rp);
    const swath = swathRadius(eps_deg * DEG, rp);
    const footprint = footprintArea(eps_deg * DEG, rp);
    const slant = slantRange(eps_deg * DEG, rp);

    const groundTrack = computeGroundTrack(
      {
        a_km: a,
        e,
        i_rad: i_deg * DEG,
        raan0_rad: 0,
        argPerigee_rad: 0,
        M0_rad: 0,
      },
      2 * T,
      SAMPLES,
    );

    return {
      a,
      rp,
      ra,
      vp,
      va,
      T,
      n,
      energy,
      dRAAN_degPerDay,
      fEclipse,
      eclipseSec,
      betaCritDeg,
      lambda,
      swath,
      footprint,
      slant,
      groundTrack,
    };
  }, [h_p, e, i_deg, eps_deg, beta_deg]);

  const inEclipse = derived.fEclipse > 0;
  const swathDeg = (derived.lambda * RAD);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Module 1 · Orbital architecture
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-1 max-w-3xl">
          Inputs feed reactive recomputation of orbit shape, period, J2
          regression, eclipse fraction, coverage footprint and the projected
          ground track. Convention: when <code className="font-mono text-[var(--color-readout)]">e &gt; 0</code> the altitude
          slider sets the perigee height.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* ── Inputs ─────────────────────────────────────────────────── */}
        <aside className="space-y-5 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-5 h-fit">
          <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)]">
            Orbit elements
          </h2>

          <SliderInput
            label="Perigee altitude h_p"
            unit="km"
            value={h_p}
            min={200}
            max={40000}
            step={10}
            onChange={setHp}
            hint="Altitude above the WGS-84 equator (6378.137 km)."
          />
          <SliderInput
            label="Eccentricity e"
            value={e}
            min={0}
            max={0.9}
            step={0.005}
            onChange={setE}
            hint="0 = circular. With e > 0, the slider above is perigee altitude."
          />
          <SliderInput
            label="Inclination i"
            unit="°"
            value={i_deg}
            min={0}
            max={180}
            step={0.1}
            onChange={setIDeg}
            hint="0 = equatorial prograde, 90 = polar, > 90 = retrograde."
          />
          <SliderInput
            label="Min. elevation ε"
            unit="°"
            value={eps_deg}
            min={0}
            max={45}
            step={0.5}
            onChange={setEpsDeg}
            hint="Ground-station horizon mask for the coverage footprint."
          />
          <SliderInput
            label="Solar beta β"
            unit="°"
            value={beta_deg}
            min={-90}
            max={90}
            step={1}
            onChange={setBetaDeg}
            hint="Angle between Sun vector and orbital plane. 0 = Sun in plane."
          />

          <div className="pt-3 border-t border-[var(--color-border-default)] text-[11px] text-[var(--color-fg-dim)] space-y-1">
            <div>μ = {MU_EARTH_KM3_S2.toLocaleString()} km³/s²</div>
            <div>R_⊕ = {R_EARTH_KM} km</div>
            <div>J₂ = {J2_EARTH.toExponential(4)}</div>
          </div>
        </aside>

        {/* ── Outputs ────────────────────────────────────────────────── */}
        <section className="space-y-6">
          {/* Orbit geometry */}
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-2">
              Orbit shape & energy
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ResultCard
                label="Semi-major axis a"
                value={fmt(derived.a, 1)}
                unit="km"
              />
              <ResultCard
                label="Perigee radius r_p"
                value={fmt(derived.rp, 1)}
                unit="km"
              />
              <ResultCard
                label="Apogee radius r_a"
                value={fmt(derived.ra, 1)}
                unit="km"
              />
              <ResultCard
                label="v at perigee"
                value={fmt(derived.vp, 3)}
                unit="km/s"
              />
              <ResultCard
                label="v at apogee"
                value={fmt(derived.va, 3)}
                unit="km/s"
              />
              <ResultCard
                label="Specific energy ε"
                value={fmt(derived.energy, 2)}
                unit="km²/s²"
                caption="ε = −μ / (2a)"
              />
              <ResultCard
                label="Period T"
                value={fmt(derived.T / 60, 2)}
                unit="min"
                caption={`= ${fmt(derived.T, 1)} s`}
              />
              <ResultCard
                label="Mean motion n"
                value={fmt(derived.n * RAD, 5)}
                unit="°/s"
              />
              <ResultCard
                label="J2 dΩ/dt"
                value={fmt(derived.dRAAN_degPerDay, 3)}
                unit="°/day"
                caption="Sun-sync ≈ +0.986°/day"
              />
            </div>
          </div>

          {/* Eclipse & coverage */}
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-2">
              Eclipse (Wertz §5.1 cylindrical) & coverage
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ResultCard
                label="Eclipse fraction"
                value={`${fmt(derived.fEclipse * 100, 2)} %`}
                tone={inEclipse ? "warn" : "ok"}
                caption={`β_crit = ${fmt(derived.betaCritDeg, 2)}°`}
              />
              <ResultCard
                label="Eclipse duration"
                value={fmt(derived.eclipseSec / 60, 2)}
                unit="min/orbit"
                tone={inEclipse ? "warn" : "ok"}
              />
              <ResultCard
                label="Central angle λ"
                value={fmt(swathDeg, 2)}
                unit="°"
                caption={`at ε = ${eps_deg}°`}
              />
              <ResultCard
                label="Swath radius"
                value={fmt(derived.swath, 1)}
                unit="km"
                caption="great-circle arc on Earth"
              />
              <ResultCard
                label="Footprint area"
                value={fmt(derived.footprint / 1e6, 2)}
                unit="M km²"
              />
              <ResultCard
                label="Slant range ρ"
                value={fmt(derived.slant, 1)}
                unit="km"
                caption={`at ε = ${eps_deg}°, perigee`}
              />
            </div>
          </div>

          {/* Ground track */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)]">
                Ground track — 2 orbits (J2 RAAN drift active)
              </h2>
              <span className="text-[10px] text-[var(--color-fg-dim)] readout">
                {SAMPLES} samples · Δt = {fmt((2 * derived.T) / SAMPLES, 1)} s
              </span>
            </div>
            <GroundTrackPlot
              points={derived.groundTrack}
              swathCentralAngleDeg={swathDeg}
            />
          </div>

          {/* Equations */}
          <div className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-3">
              Equations on this page
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-[var(--color-fg)]">
              <EquationDisplay
                tex={String.raw`v(r) = \sqrt{\,\mu\!\left(\tfrac{2}{r} - \tfrac{1}{a}\right)\,}`}
                caption="Vis-viva (Vallado §1.5)"
              />
              <EquationDisplay
                tex={String.raw`T = 2\pi\sqrt{\tfrac{a^3}{\mu}}`}
                caption="Kepler's third law"
              />
              <EquationDisplay
                tex={String.raw`\dot{\Omega} = -\tfrac{3}{2}\,n\,J_2\!\left(\tfrac{R_\oplus}{p}\right)^{\!2}\cos i`}
                caption="J2 nodal regression (Wertz §6.2)"
              />
              <EquationDisplay
                tex={String.raw`f_{\text{eclipse}} = \tfrac{1}{\pi}\arccos\!\left(\tfrac{\sqrt{r^{2}-R_\oplus^{2}}}{r\cos\beta}\right)`}
                caption="Cylindrical shadow (Wertz §5.1)"
              />
              <EquationDisplay
                tex={String.raw`\sin\eta = \tfrac{R_\oplus}{r}\cos\varepsilon\;\;,\;\; \lambda = 90^{\circ}-\varepsilon-\eta`}
                caption="Coverage triangle (Wertz §8.2)"
              />
            </div>
          </div>
        </section>
      </div>

      <CitationFooter
        title="Sources for the formulas on this page"
        citations={[
          {
            key: "Wertz SMAD",
            locator: "§5.1 eclipse · §6.1 two-body · §6.2 J2 secular · §8.2 coverage geometry",
            full: "Wertz, J. R., Everett, D. F., Puschell, J. J. — Space Mission Engineering: The New SMAD, Space Technology Library, 2011.",
          },
          {
            key: "Vallado",
            locator: "§1.5 vis-viva · §1.7 period · §2.2 Kepler's equation · §3 frames · §9.6 J2 secular",
            full: "Vallado, D. A. — Fundamentals of Astrodynamics and Applications, 4th ed., Microcosm Press.",
          },
          {
            key: "WGS-84",
            locator: "equatorial radius R_⊕ = 6378.137 km",
            full: "NIMA TR8350.2, World Geodetic System 1984, 3rd ed., 2000.",
          },
          {
            key: "IERS Conventions",
            locator: "Earth rotation rate ω_⊕ = 7.2921159 × 10⁻⁵ rad/s",
            full: "IERS Technical Note No. 36, 2010.",
          },
        ]}
      />
    </div>
  );
}
