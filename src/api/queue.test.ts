import { describe, expect, it } from 'vitest';
import { RateLimitedQueue } from './queue';
import type { HttpResponse } from './transport';

const res = (status: number, remaining?: number, extra: Record<string, string> = {}): HttpResponse => ({
  status, data: {}, headers: { 'x-discogs-ratelimit': '60', ...(remaining !== undefined ? { 'x-discogs-ratelimit-remaining': String(remaining) } : {}), ...extra },
});

function fakeClock() {
  let t = 0;
  const sleeps: number[] = [];
  return { now: () => t, sleep: async (ms: number) => { sleeps.push(ms); t += ms; }, sleeps };
}

describe('RateLimitedQueue', () => {
  it('retries after HTTP 429, honouring Retry-After', async () => {
    const c = fakeClock();
    const q = new RateLimitedQueue({ now: c.now, sleep: c.sleep });
    const answers = [res(429, 0, { 'retry-after': '3' }), res(200, 50)];
    const r = await q.enqueue(async () => answers.shift()!);
    expect(r.status).toBe(200);
    expect(c.sleeps).toContain(3000);
  });

  it('backs off exponentially without Retry-After and gives up eventually', async () => {
    const c = fakeClock();
    const q = new RateLimitedQueue({ now: c.now, sleep: c.sleep, maxRetries: 3 });
    await expect(q.enqueue(async () => res(429))).rejects.toThrow(/rate limit/i);
    expect(c.sleeps.filter((s) => s >= 2000).slice(0, 3)).toEqual([2000, 4000, 8000]);
  });

  it('waits when Discogs reports the budget is nearly spent', async () => {
    const c = fakeClock();
    const q = new RateLimitedQueue({ now: c.now, sleep: c.sleep });
    await q.enqueue(async () => res(200, 1));
    expect(q.delayBeforeNext('normal')).toBeGreaterThan(0);
    // A user tap may use the reserve.
    expect(q.delayBeforeNext('high')).toBe(0);
  });

  it('never sends more than the limit inside one window', async () => {
    const c = fakeClock();
    const q = new RateLimitedQueue({ now: c.now, sleep: c.sleep, defaultLimit: 5, headroom: 0 });
    const sentAt: number[] = [];
    await Promise.all(Array.from({ length: 12 }, () => q.enqueue(async () => { sentAt.push(c.now()); return { status: 200, headers: {}, data: {} }; })));
    expect(sentAt).toHaveLength(12);
    expect(sentAt[11]).toBeGreaterThanOrEqual(60_000);
    for (const t of sentAt) expect(sentAt.filter((u) => u > t - 60_000 && u <= t).length).toBeLessThanOrEqual(5);
  });

  it('runs high-priority jobs before queued sync work', async () => {
    const c = fakeClock();
    const q = new RateLimitedQueue({ now: c.now, sleep: c.sleep });
    const order: string[] = [];
    const job = (n: string) => async () => { order.push(n); return res(200, 50); };
    const a = q.enqueue(job('sync-1'), 'normal');
    const b = q.enqueue(job('sync-2'), 'low');
    const h = q.enqueue(job('tap'), 'high');
    await Promise.all([a, b, h]);
    expect(order.indexOf('tap')).toBeLessThan(order.indexOf('sync-2'));
  });
});
