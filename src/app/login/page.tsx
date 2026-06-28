"use client";

import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function LoginInner() {
  const { ready, authenticated, login, user, logout } = usePrivy();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/simulator";

  // Once authenticated, bounce to the requested destination.
  useEffect(() => {
    if (ready && authenticated) {
      router.replace(next);
    }
  }, [ready, authenticated, router, next]);

  const showLoading = !ready;
  const showLoggedIn = ready && authenticated;
  const showSignIn = ready && !authenticated;

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-8 shadow-2xl">
        <Link
          href="/"
          className="text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] block mb-6 readout"
        >
          ← back to overview
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight mb-1">
          <span className="text-[var(--color-accent)]">◢</span> SMAD Simulator
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)] mb-6">
          Sign in to access the five mission-engineering modules.
        </p>

        {showLoading && (
          <div className="text-sm text-[var(--color-fg-muted)] font-mono animate-pulse">
            initializing session…
          </div>
        )}

        {showSignIn && (
          <>
            <button
              onClick={login}
              className="w-full rounded-md bg-[var(--color-accent)] text-[#08111c] px-4 py-2.5 font-semibold hover:brightness-110 transition"
            >
              Sign in
            </button>
            <p className="text-[11px] text-[var(--color-fg-dim)] mt-3 leading-snug">
              Authentication is handled by Privy. You can use email, a Google
              account, or a wallet. No mission data is sent to Privy — only
              your authentication token.
            </p>
          </>
        )}

        {showLoggedIn && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-fg)]">
              You are signed in as{" "}
              <span className="text-[var(--color-readout)] readout">
                {user?.email?.address ??
                  user?.google?.email ??
                  user?.wallet?.address?.slice(0, 8) ??
                  user?.id?.slice(0, 12) ??
                  "user"}
              </span>
              .
            </p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              Redirecting to{" "}
              <code className="text-[var(--color-readout)]">{next}</code>…
            </p>
            <button
              onClick={logout}
              className="w-full rounded-md border border-[var(--color-border-default)] text-[var(--color-fg-muted)] px-4 py-2 text-sm hover:text-[var(--color-fg)] hover:border-[var(--color-accent-dim)] transition"
            >
              Sign out instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
