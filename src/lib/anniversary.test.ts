import { describe, expect, it } from 'vitest';
import {
  anniversariesOn, anniversaryInYear, formatPartialDate, isFullDate, notificationId, parseDiscogsDate,
  resolveOriginalDate, turningThisYear, upcomingAnniversaries,
} from './anniversary';

describe('parseDiscogsDate', () => {
  it('parses full dates', () => {
    expect(parseDiscogsDate('1959-08-17')).toEqual({ year: 1959, month: 8, day: 17 });
    expect(isFullDate(parseDiscogsDate('1959-08-17'))).toBe(true);
  });
  it('treats zero month/day as year-only', () => {
    expect(parseDiscogsDate('1959-00-00')).toEqual({ year: 1959 });
    expect(isFullDate(parseDiscogsDate('1959-00-00'))).toBe(false);
  });
  it('keeps month when the day is zero', () => {
    expect(parseDiscogsDate('1959-08-00')).toEqual({ year: 1959, month: 8 });
    expect(isFullDate(parseDiscogsDate('1959-08-00'))).toBe(false);
  });
  it('parses year-only strings', () => {
    expect(parseDiscogsDate('1959')).toEqual({ year: 1959 });
  });
  it('rejects junk and impossible days', () => {
    expect(parseDiscogsDate('')).toBeNull();
    expect(parseDiscogsDate(undefined)).toBeNull();
    expect(parseDiscogsDate('Unknown')).toBeNull();
    expect(parseDiscogsDate('1959-02-30')).toEqual({ year: 1959, month: 2 });
  });
  it('accepts Feb 29 only in leap years', () => {
    expect(parseDiscogsDate('1960-02-29')).toEqual({ year: 1960, month: 2, day: 29 });
    expect(parseDiscogsDate('1959-02-29')).toEqual({ year: 1959, month: 2 });
  });
});

describe('resolveOriginalDate', () => {
  it('prefers a manual date', () => {
    expect(resolveOriginalDate({ manualDate: '1959-08-17', releaseReleased: '1997' })?.source).toBe('manual');
  });
  it('uses the master main release date for a reissue', () => {
    const r = resolveOriginalDate({ releaseReleased: '1997-00-00', releaseYear: 1997, masterYear: 1959, masterMainReleased: '1959-08-17' });
    expect(r).toEqual({ date: { year: 1959, month: 8, day: 17 }, source: 'master-main' });
  });
  it('falls back to the master year when the main release date is a different year', () => {
    const r = resolveOriginalDate({ releaseReleased: '1997', masterYear: 1959, masterMainReleased: '1962-03-01' });
    expect(r).toEqual({ date: { year: 1959 }, source: 'master' });
  });
  it('uses the release itself when there is no master', () => {
    expect(resolveOriginalDate({ releaseReleased: '1959-12-14', releaseYear: 1959 })).toEqual({ date: { year: 1959, month: 12, day: 14 }, source: 'release' });
    expect(resolveOriginalDate({ releaseYear: 1956 })).toEqual({ date: { year: 1956 }, source: 'release-year' });
  });
  it('returns null with nothing to go on', () => {
    expect(resolveOriginalDate({})).toBeNull();
  });
});

describe('anniversaries', () => {
  const kob = { releaseId: 1, date: { year: 1959, month: 8, day: 17 } };
  const yearOnly = { releaseId: 2, date: { year: 1976 } };

  it('schedules full dates within 12 months at 9:00', () => {
    const from = new Date(2026, 10, 27, 12, 0); // Nov 27 2026
    const occ = upcomingAnniversaries([kob, yearOnly], from);
    expect(occ).toHaveLength(1);
    expect(occ[0]!.at).toEqual(new Date(2027, 7, 17, 9, 0));
    expect(occ[0]!.age).toBe(68);
  });
  it("includes today's anniversary only if 9:00 hasn't passed", () => {
    expect(upcomingAnniversaries([kob], new Date(2026, 7, 17, 8, 0))[0]!.at).toEqual(new Date(2026, 7, 17, 9, 0));
    expect(upcomingAnniversaries([kob], new Date(2026, 7, 17, 10, 0))[0]!.at).toEqual(new Date(2027, 7, 17, 9, 0));
  });
  it('can limit to milestones', () => {
    const from = new Date(2009, 0, 1);
    expect(upcomingAnniversaries([kob], from, { milestonesOnly: true })).toHaveLength(1); // 50th in 2009
    expect(upcomingAnniversaries([kob], new Date(2026, 0, 1), { milestonesOnly: true })).toHaveLength(0);
  });
  it('honours a custom time', () => {
    expect(upcomingAnniversaries([kob], new Date(2026, 0, 1), { hour: 18, minute: 30 })[0]!.at).toEqual(new Date(2026, 7, 17, 18, 30));
  });
  it('moves Feb 29 to Feb 28 in common years', () => {
    expect(anniversaryInYear(2, 29, 2027)).toEqual({ month: 2, day: 28 });
    expect(anniversaryInYear(2, 29, 2028)).toEqual({ month: 2, day: 29 });
  });
  it('finds records released on a given day', () => {
    expect(anniversariesOn([kob, yearOnly], new Date(2009, 7, 17))).toEqual([{ ...kob, age: 50, milestone: true }]);
  });
  it('lists year-only records turning an age this year', () => {
    const list = turningThisYear([kob, yearOnly, { releaseId: 3, date: { year: 1959 } }], 2026);
    expect(list.map((x) => [x.releaseId, x.age, x.milestone])).toEqual([[2, 50, true], [3, 67, false]]);
  });
  it('formats dates in words', () => {
    expect(formatPartialDate({ year: 1959, month: 8, day: 17 })).toBe('August 17, 1959');
    expect(formatPartialDate({ year: 1959 })).toBe('1959');
  });
  it('gives stable, positive notification ids', () => {
    expect(notificationId(123, 2027)).toBe(notificationId(123, 2027));
    expect(notificationId(123, 2027)).not.toBe(notificationId(123, 2028));
    expect(notificationId(123, 2027)).toBeGreaterThan(0);
  });
});
