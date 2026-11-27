// Types for the subset of the Discogs API (v2) that Crate reads.
// Field names follow https://www.discogs.com/developers. Everything is
// read-only: Crate never sends POST/PUT/DELETE to Discogs.

export interface DiscogsPagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls: { next?: string; last?: string; first?: string; prev?: string };
}

export interface DiscogsIdentity {
  id: number;
  username: string;
  resource_url: string;
  consumer_name: string;
}

export interface DiscogsProfile {
  id: number;
  username: string;
  name?: string;
  /** Only present when authenticated as this user. */
  curr_abbr?: string;
  num_collection?: number;
}

export interface DiscogsFolder {
  id: number;
  name: string;
  count: number;
  resource_url: string;
}

export interface DiscogsArtistRef {
  id: number;
  name: string;
  /** Artist name variation used on this release ("" when none). */
  anv: string;
  /** Joining text to the next artist, e.g. "&", "And", ",". */
  join: string;
  role: string;
  tracks: string;
  resource_url?: string;
}

export interface DiscogsLabelRef {
  id: number;
  name: string;
  catno: string;
  entity_type?: string;
  entity_type_name?: string;
  resource_url?: string;
}

export interface DiscogsCompanyRef extends DiscogsLabelRef {}

export interface DiscogsFormat {
  name: string;
  qty: string;
  descriptions?: string[];
  text?: string;
}

export interface DiscogsBasicInformation {
  id: number;
  master_id: number;
  master_url: string | null;
  title: string;
  year: number;
  thumb: string;
  cover_image: string;
  formats: DiscogsFormat[];
  labels: DiscogsLabelRef[];
  artists: DiscogsArtistRef[];
  genres: string[];
  styles: string[];
  resource_url: string;
}

export interface DiscogsCollectionNote {
  field_id: number;
  value: string;
}

export interface DiscogsCollectionItem {
  id: number; // release id
  instance_id: number;
  folder_id: number;
  rating: number; // 0–5, 0 = unrated
  date_added: string; // ISO 8601
  basic_information: DiscogsBasicInformation;
  /** Custom field values; only returned to the collection's owner. */
  notes?: DiscogsCollectionNote[];
}

export interface DiscogsCollectionPage {
  pagination: DiscogsPagination;
  releases: DiscogsCollectionItem[];
}

export interface DiscogsCustomField {
  id: number;
  name: string;
  type: 'dropdown' | 'textarea' | string;
  position: number;
  public: boolean;
  options?: string[];
  lines?: number;
}

export interface DiscogsCollectionValue {
  /** Pre-formatted strings in the user's currency, e.g. "$1,234.56". */
  minimum: string;
  median: string;
  maximum: string;
}

export interface DiscogsImage {
  type: 'primary' | 'secondary' | string;
  uri: string;
  uri150: string;
  resource_url: string;
  width: number;
  height: number;
}

export interface DiscogsTrack {
  position: string;
  type_: 'track' | 'heading' | 'index' | string;
  title: string;
  duration: string;
  extraartists?: DiscogsArtistRef[];
  sub_tracks?: DiscogsTrack[];
}

export interface DiscogsIdentifier {
  type: string; // "Barcode", "Matrix / Runout", "Label Code", "Rights Society", ...
  value: string;
  description?: string;
}

export interface DiscogsRelease {
  id: number;
  title: string;
  artists: DiscogsArtistRef[];
  artists_sort?: string;
  year: number;
  /** "1959-08-17", "1959-00-00", "1959", or absent. */
  released?: string;
  released_formatted?: string;
  labels: DiscogsLabelRef[];
  companies?: DiscogsCompanyRef[];
  formats: DiscogsFormat[];
  country?: string;
  genres?: string[];
  styles?: string[];
  tracklist: DiscogsTrack[];
  extraartists?: DiscogsArtistRef[];
  identifiers?: DiscogsIdentifier[];
  notes?: string;
  images?: DiscogsImage[];
  community?: {
    have: number;
    want: number;
    rating?: { count: number; average: number };
  };
  master_id?: number;
  master_url?: string;
  uri: string; // https://www.discogs.com/release/...
  resource_url: string;
  lowest_price?: number | null;
  num_for_sale?: number;
}

export interface DiscogsMaster {
  id: number;
  title: string;
  year: number;
  main_release: number;
  main_release_url: string;
  uri: string;
}

export interface DiscogsPrice {
  currency: string;
  value: number;
}

/** Keys are condition names, e.g. "Very Good Plus (VG+)". */
export type DiscogsPriceSuggestions = Record<string, DiscogsPrice>;

export interface DiscogsMarketplaceStats {
  lowest_price: DiscogsPrice | null;
  num_for_sale: number | null;
  blocked_from_sale: boolean;
}

export interface DiscogsErrorBody {
  message?: string;
}
