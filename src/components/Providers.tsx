"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

/**
 * Root provider for client-side context. Currently wraps PrivyProvider; if we
 * add a theme provider, a React Query client, etc., they go here.
 *
 * Lives in a "use client" boundary because PrivyProvider uses hooks and
 * window-level state that cannot run in a Server Component.
 */
export function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    // Fail loudly in development; users see this in the console and can fix
    // their .env.local without hunting for a silent auth bug.
    console.error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not set. Login will not work. Add it to .env.local.",
    );
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#5cf0ff",
          logo: undefined,
        },
        loginMethods: ["email", "google", "wallet"],
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
