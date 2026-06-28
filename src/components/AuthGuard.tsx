"use client";

import { usePrivy } from "@privy-io/react-auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Redirects to /login if the visitor is not authenticated. Preserves the
 * destination as a `next` query parameter so the login page can route the
 * user back after a successful sign-in.
 *
 * While Privy is still bootstrapping (`ready === false`) we show a minimal
 * skeleton — flashing protected content for a tick is a worse UX than a
 * 200 ms wait.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !authenticated) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [ready, authenticated, router, pathname]);

  if (!ready || !authenticated) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-[var(--color-fg-muted)] text-sm font-mono">
          <span className="inline-block animate-pulse">◢</span>
          <span className="ml-2">
            {!ready ? "initializing session…" : "redirecting to sign-in…"}
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
