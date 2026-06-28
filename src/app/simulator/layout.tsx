import Link from "next/link";
import { ReactNode } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { SimulatorNavUser } from "@/components/SimulatorNavUser";

const MODULES = [
  { href: "/simulator/orbit", label: "M1 · Orbit", available: true },
  { href: "/simulator/timeline", label: "M2 · Δv timeline", available: true },
  {
    href: "/simulator/payload-link",
    label: "M3 · Link budget",
    available: false,
  },
  {
    href: "/simulator/users-demand",
    label: "M4 · Users & demand",
    available: false,
  },
  {
    href: "/simulator/reliability",
    label: "M5 · Reliability",
    available: false,
  },
];

export default function SimulatorLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-col flex-1">
        <header className="sticky top-0 z-10 border-b border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href="/simulator"
              className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase text-[var(--color-fg)] hover:text-[var(--color-accent)]"
            >
              <span className="text-[var(--color-accent)]">◢</span>
              <span>SMAD Simulator</span>
            </Link>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {MODULES.map((m) => (
                <Link
                  key={m.href}
                  href={m.available ? m.href : "#"}
                  aria-disabled={!m.available}
                  className={
                    m.available
                      ? "text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] transition-colors"
                      : "text-[var(--color-fg-dim)] cursor-not-allowed"
                  }
                  title={m.available ? undefined : "Coming in a later phase"}
                >
                  {m.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <SimulatorNavUser />
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
