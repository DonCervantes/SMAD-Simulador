import Link from "next/link";

const MODULES = [
  {
    href: "/simulator/orbit",
    title: "Module 1 — Orbital architecture",
    blurb:
      "Vis-viva, period, J2 nodal regression, cylindrical eclipse fraction, coverage geometry, ground track.",
    available: true,
  },
  {
    href: "/simulator/timeline",
    title: "Module 2 — Δv & mission timeline",
    blurb:
      "Hohmann transfer, plane changes, Tsiolkovsky, station-keeping, ascent losses, Gantt phases.",
    available: true,
  },
  {
    href: "/simulator/payload-link",
    title: "Module 3 — Payload & link budget",
    blurb:
      "FSPL + ITU-R P.676 atmospheric + P.618 rain + pointing + polarization; margin gauge.",
    available: true,
  },
  {
    href: "/simulator/users-demand",
    title: "Module 4 — Users & demand",
    blurb:
      "GSD via diffraction limit, Walker constellation sizing, navigation DOP, derived requirements.",
    available: true,
  },
  {
    href: "/simulator/reliability",
    title: "Module 5 — Reliability & risk",
    blurb:
      "R(t), series/parallel/k-of-n/cold-standby; the six redundancy architectures from the syllabus.",
    available: true,
  },
];

export default function SimulatorDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">
        Mission analysis modules
      </h1>
      <p className="text-sm text-[var(--color-fg-muted)] mb-6 max-w-2xl">
        Each module recomputes reactively from its inputs. Formulas are
        traceable to Wertz SMAD (2011), Vallado, Fortescue, MIL-HDBK-217F and
        ITU-R; citations appear at the bottom of every module.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.available ? m.href : "#"}
            aria-disabled={!m.available}
            className={
              m.available
                ? "block rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-elevated)] transition"
                : "block rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4 opacity-50 cursor-not-allowed"
            }
          >
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm font-semibold text-[var(--color-fg)]">
                {m.title}
              </h2>
              {!m.available && (
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-warn)]">
                  Pending
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-fg-muted)] leading-snug">
              {m.blurb}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
