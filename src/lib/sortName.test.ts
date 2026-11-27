import { describe, expect, it } from 'vitest';
import { artistSortName, defaultSortName, personSortName, sortKey } from './sortName';
import { computeShelf, describeNeighbours, type ShelfEntry } from './shelf';

const rec = (name: string, title = 'Album', extra: Partial<Parameters<typeof defaultSortName>[0]> = {}) =>
  defaultSortName({ artists: [{ name }], title, ...extra });

describe('artist sort names (spec examples)', () => {
  it.each([
    ['Ahmad Jamal', 'Jamal, Ahmad'],
    ['Oscar Peterson Trio', 'Peterson, Oscar'],
    ['Jacques Loussier Trio', 'Loussier, Jacques'],
    ['The Jonah Jones Quartet', 'Jones, Jonah'],
    ['The Modern Jazz Quartet', 'Modern Jazz Quartet'],
    ['The Four Freshmen', 'Four Freshmen'],
  ])('%s -> %s', (name, expected) => {
    expect(rec(name)).toBe(expected);
  });

  it('files the examples under the right letters', () => {
    expect(rec('Ahmad Jamal')[0]).toBe('J');
    expect(rec('Oscar Peterson Trio')[0]).toBe('P');
    expect(rec('Jacques Loussier Trio')[0]).toBe('L');
    expect(rec('The Jonah Jones Quartet')[0]).toBe('J');
    expect(rec('The Modern Jazz Quartet')[0]).toBe('M');
    expect(rec('The Four Freshmen')[0]).toBe('F');
  });
});

describe('more filing rules', () => {
  it('handles "And His Orchestra" leaders', () => {
    expect(artistSortName('Count Basie And His Orchestra')).toBe('Basie, Count');
    expect(artistSortName('Duke Ellington & His Orchestra')).toBe('Ellington, Duke');
  });
  it('uses the leader of "X & The Band" names', () => {
    expect(artistSortName('Art Blakey & The Jazz Messengers')).toBe('Blakey, Art');
  });
  it('files collaborations under the first-billed artist', () => {
    expect(defaultSortName({ artists: [{ name: 'Duke Ellington', join: '&' }, { name: 'John Coltrane' }], title: 'x' })).toBe('Ellington, Duke');
    expect(defaultSortName({ artists: [{ name: 'Stan Getz', join: '&' }, { name: 'João Gilberto' }], title: 'x' })).toBe('Getz, Stan');
  });
  it('files Various compilations by title, ignoring a leading The', () => {
    expect(defaultSortName({ artists: [{ name: 'Various' }], title: 'The Great Swing Bands' })).toBe('Great Swing Bands');
    expect(defaultSortName({ artists: [{ name: 'Various' }], title: 'Jazz at the Philharmonic' })).toBe('Jazz at the Philharmonic');
  });
  it('files classical records under the composer', () => {
    expect(defaultSortName({
      artists: [{ name: 'Glenn Gould' }], title: 'Goldberg Variations', genres: ['Classical'],
      extraartists: [{ name: 'Howard H. Scott', role: 'Producer' }, { name: 'Johann Sebastian Bach', role: 'Composed By' }],
    })).toBe('Bach, Johann Sebastian');
  });
  it('falls back to the performer for classical without a composer credit', () => {
    expect(defaultSortName({ artists: [{ name: 'Glenn Gould' }], title: 'x', genres: ['Classical'] })).toBe('Gould, Glenn');
  });
  it('strips Discogs disambiguation numbers', () => {
    expect(artistSortName('Bill Evans (2)')).toBe('Evans, Bill');
  });
  it('keeps particles and suffixes with the surname', () => {
    expect(personSortName('Rudy Van Gelder')).toBe('Van Gelder, Rudy');
    expect(personSortName('Harry Connick Jr.')).toBe('Connick, Harry, Jr.');
  });
  it('leaves single names and named bands alone', () => {
    expect(artistSortName('Bird')).toBe('Bird');
    expect(artistSortName('Weather Report')).toBe('Weather Report');
    expect(artistSortName('Columbia Symphony Orchestra')).toBe('Columbia Symphony Orchestra');
  });
});

describe('sort keys and shelf order', () => {
  it('ignores case and accents', () => {
    expect(sortKey('Gilberto, João')).toBe(sortKey('gilberto, joao'));
  });

  const e = (instanceId: number, sortName: string, year: number | null, title: string, folderId = 1): ShelfEntry =>
    ({ instanceId, folderId, sortName, year, title });

  it('orders by sort name, then original year, then title', () => {
    const shelf = computeShelf([
      e(1, 'Monk, Thelonious', 1957, 'Brilliant Corners'),
      e(2, 'Davis, Miles', 1959, 'Kind of Blue'),
      e(3, 'Davis, Miles', 1956, "Cookin'"),
      e(4, 'Parker, Charlie', 1956, 'Bird and Diz'),
      e(5, 'Davis, Miles', 1956, 'Relaxin\''),
      e(6, 'Jamal, Ahmad', 1958, 'At the Pershing'),
    ]);
    const order = [...shelf.entries()].sort((a, b) => a[1].slot - b[1].slot).map(([id]) => id);
    expect(order).toEqual([3, 5, 2, 6, 1, 4]);
    expect(shelf.get(1)).toMatchObject({ slot: 5, of: 6, before: 'Jamal', after: 'Parker' });
    expect(describeNeighbours(shelf.get(1)!)).toBe('between Jamal and Parker');
  });

  it('computes positions per folder', () => {
    const shelf = computeShelf([e(1, 'B', 1, 'x', 1), e(2, 'A', 1, 'x', 2), e(3, 'A', 1, 'x', 1)]);
    expect(shelf.get(1)).toMatchObject({ slot: 2, of: 2, folderId: 1 });
    expect(shelf.get(2)).toMatchObject({ slot: 1, of: 1, folderId: 2 });
  });

  it('puts "Jones, Jonah" before "Jonesy"', () => {
    const shelf = computeShelf([e(1, 'Jonesy', null, 'x'), e(2, 'Jones, Jonah', null, 'x')]);
    expect(shelf.get(2)!.slot).toBe(1);
  });
});
