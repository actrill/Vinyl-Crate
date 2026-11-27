// Shelf filing rules (see README "Shelf order"):
//  - People file under last name: "Ahmad Jamal" -> "Jamal, Ahmad".
//  - Groups carrying a leader's name file under the leader: "Oscar Peterson Trio" -> "Peterson, Oscar".
//  - Other bands file by first word, ignoring a leading "The": "The Four Freshmen" -> "Four Freshmen".
//  - Collaborations file under the first-billed artist.
//  - "Various" compilations file by album title.
//  - Classical records file under the composer when one is credited.

export interface SortNameInput {
  artists: Array<{ name: string; anv?: string; join?: string }>;
  title: string;
  genres?: string[];
  extraartists?: Array<{ name: string; role: string }>;
}

const ENSEMBLE = String.raw`(?:trio|quartet|quartette|quintet|quintette|sextet|sextette|septet|octet|nonet|tentet|orchestra|big band|band|group|combo|ensemble|all[- ]stars|jazz (?:trio|quartet|quintet|sextet|ensemble|orchestra|band)|orchestra and chorus|rhythm section|singers|strings)`;
const HIS_ORCHESTRA = new RegExp(String.raw`\s+(?:and|&|with)\s+(?:his|her|their)\s+.+$`, 'i');
const ENSEMBLE_SUFFIX = new RegExp(String.raw`\s+${ENSEMBLE}$`, 'i');
const COLLAB_SPLIT = /\s+(?:&|and|with|featuring|feat\.|ft\.|meets|vs\.?|\+)\s+/i;

// Words that mark a name as a band or institution rather than a person.
const BAND_WORDS = new Set([
  'jazz', 'modern', 'new', 'hot', 'cool', 'swing', 'big', 'band', 'bands', 'orchestra', 'messengers', 'freshmen',
  'report', 'brothers', 'sisters', 'singers', 'stars', 'all-stars', 'ensemble', 'quartet', 'trio', 'quintet',
  'sextet', 'society', 'club', 'kings', 'giants', 'workshop', 'collective', 'express', 'experience', 'project',
  'connection', 'unit', 'revue', 'symphony', 'philharmonic', 'chamber', 'company', 'crusaders', 'people',
  'sound', 'sounds', 'group', 'combo', 'players', 'boys', 'girls', 'men', 'friends', 'family', 'chorus', 'choir',
  'four', 'five', 'three', 'six', 'seven', 'eight', 'original', 'dixieland', 'ramblers', 'stompers', 'rhythm',
  'school', 'academy', 'records', 'studio', 'lab', 'laboratory', 'of', 'the', 'radio', 'house', 'blue', 'devils',
]);
const PARTICLES = new Set(['van', 'von', 'de', 'der', 'den', 'da', 'del', 'della', 'di', 'du', 'la', 'le', 'st.', 'st', 'dos', 'das', 'ten', 'ter']);
const SUFFIXES = /^(jr\.?|sr\.?|ii|iii|iv)$/i;

/** Remove Discogs's disambiguation suffix: "Bill Evans (2)" -> "Bill Evans". */
export function stripDisambiguation(name: string): string {
  return name.replace(/\s+\(\d+\)$/, '').trim();
}

export function stripLeadingThe(s: string): string {
  return s.replace(/^the\s+/i, '');
}

function looksLikePerson(name: string): boolean {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  if (/\d/.test(name)) return false;
  return words.every((w) => PARTICLES.has(w.toLowerCase()) || (!BAND_WORDS.has(w.toLowerCase()) && /^[\p{Lu}]/u.test(w)));
}

/** "Johann Sebastian Bach" -> "Bach, Johann Sebastian"; "Rudy Van Gelder" -> "Van Gelder, Rudy". */
export function personSortName(full: string): string {
  const name = stripDisambiguation(full);
  if (name.includes(',')) return name; // already "Last, First" or a list
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length < 2) return name;
  let suffix = '';
  if (SUFFIXES.test(words[words.length - 1]!.replace(/,$/, ''))) suffix = words.pop()!;
  if (words.length < 2) return name;
  let lastStart = words.length - 1;
  while (lastStart > 1 && PARTICLES.has(words[lastStart - 1]!.toLowerCase())) lastStart--;
  const last = words.slice(lastStart).join(' ');
  const first = words.slice(0, lastStart).join(' ');
  return suffix ? `${last}, ${first}, ${suffix}` : `${last}, ${first}`;
}

/** Sort name for one artist credit, following the filing rules above. */
export function artistSortName(rawName: string): string {
  let name = stripDisambiguation(rawName);
  // "Count Basie And His Orchestra" -> "Count Basie"
  const leaderOfHis = name.replace(HIS_ORCHESTRA, '');
  if (leaderOfHis !== name) return artistSortName(leaderOfHis);
  // "Art Blakey & The Jazz Messengers" -> "Art Blakey" (first-billed)
  const parts = name.split(COLLAB_SPLIT);
  if (parts.length > 1 && parts[0]) name = parts[0].trim();
  if (name.includes(',')) return name; // "Lambert, Hendricks & Ross" style or "Last, First"

  const hadThe = /^the\s+/i.test(name);
  const bare = stripLeadingThe(name);
  const leader = bare.replace(ENSEMBLE_SUFFIX, '');
  if (leader !== bare && looksLikePerson(leader)) return personSortName(leader); // "Oscar Peterson Trio"
  if (hadThe || leader !== bare) return bare; // a band: "Modern Jazz Quartet", "Four Freshmen"
  if (looksLikePerson(bare)) return personSortName(bare);
  return bare;
}

export function isVarious(artists: SortNameInput['artists']): boolean {
  return artists.length > 0 && /^various( artists)?$/i.test(stripDisambiguation(artists[0]!.name));
}

/** The default sort name for a record, before any manual override. */
export function defaultSortName(input: SortNameInput): string {
  if (input.genres?.some((g) => /classical/i.test(g))) {
    const composer = input.extraartists?.find((a) => /\bcompos/i.test(a.role));
    if (composer) return personSortName(composer.name);
  }
  if (!input.artists.length || isVarious(input.artists)) return stripLeadingThe(input.title.trim());
  return artistSortName(input.artists[0]!.name);
}

/** Normalised key for comparing sort names: case- and accent-insensitive. */
export function sortKey(sortName: string): string {
  return sortName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9, ]+/g, '')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The short surname-ish label used in "between Monk and Parker". */
export function shortShelfLabel(sortName: string): string {
  const head = sortName.split(',')[0]!.trim();
  return head.length > 24 ? `${head.slice(0, 22)}…` : head;
}
