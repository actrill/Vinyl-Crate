// Release-date parsing and anniversary scheduling.
// Discogs dates come as "1959-08-17", "1959-08-00", "1959-00-00" or "1959".
// Only full dates get a dated notification; year-only dates go to "Turning X this year".

export interface PartialDate { year: number; month?: number; day?: number }

export const MILESTONES = [10, 25, 50, 60, 75, 100] as const;

export function parseDiscogsDate(s: string | null | undefined): PartialDate | null {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 1850 || year > 2200) return null;
  const month = m[2] ? Number(m[2]) : 0;
  const day = m[3] ? Number(m[3]) : 0;
  if (month < 1 || month > 12) return { year };
  if (day < 1 || day > daysInMonth(year, month)) return { year, month };
  return { year, month, day };
}

export function isFullDate(d: PartialDate | null | undefined): d is Required<PartialDate> {
  return !!d && !!d.month && !!d.day;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function toIsoDate(d: PartialDate): string {
  const p = (n?: number) => String(n ?? 0).padStart(2, '0');
  return `${d.year}-${p(d.month)}-${p(d.day)}`;
}

export interface OriginalDateInput {
  manualDate?: string | null;
  releaseReleased?: string | null;
  releaseYear?: number | null;
  masterYear?: number | null;
  masterMainReleased?: string | null;
}

export type DateSource = 'manual' | 'master-main' | 'master' | 'release' | 'release-year';

/**
 * Pick the record's original release date: a manual date wins, then the
 * master's main release date (when it matches the master's year), then the
 * master year, then this release's own date.
 */
export function resolveOriginalDate(i: OriginalDateInput): { date: PartialDate; source: DateSource } | null {
  const manual = parseDiscogsDate(i.manualDate);
  if (manual) return { date: manual, source: 'manual' };
  const own = parseDiscogsDate(i.releaseReleased) ?? (i.releaseYear ? { year: i.releaseYear } : null);
  if (i.masterYear) {
    const main = parseDiscogsDate(i.masterMainReleased);
    if (main && main.year === i.masterYear) return { date: main, source: 'master-main' };
    if (own && own.year === i.masterYear && (own.month || !main)) return { date: own, source: 'release' };
    return { date: { year: i.masterYear }, source: 'master' };
  }
  if (own) return { date: own, source: parseDiscogsDate(i.releaseReleased) ? 'release' : 'release-year' };
  return null;
}

/** Feb 29 anniversaries fall on Feb 28 in non-leap years. */
export function anniversaryInYear(month: number, day: number, year: number): { month: number; day: number } {
  if (month === 2 && day === 29 && !isLeapYear(year)) return { month: 2, day: 28 };
  return { month, day };
}

export function isMilestone(age: number): boolean {
  return (MILESTONES as readonly number[]).includes(age);
}

export interface AnniversaryCandidate {
  releaseId: number;
  date: PartialDate;
}

export interface Occurrence {
  releaseId: number;
  at: Date;
  age: number;
  milestone: boolean;
  original: Required<PartialDate>;
}

/**
 * Anniversaries in the 12 months starting at `from`, at the given local time.
 * Today's anniversary is included only if its time has not passed yet.
 */
export function upcomingAnniversaries(
  candidates: AnniversaryCandidate[],
  from: Date,
  opts: { hour?: number; minute?: number; months?: number; milestonesOnly?: boolean } = {},
): Occurrence[] {
  const { hour = 9, minute = 0, months = 12, milestonesOnly = false } = opts;
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  const out: Occurrence[] = [];
  for (const c of candidates) {
    if (!isFullDate(c.date)) continue;
    for (const y of [from.getFullYear(), from.getFullYear() + 1]) {
      const { month, day } = anniversaryInYear(c.date.month, c.date.day, y);
      const at = new Date(y, month - 1, day, hour, minute, 0, 0);
      const age = y - c.date.year;
      if (age <= 0 || at <= from || at > end) continue;
      if (milestonesOnly && !isMilestone(age)) continue;
      out.push({ releaseId: c.releaseId, at, age, milestone: isMilestone(age), original: c.date });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Records whose anniversary (full date) is today. */
export function anniversariesOn(candidates: AnniversaryCandidate[], day: Date) {
  return candidates
    .filter((c) => isFullDate(c.date))
    .filter((c) => {
      const a = anniversaryInYear(c.date.month!, c.date.day!, day.getFullYear());
      return a.month === day.getMonth() + 1 && a.day === day.getDate() && day.getFullYear() > c.date.year;
    })
    .map((c) => ({ ...c, age: day.getFullYear() - c.date.year, milestone: isMilestone(day.getFullYear() - c.date.year) }));
}

/** Records with only a year (or year and month) that turn a round-ish age this year. */
export function turningThisYear(candidates: AnniversaryCandidate[], year: number) {
  return candidates
    .filter((c) => !isFullDate(c.date) && c.date.year < year)
    .map((c) => ({ ...c, age: year - c.date.year, milestone: isMilestone(year - c.date.year) }))
    .sort((a, b) => Number(b.milestone) - Number(a.milestone) || b.age - a.age);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function formatPartialDate(d: PartialDate): string {
  if (d.month && d.day) return `${MONTHS[d.month - 1]} ${d.day}, ${d.year}`;
  if (d.month) return `${MONTHS[d.month - 1]} ${d.year}`;
  return String(d.year);
}

/** Stable 31-bit notification id per release and year. */
export function notificationId(releaseId: number, year: number): number {
  let h = 2166136261;
  for (const ch of `${releaseId}:${year}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 1) || 1;
}
