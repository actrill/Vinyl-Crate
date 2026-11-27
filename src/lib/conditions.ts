// Discogs condition grades, best to worst, exactly as Discogs stores them.
export const MEDIA_CONDITIONS = [
  'Mint (M)', 'Near Mint (NM or M-)', 'Very Good Plus (VG+)', 'Very Good (VG)',
  'Good Plus (G+)', 'Good (G)', 'Fair (F)', 'Poor (P)',
] as const;

export function conditionAbbrev(c: string): string {
  return c.match(/\(([^)]+)\)\s*$/)?.[1] ?? c;
}

/** True when two condition strings name the same grade (tolerates small wording differences). */
export function sameCondition(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  return conditionAbbrev(a).toLowerCase() === conditionAbbrev(b).toLowerCase();
}

export function orderedConditions(keys: string[]): string[] {
  const rank = (k: string) => {
    const i = MEDIA_CONDITIONS.findIndex((c) => sameCondition(c, k));
    return i < 0 ? 99 : i;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b));
}
