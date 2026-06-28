"use client";

import { usePrivy } from "@privy-io/react-auth";

/** Top-right user badge + sign-out button shown in the simulator header. */
export function SimulatorNavUser() {
  const { ready, authenticated, user, logout } = usePrivy();
  if (!ready || !authenticated) return null;

  const label =
    user?.email?.address ??
    user?.google?.email ??
    (user?.wallet?.address ? user.wallet.address.slice(0, 6) + "…" : undefined) ??
    user?.id?.slice(0, 8) ??
    "signed in";

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-[var(--color-fg-muted)] readout">{label}</span>
      <button
        onClick={logout}
        className="rounded border border-[var(--color-border-default)] px-2 py-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-accent-dim)] transition"
      >
        Sign out
      </button>
    </div>
  );
}
