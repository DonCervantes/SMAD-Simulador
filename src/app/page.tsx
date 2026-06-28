import Link from "next/link";
import { HeroGroundTrack } from "@/components/HeroGroundTrack";
import { EquationDisplay } from "@/components/EquationDisplay";

const MODULES = [
  {
    n: 1,
    title: "Orbital architecture",
    blurb:
      "Vis-viva, Kepler's third law, J2 nodal regression, cylindrical eclipse, coverage geometry, propagated ground track.",
    tex: String.raw`v(r) = \sqrt{\mu\!\left(\tfrac{2}{r} - \tfrac{1}{a}\right)}`,
    cite: "Vallado §1.5 · Wertz SMAD §6.1",
  },
  {
    n: 2,
    title: "Δv & mission timeline",
    blurb:
      "Hohmann transfer, plane change, Tsiolkovsky sizing, station-keeping, disposal, lifecycle Gantt.",
    tex: String.raw`\Delta v = I_{sp}\,g_0\,\ln\!\left(\tfrac{m_0}{m_f}\right)`,
    cite: "Wertz SMAD §17.4 · IADC-02-01",
  },
  {
    n: 3,
    title: "Payload & link budget",
    blurb:
      "FSPL plus ITU-R P.676 atmospheric, P.618 rain, pointing and polarization losses; margin gauge by band.",
    tex: String.raw`L_{fs} = \left(\tfrac{4\pi d}{\lambda}\right)^{\!2}`,
    cite: "Wertz SMAD §13.3 · ITU-R P.618/P.676",
  },
  {
    n: 4,
    title: "Users & demand",
    blurb:
      "GSD from the diffraction limit, Walker constellation sizing for continuous coverage, navigation DOP geometry.",
    tex: String.raw`\text{GSD} = \tfrac{1.22\,\lambda\,h}{D}`,
    cite: "Wertz SMAD §9 (payload optics)",
  },
  {
    n: 5,
    title: "Reliability & risk",
    blurb:
      "R(t) for series, parallel, k-of-n voting and cold-standby; the six redundancy architectures from the syllabus.",
    tex: String.raw`R(t) = e^{-\lambda t}`,
    cite: "MIL-HDBK-217F · Wertz SMAD §19",
  },
];

const STANDARDS = [
  { label: "Wertz SMAD (2011)" },
  { label: "Vallado — Astrodynamics" },
  { label: "MIL-HDBK-217F" },
  { label: "ITU-R P.618/P.676" },
  { label: "IADC-02-01" },
  { label: "IERS Conventions 2010" },
];

export default function Landing() {
  return (
    <div className="flex flex-col flex-1">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
            <span className="text-[var(--color-accent)]">◢</span>
            <span>SMAD Simulator</span>
          </div>
          <Link
            href="/login"
            className="text-xs rounded-md border border-[var(--color-border-default)] px-3 py-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent-dim)] transition"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-12 pb-16">
        <div className="grid lg:grid-cols-[1.1fr_1.3fr] gap-10 items-center">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] mb-4">
              Space mission analysis & design
            </p>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
              Five modules of mission engineering, calculated with the equations
              that agencies actually use.
            </h1>
            <p className="mt-5 text-[var(--color-fg-muted)] text-base leading-relaxed max-w-xl">
              Every slider triggers a recalculation traceable to Wertz SMAD,
              Vallado, Fortescue, MIL-HDBK-217F and ITU-R. No hidden black
              boxes — open the source, read the formula, edit a constant.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-md bg-[var(--color-accent)] text-[#08111c] px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition"
              >
                Enter the simulator →
              </Link>
              <a
                href="https://github.com/DonCervantes/SMAD-Simulador"
                className="rounded-md border border-[var(--color-border-default)] px-5 py-2.5 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent-dim)] transition"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source on GitHub
              </a>
            </div>
            <div className="mt-6 text-[11px] text-[var(--color-fg-dim)] font-mono readout">
              Below: a live 2-orbit ground track of an ISS-like circular orbit
              (h ≈ 420 km, i = 51.6°), propagated with J2 secular drift and
              Earth rotation. Same code as Module 1.
            </div>
          </div>
          <div>
            <HeroGroundTrack />
          </div>
        </div>
      </section>

      {/* Module cards */}
      <section className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]/30">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-14">
          <div className="mb-8">
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)]">
              What it computes
            </p>
            <h2 className="text-2xl font-semibold tracking-tight mt-1">
              One module per syllabus topic, each with its signature equation.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULES.map((m) => (
              <article
                key={m.n}
                className="rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-5 flex flex-col"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent)]">
                    Module {m.n}
                  </span>
                  <span className="text-[10px] text-[var(--color-fg-dim)] readout">
                    {m.cite}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[var(--color-fg)] mb-2">
                  {m.title}
                </h3>
                <p className="text-xs text-[var(--color-fg-muted)] leading-snug mb-3 flex-1">
                  {m.blurb}
                </p>
                <div className="rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] px-3 py-2 overflow-x-auto">
                  <EquationDisplay tex={m.tex} inline />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Standards strip */}
      <section className="border-t border-[var(--color-border-default)]">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-10">
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-fg-muted)] mb-4">
            Based on real standards
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {STANDARDS.map((s) => (
              <span
                key={s.label}
                className="text-sm font-mono text-[var(--color-fg)]"
              >
                <span className="text-[var(--color-accent)] mr-1.5">◦</span>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]/30">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-3">
            Ready to design a mission?
          </h2>
          <p className="text-sm text-[var(--color-fg-muted)] mb-6 max-w-xl mx-auto">
            Sign in with email, Google or wallet to enter the simulator.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-[var(--color-accent)] text-[#08111c] px-6 py-3 text-sm font-semibold hover:brightness-110 transition"
          >
            Enter the simulator →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border-default)] py-6 text-center text-[11px] text-[var(--color-fg-dim)] font-mono">
        Educational project · Daniel Adrián Cruz Cervantes · 2026
      </footer>
    </div>
  );
}
