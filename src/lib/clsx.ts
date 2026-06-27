/** Tiny class-name joiner. Filters out falsy entries. */
export function clsx(
  ...classes: (string | false | null | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}
