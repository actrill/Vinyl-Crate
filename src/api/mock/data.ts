// Sample collection used when you sign in with the username "demo".
// It exists so the UI can be built and tested without touching the Discogs API.
// Titles and personnel are real jazz records, but ids, catalog numbers,
// conditions, dates and prices here are illustrative, not authoritative.

export interface MockRecord {
  id: number;
  folder: number;
  artists: Array<[name: string, join?: string]>;
  title: string;
  year: number;
  released: string;
  master?: { id: number; year: number; released: string };
  label: string;
  catno: string;
  formats: string[];
  country: string;
  genres: string[];
  styles: string[];
  tracks?: Array<[pos: string, title: string, dur: string]>;
  credits: Array<[name: string, role: string]>;
  media: string;
  sleeve: string;
  notes?: string;
  rating: number;
  value: number; // VG+ price in USD
  images: number; // 1 = front only, 2 = +back, 4 = +labels
  dateAdded: string;
}

const today = new Date();
const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export const MOCK_FOLDERS: Array<{ id: number; name: string }> = [
  { id: 0, name: 'All' },
  { id: 1, name: 'Uncategorized' },
  { id: 101, name: '01 Big Band & Swing' },
  { id: 102, name: '02 Bebop & Hard Bop' },
  { id: 103, name: '03 Cool & West Coast' },
  { id: 104, name: '04 Modal, Post-Bop & Avant-Garde' },
  { id: 105, name: '05 Piano' },
  { id: 106, name: '06 Vocal & Groups' },
  { id: 107, name: '07 Classical' },
];

export const MOCK_FIELDS = [
  { id: 1, name: 'Media Condition', type: 'dropdown', position: 1, public: true,
    options: ['Mint (M)', 'Near Mint (NM or M-)', 'Very Good Plus (VG+)', 'Very Good (VG)', 'Good Plus (G+)', 'Good (G)', 'Fair (F)', 'Poor (P)'] },
  { id: 2, name: 'Sleeve Condition', type: 'dropdown', position: 2, public: true,
    options: ['Generic', 'No Cover', 'Mint (M)', 'Near Mint (NM or M-)', 'Very Good Plus (VG+)', 'Very Good (VG)', 'Good Plus (G+)', 'Good (G)', 'Fair (F)', 'Poor (P)'] },
  { id: 3, name: 'Notes', type: 'textarea', position: 3, public: false, lines: 3 },
];

const VGP = 'Very Good Plus (VG+)';
const NM = 'Near Mint (NM or M-)';
const VG = 'Very Good (VG)';

