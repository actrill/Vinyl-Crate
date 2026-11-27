import type { HttpResponse } from './transport';

/**
 * Serial request queue that keeps Crate inside Discogs's rate limit
 * (60 authenticated requests per minute, measured over a moving window).
 *
 * - Reads X-Discogs-Ratelimit, -Used and -Remaining from every response.
 * - Tracks its own request timestamps as a second line of defence.
 * - On HTTP 429, waits (Retry-After if given, else exponential back-off) and retries.
 * - Higher-priority jobs (things the user just tapped) jump ahead of sync work.
 */

export type Priority = 'high' | 'normal' | 'low';
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

interface Job {
  run: () => Promise<HttpResponse>;
  priority: Priority;
  seq: number;
  resolve: (r: HttpResponse) => void;
  reject: (e: unknown) => void;
}

export interface QueueOptions {
  windowMs?: number;
  defaultLimit?: number;
  /** Requests kept in reserve so a user tap never has to wait for a whole window. */
  headroom?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export class RateLimitError extends Error {
  constructor() { super('Discogs rate limit exceeded after several retries'); }
}

export class RateLimitedQueue {
  private jobs: Job[] = [];
  private running = false;
  private seq = 0;
  private sent: number[] = [];
  private limit: number;
  private remaining: number | null = null;
  private readonly windowMs: number;
  private readonly headroom: number;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(opts: QueueOptions = {}) {
    this.windowMs = opts.windowMs ?? 60_000;
    this.limit = opts.defaultLimit ?? 60;
    this.headroom = opts.headroom ?? 2;
    this.maxRetries = opts.maxRetries ?? 5;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.now = opts.now ?? Date.now;
  }

  get pending(): number { return this.jobs.length; }

  enqueue(run: () => Promise<HttpResponse>, priority: Priority = 'normal'): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      this.jobs.push({ run, priority, seq: this.seq++, resolve, reject });
      this.jobs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.seq - b.seq);
      void this.pump();
    });
  }

  /** Drop queued (not yet started) jobs, e.g. when the user disconnects. */
  clear(reason = 'cancelled'): void {
    const jobs = this.jobs;
    this.jobs = [];
    for (const j of jobs) j.reject(new Error(reason));
  }

  /** How long to wait before the next request is allowed. Exposed for tests. */
  delayBeforeNext(priority: Priority): number {
    const now = this.now();
    this.sent = this.sent.filter((t) => now - t < this.windowMs);
    const reserve = priority === 'high' ? 0 : this.headroom;
    const budget = Math.max(1, this.limit - reserve);
    const remainingOk = this.remaining === null || this.remaining > reserve;
    if (this.sent.length < budget && remainingOk) return 0;
    const oldest = this.sent[0] ?? now;
    // Discogs's window is moving: one slot frees up when the oldest request ages out.
    return Math.max(250, oldest + this.windowMs - now);
  }

  private observe(res: HttpResponse): void {
    const limit = Number(res.headers['x-discogs-ratelimit']);
    const remaining = Number(res.headers['x-discogs-ratelimit-remaining']);
    if (Number.isFinite(limit) && limit > 0) this.limit = limit;
    if (Number.isFinite(remaining)) this.remaining = remaining;
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.jobs.length) {
        const job = this.jobs[0]!;
        const wait = this.delayBeforeNext(job.priority);
        if (wait > 0) {
          await this.sleep(wait);
          // Discogs's counter has been draining while we waited.
          if (this.remaining !== null) this.remaining = Math.min(this.limit, this.remaining + 1);
          continue; // re-check: a higher-priority job may have arrived
        }
        this.jobs.shift();
        try {
          job.resolve(await this.runWithRetry(job));
        } catch (e) {
          job.reject(e);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async runWithRetry(job: Job): Promise<HttpResponse> {
    let attempt = 0;
    for (;;) {
      this.sent.push(this.now());
      let res: HttpResponse;
      try {
        res = await job.run();
      } catch (e) {
        if (attempt++ >= 2) throw e; // network error: two quick retries, then give up
        await this.sleep(1500 * attempt);
        continue;
      }
      this.observe(res);
      if (res.status !== 429) return res;
      if (attempt++ >= this.maxRetries) throw new RateLimitError();
      const retryAfter = Number(res.headers['retry-after']);
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(60_000, 2000 * 2 ** (attempt - 1));
      this.remaining = 0;
      await this.sleep(backoff);
    }
  }
}
