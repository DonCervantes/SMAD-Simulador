export interface Citation {
  /** Short reference key (e.g. "Wertz SMAD"). */
  key: string;
  /** Section, equation, or page reference. */
  locator: string;
  /** Optional full reference (author, title, year). */
  full?: string;
}

export interface CitationFooterProps {
  title?: string;
  citations: Citation[];
}

/**
 * Visible bibliography block. SPEC §3 makes this mandatory under each module
 * so every formula on screen can be traced.
 */
export function CitationFooter({
  title = "Sources",
  citations,
}: CitationFooterProps) {
  return (
    <footer className="mt-8 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] p-4">
      <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-fg-muted)] mb-2">
        {title}
      </h3>
      <ul className="space-y-1.5 text-xs text-[var(--color-fg-muted)] leading-snug">
        {citations.map((c, idx) => (
          <li key={idx}>
            <span className="font-semibold text-[var(--color-fg)]">
              {c.key}
            </span>
            <span className="mx-2 text-[var(--color-fg-dim)]">—</span>
            <span>{c.locator}</span>
            {c.full && (
              <span className="block ml-3 text-[var(--color-fg-dim)] text-[11px] mt-0.5">
                {c.full}
              </span>
            )}
          </li>
        ))}
      </ul>
    </footer>
  );
}