export const MOCK_RECORDS: MockRecord[] = [
  { id: 900001, folder: 101, artists: [['Count Basie And His Orchestra']], title: 'April in Paris', year: 1957, released: '1957',
    master: { id: 800001, year: 1956, released: '1956-00-00' }, label: 'Verve Records', catno: 'MGV-8012', formats: ['LP', 'Album', 'Mono'],
    country: 'US', genres: ['Jazz'], styles: ['Big Band', 'Swing'], credits: [['Thad Jones', 'Trumpet'], ['Frank Foster', 'Tenor Saxophone'], ['Freddie Green', 'Guitar']],
    media: VGP, sleeve: VG, rating: 4, value: 28, images: 2, dateAdded: '2021-03-02T10:12:00-08:00' },
  { id: 900002, folder: 101, artists: [['Duke Ellington And His Orchestra']], title: 'Ellington at Newport', year: 1956, released: '1956-00-00',
    label: 'Columbia', catno: 'CL 934', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Big Band', 'Swing'],
    credits: [['Paul Gonsalves', 'Tenor Saxophone'], ['Johnny Hodges', 'Alto Saxophone'], ['Sam Woodyard', 'Drums']],
    media: VG, sleeve: VG, rating: 5, value: 22, images: 4, dateAdded: '2020-11-14T09:00:00-08:00', notes: 'Paul Gonsalves solo on side B. Light surface noise.' },
  { id: 900003, folder: 101, artists: [['The Jonah Jones Quartet']], title: 'Muted Jazz', year: 1957, released: '1957',
    label: 'Capitol Records', catno: 'T839', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Swing'],
    credits: [['Jonah Jones', 'Trumpet'], ['Hank Jones', 'Piano']], media: VGP, sleeve: VGP, rating: 3, value: 9, images: 1, dateAdded: '2022-06-20T12:00:00-07:00' },
  { id: 900004, folder: 101, artists: [['Various']], title: 'The Great Swing Bands', year: 1960, released: '1960',
    label: 'RCA Camden', catno: 'CAL-555', formats: ['LP', 'Compilation', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Swing', 'Big Band'],
    credits: [['Benny Goodman', 'Performer'], ['Tommy Dorsey', 'Performer']], media: VG, sleeve: VG, rating: 2, value: 5, images: 1, dateAdded: '2019-08-01T12:00:00-07:00' },

  { id: 900010, folder: 102, artists: [['Thelonious Monk']], title: 'Brilliant Corners', year: 1957, released: '1957-00-00',
    label: 'Riverside Records', catno: 'RLP 12-226', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Hard Bop'],
    credits: [['Sonny Rollins', 'Tenor Saxophone'], ['Ernie Henry', 'Alto Saxophone'], ['Oscar Pettiford', 'Bass'], ['Max Roach', 'Drums'], ['Clark Terry', 'Trumpet'], ['Paul Chambers', 'Bass']],
    media: VGP, sleeve: VGP, rating: 5, value: 60, images: 4, dateAdded: '2018-02-10T12:00:00-08:00' },
  { id: 900011, folder: 102, artists: [['Sonny Rollins']], title: 'Saxophone Colossus', year: 1956, released: '1956-00-00',
    label: 'Prestige', catno: 'PRLP 7079', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Hard Bop'],
    tracks: [['A1', 'St. Thomas', '6:50'], ['A2', "You Don't Know What Love Is", '6:30'], ['A3', 'Strode Rode', '5:17'], ['B1', 'Moritat', '10:05'], ['B2', 'Blue 7', '11:17']],
    credits: [['Tommy Flanagan', 'Piano'], ['Doug Watkins', 'Bass'], ['Max Roach', 'Drums'], ['Rudy Van Gelder', 'Recorded By']],
    media: NM, sleeve: VGP, rating: 5, value: 45, images: 4, dateAdded: '2018-05-21T12:00:00-07:00' },
  { id: 900012, folder: 102, artists: [['Art Blakey & The Jazz Messengers']], title: "Moanin'", year: 1959, released: '1959-00-00',
    label: 'Blue Note', catno: 'BLP 4003', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Hard Bop'],
    tracks: [['A1', "Moanin'", '9:35'], ['A2', 'Are You Real', '4:45'], ['A3', 'Along Came Betty', '6:12'], ['B1', 'The Drum Thunder Suite', '7:28'], ['B2', 'Blues March', '6:15'], ['B3', 'Come Rain or Come Shine', '5:48']],
    credits: [['Lee Morgan', 'Trumpet'], ['Benny Golson', 'Tenor Saxophone'], ['Bobby Timmons', 'Piano'], ['Jymie Merritt', 'Bass'], ['Rudy Van Gelder', 'Recorded By']],
    media: VGP, sleeve: VG, rating: 5, value: 55, images: 4, dateAdded: '2017-12-25T12:00:00-08:00' },
  { id: 900013, folder: 102, artists: [['Cannonball Adderley']], title: 'Somethin\' Else', year: 1958, released: '1958-00-00',
    label: 'Blue Note', catno: 'BLP 1595', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Hard Bop'],
    tracks: [['A1', 'Autumn Leaves', '10:59'], ['A2', 'Love for Sale', '7:01'], ['B1', "Somethin' Else", '8:15'], ['B2', 'One for Daddy-O', '8:26'], ['B3', 'Dancing in the Dark', '4:07']],
    credits: [['Miles Davis', 'Trumpet'], ['Hank Jones', 'Piano'], ['Sam Jones', 'Bass'], ['Art Blakey', 'Drums']],
    media: VG, sleeve: VG, rating: 5, value: 40, images: 2, dateAdded: '2019-04-04T12:00:00-07:00' },
  { id: 900014, folder: 102, artists: [['Lee Morgan']], title: 'The Sidewinder', year: 1964, released: '1964-00-00',
    label: 'Blue Note', catno: 'BLP 4157', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Hard Bop', 'Soul-Jazz'],
    credits: [['Joe Henderson', 'Tenor Saxophone'], ['Barry Harris', 'Piano'], ['Bob Cranshaw', 'Bass'], ['Billy Higgins', 'Drums']],
    media: VGP, sleeve: VGP, rating: 4, value: 35, images: 4, dateAdded: '2021-09-09T12:00:00-07:00' },
  { id: 900015, folder: 102, artists: [['Clifford Brown', 'And'], ['Max Roach']], title: 'Clifford Brown & Max Roach', year: 1955, released: '1955',
    label: 'EmArcy', catno: 'MG 36036', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Hard Bop'],
    credits: [['Harold Land', 'Tenor Saxophone'], ['Richie Powell', 'Piano'], ['George Morrow', 'Bass']],
    media: VG, sleeve: 'Good Plus (G+)', rating: 4, value: 18, images: 1, dateAdded: '2016-07-30T12:00:00-07:00' },
  { id: 900016, folder: 102, artists: [['Charlie Parker']], title: 'Bird and Diz', year: 1956, released: '1956',
    label: 'Verve Records', catno: 'MGV-8006', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Bop'],
    credits: [['Dizzy Gillespie', 'Trumpet'], ['Thelonious Monk', 'Piano'], ['Curley Russell', 'Bass'], ['Buddy Rich', 'Drums']],
    media: VG, sleeve: VG, rating: 4, value: 20, images: 2, dateAdded: '2020-01-15T12:00:00-08:00' },

  { id: 900020, folder: 103, artists: [['The Dave Brubeck Quartet']], title: 'Time Out', year: 1959, released: '1959-12-14',
    label: 'Columbia', catno: 'CS 8192', formats: ['LP', 'Album', 'Stereo'], country: 'US', genres: ['Jazz'], styles: ['Cool Jazz'],
    tracks: [['A1', 'Blue Rondo à la Turk', '6:44'], ['A2', 'Strange Meadow Lark', '7:22'], ['A3', 'Take Five', '5:24'], ['B1', 'Three to Get Ready', '5:24'], ['B2', "Kathy's Waltz", '4:48'], ['B3', "Everybody's Jumpin'", '4:23'], ['B4', 'Pick Up Sticks', '4:16']],
    credits: [['Paul Desmond', 'Alto Saxophone'], ['Eugene Wright', 'Bass'], ['Joe Morello', 'Drums'], ['Teo Macero', 'Producer']],
    media: NM, sleeve: VGP, rating: 5, value: 30, images: 4, dateAdded: '2015-12-14T12:00:00-08:00' },
  { id: 900021, folder: 103, artists: [['Chet Baker']], title: 'Chet Baker Sings', year: 1956, released: '1956',
    master: { id: 800021, year: 1954, released: '1954-00-00' }, label: 'Pacific Jazz', catno: 'PJ-1222', formats: ['LP', 'Album', 'Mono'],
    country: 'US', genres: ['Jazz'], styles: ['Cool Jazz', 'Vocal'], credits: [['Russ Freeman', 'Piano'], ['Carson Smith', 'Bass']],
    media: VGP, sleeve: VG, rating: 4, value: 25, images: 2, dateAdded: '2019-10-10T12:00:00-07:00' },
  { id: 900022, folder: 103, artists: [['The Modern Jazz Quartet']], title: 'Django', year: 1956, released: '1956',
    label: 'Prestige', catno: 'PRLP 7057', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Cool Jazz'],
    credits: [['John Lewis', 'Piano'], ['Milt Jackson', 'Vibraphone'], ['Percy Heath', 'Bass'], ['Kenny Clarke', 'Drums']],
    media: VGP, sleeve: VGP, rating: 4, value: 24, images: 2, dateAdded: '2018-03-03T12:00:00-08:00' },
  { id: 900023, folder: 103, artists: [['Stan Getz', '&'], ['João Gilberto']], title: 'Getz / Gilberto', year: 1964, released: '1964-00-00',
    label: 'Verve Records', catno: 'V6-8545', formats: ['LP', 'Album', 'Stereo'], country: 'US', genres: ['Jazz', 'Latin'], styles: ['Bossa Nova'],
    credits: [['Antonio Carlos Jobim', 'Piano'], ['Astrud Gilberto', 'Vocals'], ['Milton Banana', 'Drums']],
    media: VGP, sleeve: VGP, rating: 5, value: 32, images: 4, dateAdded: '2022-02-02T12:00:00-08:00' },
  { id: 900024, folder: 103, artists: [['Gerry Mulligan Quartet']], title: 'Gerry Mulligan Quartet', year: 1953, released: '1953',
    label: 'Pacific Jazz', catno: 'PJLP-1', formats: ['LP', '10"', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Cool Jazz'],
    credits: [['Chet Baker', 'Trumpet'], ['Bob Whitlock', 'Bass'], ['Chico Hamilton', 'Drums']],
    media: VG, sleeve: VG, rating: 3, value: 15, images: 1, dateAdded: '2023-01-12T12:00:00-08:00' },

  { id: 900030, folder: 104, artists: [['Miles Davis']], title: 'Kind of Blue', year: 1997, released: '1997-00-00',
    master: { id: 800030, year: 1959, released: '1959-08-17' }, label: 'Columbia', catno: 'CS 8163', formats: ['LP', 'Album', 'Reissue', 'Stereo', '180 Gram'],
    country: 'US', genres: ['Jazz'], styles: ['Modal'],
    tracks: [['A1', 'So What', '9:22'], ['A2', 'Freddie Freeloader', '9:46'], ['A3', 'Blue in Green', '5:37'], ['B1', 'All Blues', '11:33'], ['B2', 'Flamenco Sketches', '9:26']],
    credits: [['John Coltrane', 'Tenor Saxophone'], ['Cannonball Adderley', 'Alto Saxophone'], ['Bill Evans', 'Piano'], ['Wynton Kelly', 'Piano'], ['Paul Chambers', 'Bass'], ['Jimmy Cobb', 'Drums'], ['Teo Macero', 'Producer']],
    media: NM, sleeve: NM, rating: 5, value: 26, images: 4, dateAdded: '2014-08-17T12:00:00-07:00', notes: 'Bought at the record fair. Plays dead quiet.' },
  { id: 900031, folder: 104, artists: [['John Coltrane']], title: 'A Love Supreme', year: 1965, released: '1965-00-00',
    label: 'Impulse!', catno: 'A-77', formats: ['LP', 'Album', 'Mono', 'Gatefold'], country: 'US', genres: ['Jazz'], styles: ['Modal', 'Post Bop'],
    tracks: [['A1', 'Part I – Acknowledgement', '7:47'], ['A2', 'Part II – Resolution', '7:22'], ['B1', 'Part III – Pursuance', '10:42'], ['B2', 'Part IV – Psalm', '7:05']],
    credits: [['McCoy Tyner', 'Piano'], ['Jimmy Garrison', 'Bass'], ['Elvin Jones', 'Drums'], ['Rudy Van Gelder', 'Recorded By']],
    media: VGP, sleeve: VGP, rating: 5, value: 90, images: 4, dateAdded: '2016-12-09T12:00:00-08:00' },
  { id: 900032, folder: 104, artists: [['Duke Ellington', '&'], ['John Coltrane']], title: 'Duke Ellington & John Coltrane', year: 1963, released: '1963',
    label: 'Impulse!', catno: 'A-30', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Post Bop'],
    credits: [['Jimmy Garrison', 'Bass'], ['Aaron Bell', 'Bass'], ['Elvin Jones', 'Drums'], ['Sam Woodyard', 'Drums']],
    media: VG, sleeve: VG, rating: 4, value: 30, images: 2, dateAdded: '2020-06-06T12:00:00-07:00' },
  { id: 900033, folder: 104, artists: [['Ornette Coleman']], title: 'The Shape of Jazz to Come', year: 1959, released: '1959-00-00',
    label: 'Atlantic', catno: '1317', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Free Jazz'],
    credits: [['Don Cherry', 'Cornet'], ['Charlie Haden', 'Bass'], ['Billy Higgins', 'Drums']],
    media: VGP, sleeve: VG, rating: 4, value: 50, images: 1, dateAdded: '2021-01-01T12:00:00-08:00' },
  { id: 900034, folder: 104, artists: [['Eric Dolphy']], title: 'Out to Lunch!', year: 1964, released: '1964-00-00',
    label: 'Blue Note', catno: 'BLP 4163', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Free Jazz', 'Post Bop'],
    credits: [['Freddie Hubbard', 'Trumpet'], ['Bobby Hutcherson', 'Vibraphone'], ['Richard Davis', 'Bass'], ['Tony Williams', 'Drums']],
    media: NM, sleeve: NM, rating: 5, value: 70, images: 4, dateAdded: '2023-05-05T12:00:00-07:00' },
  { id: 900035, folder: 104, artists: [['Charles Mingus']], title: 'Mingus Ah Um', year: 1959, released: '1959-10-14',
    label: 'Columbia', catno: 'CL 1370', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Post Bop'],
    credits: [['Booker Ervin', 'Tenor Saxophone'], ['John Handy', 'Alto Saxophone'], ['Jimmy Knepper', 'Trombone'], ['Horace Parlan', 'Piano'], ['Dannie Richmond', 'Drums']],
    media: VGP, sleeve: VGP, rating: 5, value: 38, images: 2, dateAdded: '2017-04-01T12:00:00-07:00' },

  { id: 900040, folder: 105, artists: [['Ahmad Jamal']], title: 'At the Pershing: But Not for Me', year: 1958, released: '1958',
    label: 'Argo', catno: 'LP 628', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Cool Jazz'],
    credits: [['Israel Crosby', 'Bass'], ['Vernel Fournier', 'Drums']], media: VGP, sleeve: VG, rating: 5, value: 28, images: 2, dateAdded: '2019-02-14T12:00:00-08:00' },
  { id: 900041, folder: 105, artists: [['Oscar Peterson Trio']], title: 'Night Train', year: 1963, released: '1963',
    label: 'Verve Records', catno: 'V6-8538', formats: ['LP', 'Album', 'Stereo'], country: 'US', genres: ['Jazz'], styles: ['Swing'],
    credits: [['Ray Brown', 'Bass'], ['Ed Thigpen', 'Drums']], media: NM, sleeve: VGP, rating: 5, value: 24, images: 4, dateAdded: '2018-11-11T12:00:00-08:00' },
  { id: 900042, folder: 105, artists: [['Jacques Loussier Trio']], title: 'Play Bach No. 1', year: 1959, released: '1959',
    label: 'Decca', catno: '153.067', formats: ['LP', 'Album', 'Mono'], country: 'France', genres: ['Jazz', 'Classical'], styles: ['Cool Jazz', 'Baroque'],
    credits: [['Pierre Michelot', 'Bass'], ['Christian Garros', 'Drums']], media: VG, sleeve: VG, rating: 3, value: 12, images: 1, dateAdded: '2022-08-08T12:00:00-07:00' },
  { id: 900043, folder: 105, artists: [['Bill Evans Trio']], title: 'Waltz for Debby', year: 1962, released: '1962-00-00',
    label: 'Riverside Records', catno: 'RLP 399', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Post Bop'],
    credits: [['Scott LaFaro', 'Bass'], ['Paul Motian', 'Drums']], media: VGP, sleeve: VGP, rating: 5, value: 48, images: 4, dateAdded: '2017-06-25T12:00:00-07:00' },
  { id: 900044, folder: 105, artists: [['Red Garland Trio']], title: 'Groovy', year: 1957, released: '1957',
    label: 'Prestige', catno: 'PRLP 7113', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Hard Bop'],
    credits: [['Paul Chambers', 'Bass'], ['Art Taylor', 'Drums']], media: VG, sleeve: VG, rating: 4, value: 30, images: 1, dateAdded: '2024-02-02T12:00:00-08:00' },

  { id: 900050, folder: 106, artists: [['The Four Freshmen']], title: 'Four Freshmen and 5 Trombones', year: 1955, released: '1955',
    label: 'Capitol Records', catno: 'T683', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz', 'Pop'], styles: ['Vocal'],
    credits: [['Pete Rugolo', 'Arranged By']], media: VGP, sleeve: VG, rating: 3, value: 8, images: 1, dateAdded: '2021-07-04T12:00:00-07:00' },
  { id: 900051, folder: 106, artists: [['Ella Fitzgerald']], title: 'Ella Fitzgerald Sings the Cole Porter Song Book', year: 1956, released: '1956',
    label: 'Verve Records', catno: 'MGV-4001-2', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Vocal'],
    credits: [['Buddy Bregman', 'Arranged By'], ['Cole Porter', 'Written-By']], media: VGP, sleeve: VGP, rating: 5, value: 26, images: 2, dateAdded: '2020-04-25T12:00:00-07:00' },
  // Release date set to today's month and day so the "On this day" strip has something to show in demo mode.
  { id: 900052, folder: 106, artists: [['Billie Holiday']], title: 'Lady in Satin', year: 1958, released: `1958-${mmdd}`,
    label: 'Columbia', catno: 'CL 1157', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Vocal'],
    credits: [['Ray Ellis', 'Arranged By'], ['Ray Ellis', 'Conductor']], media: VG, sleeve: VG, rating: 4, value: 22, images: 2, dateAdded: '2019-07-17T12:00:00-07:00' },
  { id: 900053, folder: 106, artists: [['Lambert, Hendricks & Ross']], title: 'Sing a Song of Basie', year: 1958, released: '1958',
    label: 'ABC-Paramount', catno: 'ABC-223', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Jazz'], styles: ['Vocal'],
    credits: [['Dave Lambert', 'Vocals'], ['Jon Hendricks', 'Vocals'], ['Annie Ross', 'Vocals']], media: VGP, sleeve: VG, rating: 4, value: 14, images: 1, dateAdded: '2022-10-10T12:00:00-07:00' },

  { id: 900060, folder: 107, artists: [['Glenn Gould']], title: 'Bach: The Goldberg Variations', year: 1956, released: '1956',
    label: 'Columbia Masterworks', catno: 'ML 5060', formats: ['LP', 'Album', 'Mono'], country: 'US', genres: ['Classical'], styles: ['Baroque'],
    credits: [['Johann Sebastian Bach', 'Composed By'], ['Howard H. Scott', 'Producer']], media: VGP, sleeve: VG, rating: 5, value: 40, images: 2, dateAdded: '2018-09-25T12:00:00-07:00' },
  { id: 900061, folder: 107, artists: [['Leonard Bernstein', ','], ['Columbia Symphony Orchestra']], title: 'Rhapsody in Blue / An American in Paris', year: 1959, released: '1959',
    label: 'Columbia Masterworks', catno: 'MS 6091', formats: ['LP', 'Album', 'Stereo'], country: 'US', genres: ['Classical'], styles: ['Modern'],
    credits: [['George Gershwin', 'Composed By']], media: VGP, sleeve: VGP, rating: 4, value: 10, images: 1, dateAdded: '2023-03-03T12:00:00-08:00' },
];
