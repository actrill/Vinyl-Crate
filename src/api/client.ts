import type {
  DiscogsCollectionItem, DiscogsCollectionPage, DiscogsCollectionValue, DiscogsCustomField,
  DiscogsFolder, DiscogsIdentity, DiscogsMarketplaceStats, DiscogsMaster, DiscogsPriceSuggestions,
  DiscogsProfile, DiscogsRelease,
} from './types';
import { API_BASE, type HttpResponse, type Transport } from './transport';
import { RateLimitedQueue, type Priority } from './queue';

export class DiscogsError extends Error {
  constructor(public status: number, message: string, public endpoint: string) {
    super(message);
    this.name = 'DiscogsError';
  }
  get isAuth(): boolean { return this.status === 401 || this.status === 403; }
  get isNotFound(): boolean { return this.status === 404; }
}

export type PriceSuggestionsResult =
  | { kind: 'ok'; suggestions: DiscogsPriceSuggestions }
  | { kind: 'needs-seller-settings'; message: string }
  | { kind: 'unavailable'; message: string };

export interface Credentials { username: string; token: string }

/**
 * Typed, read-only Discogs client. Every request goes through the rate-limited
 * queue and carries the personal access token in the Authorization header.
 * The token is never logged or included in error messages.
 */
export class DiscogsClient {
  constructor(
    private creds: Credentials,
    private transport: Transport,
    readonly queue: RateLimitedQueue = new RateLimitedQueue(),
  ) {}

  get username(): string { return this.creds.username; }

  private user(): string { return encodeURIComponent(this.creds.username); }

  private async get<T>(path: string, priority: Priority = 'normal', allowStatus: number[] = []): Promise<HttpResponse<T>> {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const res = await this.queue.enqueue(
      () => this.transport.getJson(url, { Authorization: `Discogs token=${this.creds.token}` }),
      priority,
    );
    if (res.status >= 400 && !allowStatus.includes(res.status)) {
      const body = res.data as { message?: string } | string | undefined;
      const msg = typeof body === 'object' && body?.message ? body.message : `HTTP ${res.status}`;
      throw new DiscogsError(res.status, msg, path.replace(/\?.*/, ''));
    }
    return res as HttpResponse<T>;
  }

  /** GET /oauth/identity — confirms the token and returns its username. */
  async identity(): Promise<DiscogsIdentity> {
    return (await this.get<DiscogsIdentity>('/oauth/identity', 'high')).data;
  }

  /** GET /users/{username} — includes curr_abbr when authenticated as the owner. */
  async profile(): Promise<DiscogsProfile> {
    return (await this.get<DiscogsProfile>(`/users/${this.user()}`)).data;
  }

  /** GET /users/{username}/collection/folders */
  async folders(): Promise<DiscogsFolder[]> {
    return (await this.get<{ folders: DiscogsFolder[] }>(`/users/${this.user()}/collection/folders`)).data.folders;
  }

  /** GET /users/{username}/collection/fields */
  async fields(): Promise<DiscogsCustomField[]> {
    return (await this.get<{ fields: DiscogsCustomField[] }>(`/users/${this.user()}/collection/fields`)).data.fields;
  }

  /** GET /users/{username}/collection/folders/{folder_id}/releases?page=&per_page=100 */
  async collectionPage(folderId: number, page: number): Promise<DiscogsCollectionPage> {
    const q = `page=${page}&per_page=100&sort=added&sort_order=asc`;
    return (await this.get<DiscogsCollectionPage>(
      `/users/${this.user()}/collection/folders/${folderId}/releases?${q}`,
    )).data;
  }

  /** All pages of a folder. Folder 0 ("All") returns every item with its folder_id. */
  async collectionItems(folderId: number, onPage?: (done: number, total: number) => void): Promise<DiscogsCollectionItem[]> {
    const first = await this.collectionPage(folderId, 1);
    const items = [...first.releases];
    onPage?.(1, first.pagination.pages);
    for (let p = 2; p <= first.pagination.pages; p++) {
      items.push(...(await this.collectionPage(folderId, p)).releases);
      onPage?.(p, first.pagination.pages);
    }
    return items;
  }

  /** GET /users/{username}/collection/value — formatted strings in the user's currency. */
  async collectionValue(): Promise<DiscogsCollectionValue> {
    return (await this.get<DiscogsCollectionValue>(`/users/${this.user()}/collection/value`)).data;
  }

  /** GET /releases/{release_id}?curr_abbr= */
  async release(id: number, currency?: string, priority: Priority = 'normal'): Promise<DiscogsRelease> {
    const q = currency ? `?curr_abbr=${encodeURIComponent(currency)}` : '';
    return (await this.get<DiscogsRelease>(`/releases/${id}${q}`, priority)).data;
  }

  /** GET /masters/{master_id} */
  async master(id: number, priority: Priority = 'low'): Promise<DiscogsMaster> {
    return (await this.get<DiscogsMaster>(`/masters/${id}`, priority)).data;
  }

  /**
   * GET /marketplace/price_suggestions/{release_id}
   * Needs seller settings filled in on Discogs; without them Discogs answers
   * with an error, which we report as 'needs-seller-settings'.
   */
  async priceSuggestions(id: number, priority: Priority = 'low'): Promise<PriceSuggestionsResult> {
    const res = await this.get<DiscogsPriceSuggestions | { message?: string }>(
      `/marketplace/price_suggestions/${id}`, priority, [400, 403, 404, 422],
    );
    if (res.status < 400) return { kind: 'ok', suggestions: res.data as DiscogsPriceSuggestions };
    const message = (res.data as { message?: string })?.message ?? `HTTP ${res.status}`;
    if (/seller|settings/i.test(message) || res.status === 404 || res.status === 403) {
      return { kind: 'needs-seller-settings', message };
    }
    return { kind: 'unavailable', message };
  }

  /** GET /marketplace/stats/{release_id}?curr_abbr= */
  async marketplaceStats(id: number, currency?: string, priority: Priority = 'low'): Promise<DiscogsMarketplaceStats> {
    const q = currency ? `?curr_abbr=${encodeURIComponent(currency)}` : '';
    return (await this.get<DiscogsMarketplaceStats>(`/marketplace/stats/${id}${q}`, priority)).data;
  }

  async image(url: string): Promise<Blob> {
    return this.transport.getBinary(url, {});
  }
}

/** The release's sales history page on the Discogs website (not in the API). */
export function salesHistoryUrl(releaseId: number): string {
  return `https://www.discogs.com/sell/history/${releaseId}`;
}

export function releasePageUrl(releaseId: number): string {
  return `https://www.discogs.com/release/${releaseId}`;
}
