// Weekly update, week of 2026-11-02 (run late, on 2026-11-10, because the Sunday run was missed).
// Sources: the research threads' inbox files (inbox/2026-11-W45-*.md, inbox/2026-11-W46-trip-hop.md),
// the Spotify intake of 07–09 Nov and Arthur's own words in the threads.
// Canon only: nodes that came up in a thread where Arthur reacted (words or a Spotify like), plus the minimum
// history around them. Recommendations nobody reacted to stay in the Spotify playlists, not on the map.
import type { Entity, Relation, RelationType, Confidence, CountryCode, YearSpan } from '../schema';

const a = (slug: string, name: string, country: CountryCode | undefined, city: string | undefined,
  years: YearSpan | undefined, summary: string, extra: Partial<Entity> = {}): Entity => ({
  id: `artist:${slug}`, type: 'artist', name, country, city: city ? `city:${city}` : undefined, years, summary,
  confidence: 'established', author: 'claude', ...extra,
});
const person = { attrs: { person: true } };

const r = (slug: string, artist: string, name: string, year: number, styles: string[], summary?: string,
  extra: Partial<Entity> = {}): Entity => ({
  id: `release:${slug}`, type: 'release', name, years: { from: year }, summary, confidence: 'established', author: 'claude',
  ...extra, attrs: { artist: `artist:${artist}`, releaseType: 'album', styles: styles.map((s) => `genre:${s}`), ...(extra.attrs ?? {}) },
});

const t = (slug: string, artist: string, name: string, release: string | undefined,
  confidence: Confidence = 'established', note?: string): Entity => ({
  id: `track:${slug}`, type: 'track', name, confidence, note, author: 'claude',
  attrs: { artist: `artist:${artist}`, release: release ? `release:${release}` : undefined },
});

export const weekEntities: Entity[] = [
  // ---------- context ----------
  { id: 'city:mexico-city', type: 'city', name: 'Mexico City', country: 'MX', confidence: 'established', author: 'claude',
    summary: 'База LATIN MAFIA; тут же дописали 9 months & 50 hours під час 50-годинного стріму.' },
  { id: 'label:hyperdub', type: 'label', name: 'Hyperdub', city: 'city:london', years: { from: 2004 }, confidence: 'established', author: 'claude',
    summary: 'Лондонський лейбл Kode9 (Steve Goodman): dubstep, UK funky, footwork. Видав обидва альбоми Burial.' },
  { id: 'concept:vocal-chops', type: 'concept', name: 'Voice as instrument', aliases: ['vocal chops'], confidence: 'established', author: 'claude',
    attrs: { kind: 'technique' },
    summary: 'Голос нарізають семплером на склади й фрагменти, і він звучить як ще один інструмент, а не як носій тексту.' },
  { id: 'concept:spoken-word', type: 'concept', name: 'Spoken word', confidence: 'established', author: 'claude',
    attrs: { kind: 'technique' },
    summary: 'Слова в музиці не співаються, а промовляються чи декламуються. Артур назвав це «spell words».' },

  // ---------- Fred again.., LATIN MAFIA, UK bass ----------
  a('fred-again', 'Fred again..', 'GB', 'london', { from: 2014, approx: true },
    'Фредерік Гібсон (нар. 1993). Підлітком потрапив в a cappella групу вдома в Brian Eno і став його учнем. Серія Actual Life будується з голосових нотаток і чужих відео; Actual Life 3 отримав Grammy (2024).', person),
  a('latin-mafia', 'LATIN MAFIA', 'MX', 'mexico-city', undefined,
    'Брати de la Rosa: близнюки Milton і Emilio (вокал) і старший Mike (продюсер). Родом з Монтеррея, база в Мехіко. Billboard описує дебют як інді-рок, гранж і «ethereal trip-hop».',
    { confidence: 'likely', note: 'Місто походження в джерелах розходиться (Монтеррей / Мехіко).' }),
  a('burial', 'Burial', 'GB', 'london', { from: 2005 },
    'Вільям Бевен з південного Лондона. Untrue (2007) на Hyperdub: тріск вінілу, ламаний garage-ритм, порізані «привидні» вокали. Роками зберігав анонімність.', person),
  a('four-tet', 'Four Tet', 'GB', 'london', { from: 1998 },
    'Кіран Гебден. Електроніка на межі folktronica, IDM і house; лейбл Text Records. Спільні платівки з Burial, сети з Fred again.. і Skrillex.', person),
  a('jon-hopkins', 'Jon Hopkins', 'GB', 'london', { from: 2001, approx: true },
    'Британський продюсер між ambient і techno; Immunity (2013). Працював з Brian Eno, новий «Open Eye Signal» є на 9 months & 50 hours.', person),
  a('skepta', 'Skepta', 'GB', 'london', { from: 2003, approx: true },
    'Джозеф Аденуга з Тоттенгема, одне з головних облич grime. Konnichiwa (2016) отримав Mercury Prize. The Fork and Knife (2026) — шостий альбом.', person),

  // ---------- Brian Eno & ambient ----------
  a('brian-eno', 'Brian Eno', 'GB', undefined, { from: 1971 },
    'Британський композитор і продюсер. Почав у Roxy Music (1971–73), потім сольні альбоми й ambient. Продюсував Talking Heads, Боуї й U2. Ментор Fred again..', person),

  // ---------- reggae & dub ----------
  a('horace-andy', 'Horace Andy', 'JM', 'kingston', { from: 1970, approx: true },
    'Ямайський співак з високим тремтливим голосом; «Skylarking» (1972). Співає на кожному альбомі Massive Attack, від Blue Lines.', person),
  a('mad-professor', 'Mad Professor', 'GB', 'london', { from: 1979 },
    'Ніл Фрейзер, родом з Гаяни; лондонська студія й лейбл Ariwa. Один з головних британських даб-продюсерів. No Protection (1995) — даб-версія Protection Massive Attack.', person),
  a('bob-marley', 'Bob Marley & The Wailers', 'JM', 'kingston', { from: 1963, to: 1981 },
    'Гурт, що виніс roots reggae у світ. Exodus (1977) записаний у Лондоні під час вигнання після замаху на Марлі.'),
  a('stephen-marley', 'Stephen Marley', 'JM', undefined, { from: 1979, approx: true },
    'Син Боба Марлі, співак і продюсер реґі; починав дитиною в Ziggy Marley and the Melody Makers. Разом з Erykah Badu написав і спродюсував «In Love with You».', person),

  // ---------- soul & hip-hop roots ----------
  a('michael-kiwanuka', 'Michael Kiwanuka', 'GB', 'london', { from: 2011, approx: true },
    'Лондонський співак і гітарист угандійського походження: соул 1970-х з психоделічним роком. Love & Hate (2016) спродюсували Danger Mouse та Inflo; альбом Kiwanuka (2019) отримав Mercury Prize.', person),
  a('a-tribe-called-quest', 'A Tribe Called Quest', 'US', 'new-york', { from: 1985 },
    'Гурт з Квінса (Q-Tip, Phife Dawg, Ali Shaheed Muhammad), ядро колективу Native Tongues. Джазові семпли й розслаблений грув. Q-Tip згодом став частиною кола Soulquarians.'),
  a('brand-nubian', 'Brand Nubian', 'US', undefined, { from: 1989 },
    'Хіп-хоп гурт з Нью-Рошелла (штат Нью-Йорк), близький до Native Tongues.', { confidence: 'likely' }),
  a('dr-john', 'Dr. John', 'US', undefined, { from: 1968, to: 2019 },
    'Мак Ребеннек, новоорлеанський піаніст і співак. «Right Place Wrong Time» (1973) записаний з The Meters, продюсер Allen Toussaint.', person),
  a('brook-benton', 'Brook Benton', 'US', undefined, { from: 1958, approx: true, to: 1988 },
    'Соул- і R&B-співак з низьким оксамитовим баритоном. «Rainy Night in Georgia» (1970, пісня Tony Joe White) — його пізній великий хіт.', person),

  // ---------- jazz ----------
  a('bill-evans', 'Bill Evans', 'US', undefined, { from: 1956, to: 1980 },
    'Піаніст, який змінив мову джазового фортепіано: м’які акорди з імпресіонізму і тріо, де бас і барабани розмовляють з роялем на рівних. Грав на Kind of Blue.', person),
  a('miles-davis', 'Miles Davis', 'US', 'new-york', { from: 1945, to: 1991 },
    'Трубач і бендлідер, що кілька разів змінював напрям джазу: cool, modal, fusion. Kind of Blue (1959) — найпродаваніший джазовий альбом.', person),
  a('brad-mehldau', 'Brad Mehldau', 'US', undefined, { from: 1995, approx: true },
    'Піаніст, головний спадкоємець Bill Evans серед сучасних. Грає пісні Radiohead і Nick Drake як джазові стандарти.', person),
  a('charles-mingus', 'Charles Mingus', 'US', undefined, { from: 1943, approx: true, to: 1979 },
    'Контрабасист і композитор, який писав для бенду як для оркестру. Бурхливий, «керований хаос» духових; його слухав Thom Yorke під час Kid A.', person),
  a('jazz-liberatorz', 'Jazz Liberatorz', 'FR', undefined, { from: 2000, approx: true },
    'Французьке продюсерське тріо (DJ Damage, Dusty, Madsci), джазовий хіп-хоп. Альбом Clin d’oeil (2008).', { confidence: 'likely' }),

  // ---------- trip-hop ----------
  a('sneaker-pimps', 'Sneaker Pimps', 'GB', undefined, { from: 1994 },
    'Гурт з Гартлпула. Becoming X (1996) з вокалом Kelli Dayton; «6 Underground» побудований на семплі теми Джона Баррі.'),

  // ---------- releases ----------
  r('another-green-world', 'brian-eno', 'Another Green World', 1975, ['ambient'],
    'Перехід Eno від арт-року до інструментальних «пейзажів»; більшість треків без вокалу.'),
  r('music-for-airports', 'brian-eno', 'Ambient 1: Music for Airports', 1978, ['ambient'],
    'Альбом, у нотатках до якого Eno сформулював ідею ambient: музика «as ignorable as it is interesting».'),
  r('secret-life', 'fred-again', 'Secret Life', 2023, ['ambient'],
    'Fred again.. & Brian Eno: тихий ambient-альбом з голосом Fred’а. Звідси «Cmon», яка потім стала edit-треком на 9 months & 50 hours.'),
  r('nine-months', 'fred-again', '9 months & 50 hours', 2026, [],
    'Fred again.. & LATIN MAFIA, Atlantic Records UK. Дописаний під час 50-годинного стріму в Мехіко; гості Brian Eno, Jon Hopkins, Mabe Fratti. №1 у Billboard Top Latin Pop Albums.'),
  r('untrue', 'burial', 'Untrue', 2007, ['dubstep', 'uk-garage'],
    'Другий альбом Burial: нічний Лондон, порізані R&B-вокали, тріск вінілу. Номінація на Mercury Prize.'),
  r('fork-and-knife', 'skepta', 'The Fork and Knife', 2026, ['grime'],
    'Шостий альбом, перший сольний з 2019. Спирається на sound system, клубну й rave-культуру.', { confidence: 'likely' }),
  r('no-protection', 'massive-attack', 'No Protection', 1995, ['dub'],
    'Massive Attack v Mad Professor: увесь Protection, перероблений у даб.'),
  r('exodus', 'bob-marley', 'Exodus', 1977, ['roots-reggae'],
    'Альбом, записаний у Лондоні; Time назвав його альбомом століття.'),
  r('love-and-hate', 'michael-kiwanuka', 'Love & Hate', 2016, ['soul'],
    'Продюсери Danger Mouse та Inflo. Довгі, кінематографічні соул-полотна; дебютував на 1-му місці у Британії.'),
  r('midnight-marauders', 'a-tribe-called-quest', 'Midnight Marauders', 1993, ['jazzy-hip-hop'],
    'Третій альбом гурту, вершина джазового звуку Native Tongues.'),
  r('kind-of-blue', 'miles-davis', 'Kind of Blue', 1959, ['modal'],
    'Секстет з Coltrane, Cannonball Adderley і Bill Evans. Імпровізації по ладах замість акордів.'),
  r('art-of-the-trio-3', 'brad-mehldau', 'Songs: The Art of the Trio, Vol. 3', 1998, ['contemporary-jazz'],
    'Тріо Mehldau грає власні речі й пісні Radiohead та Nick Drake.'),
  r('mingus-ah-um', 'charles-mingus', 'Mingus Ah Um', 1959, ['hard-bop'],
    'Перший альбом Mingus на Columbia; «Goodbye Pork Pie Hat» — елегія на смерть Lester Young.'),
  r('clin-doeil', 'jazz-liberatorz', 'Clin d’oeil', 2008, ['jazzy-hip-hop'], undefined, { confidence: 'likely' }),
  r('becoming-x', 'sneaker-pimps', 'Becoming X', 1996, ['trip-hop'], 'Дебют гурту на Clean Up Records.'),
  r('false-idols', 'tricky', 'False Idols', 2013, ['trip-hop'], 'Перший альбом на власному лейблі Tricky, False Idols.'),
  r('dial-m-for-monkey', 'bonobo', 'Dial ’M’ for Monkey', 2003, ['downtempo'], 'Перший альбом Bonobo на Ninja Tune.'),
  r('animal-magic', 'bonobo', 'Animal Magic', 2000, ['downtempo'], 'Дебют Bonobo на Tru Thoughts.'),

  // ---------- tracks (only where Arthur reacted: words or a Spotify like) ----------
  t('cmon-edit', 'fred-again', 'Cmon (LATIN MAFIA & Fred edit)', 'nine-months'),
  t('cmon', 'fred-again', 'Cmon', 'secret-life'),
  t('come-on-home', 'fred-again', 'Come On Home', 'secret-life'),
  t('archangel', 'burial', 'Archangel', 'untrue'),
  t('secrets-of-patriarchy', 'skepta', 'Secrets of Patriarchy', 'fork-and-knife'),
  t('victory-lap', 'skepta', 'Victory Lap', 'fork-and-knife', 'established', 'Fred again.., Skepta, PlaqueBoyMax; сингл 2025 року, увійшов до альбому.'),
  t('teardrop-mazaruni', 'massive-attack', 'Teardrop (Mazaruni Dub One)', 'mezzanine', 'established', 'Даб Mad Professor з Mezzanine Deluxe (2019).'),
  t('bumper-ball-dub', 'massive-attack', 'Bumper Ball Dub (Karmacoma)', 'no-protection'),
  t('trinity-dub', 'massive-attack', 'Trinity Dub (Three)', 'no-protection'),
  t('you-are-my-angel', 'horace-andy', 'You Are My Angel', undefined, 'established', 'Артур слухав її на збірці A Serious Thing (2026). Чи це перевидання оригіналу 1970-х — не звірено.'),
  t('natural-mystic', 'bob-marley', 'Natural Mystic', 'exodus'),
  t('in-love-with-you', 'erykah-badu', 'In Love with You (feat. Stephen Marley)', 'mamas-gun', 'established', 'Реґі-балада на класичній гітарі.'),
  t('cold-little-heart', 'michael-kiwanuka', 'Cold Little Heart', 'love-and-hate', 'established', 'Перший трек альбому, 10 хвилин з довгим інструментальним вступом.'),
  t('electric-relaxation', 'a-tribe-called-quest', 'Electric Relaxation', 'midnight-marauders'),
  t('hold-on-brand-nubian', 'brand-nubian', 'Hold On', undefined, 'established', 'З альбому Everything Is Everything (1994).'),
  t('right-place-wrong-time', 'dr-john', 'Right Place Wrong Time', undefined, 'established', 'З альбому In the Right Place (1973).'),
  t('rainy-night-in-georgia', 'brook-benton', 'Rainy Night in Georgia', undefined, 'established', '1970, з альбому Brook Benton Today.'),
  t('everything-in-its-right-place', 'radiohead', 'Everything In Its Right Place', 'kid-a'),
  t('kid-a-track', 'radiohead', 'Kid A', 'kid-a'),
  t('the-national-anthem', 'radiohead', 'The National Anthem', 'kid-a'),
  t('morning-bell', 'radiohead', 'Morning Bell', 'kid-a'),
  t('blue-in-green', 'miles-davis', 'Blue in Green', 'kind-of-blue'),
  t('river-man', 'brad-mehldau', 'River Man', 'art-of-the-trio-3', 'established', 'Пісня Nick Drake.'),
  t('exit-music-mehldau', 'brad-mehldau', 'Exit Music (For a Film)', 'art-of-the-trio-3', 'established', 'Кавер на Radiohead (OK Computer).'),
  t('goodbye-pork-pie-hat', 'charles-mingus', 'Goodbye Pork Pie Hat', 'mingus-ah-um'),
  t('clin-doeil-track', 'jazz-liberatorz', 'Clin d’oeil', 'clin-doeil', 'likely'),
  t('six-underground', 'sneaker-pimps', '6 Underground', 'becoming-x'),
  t('passion-of-the-christ', 'tricky', 'Passion of the Christ', 'false-idols'),
  t('useless-kd', 'depeche-mode', 'Useless (The Kruder + Dorfmeister Session)', undefined, 'established',
    'Ремікс 1997 року на трек з Ultra; увійшов до The K&D Sessions.'),
  t('caruso', 'gavin-friday', 'Caruso', 'shag-tobacco'),
  t('kong', 'bonobo', 'Kong', 'black-sands', 'likely', 'Артур сказав «Конго»; на Black Sands є «Kong», найближчий збіг.'),
  t('incubus', 'recoil', 'Incubus', 'unsound-methods', 'established', 'Перший трек альбому; вокал Douglas McCarthy з Nitzer Ebb (за Discogs).'),
];

let n = 0;
const R = (type: RelationType, from: string, to: string, why: string, confidence: Confidence = 'established',
  author: Relation['author'] = 'claude'): Relation => ({ id: `w46:${++n}`, type, from, to, why, confidence, author });
const A = (s: string) => `artist:${s}`;
const G = (s: string) => `genre:${s}`;
const Rl = (s: string) => `release:${s}`;
const T = (s: string) => `track:${s}`;

export const weekRelations: Relation[] = [
  // ---- style history ----
  R('emerged_from', G('dub'), G('reggae'), 'Інструментальні «версії» реґі-синглів, які ремікшували звукорежисери (King Tubby, Lee Perry).'),
  R('emerged_from', G('uk-garage'), G('house'), 'Американський garage house, прискорений і перероблений у Лондоні.', 'likely'),
  R('influenced', G('jungle'), G('uk-garage'), 'Ламані ритми й важкий бас лондонської jungle-сцени.', 'likely'),
  R('emerged_from', G('dubstep'), G('uk-garage'), 'Темніші, порожніші гілки UK garage у Кройдоні й південному Лондоні.'),
  R('influenced', G('dub'), G('dubstep'), 'Саб-бас і простір даба; звідси й назва.'),
  R('emerged_from', G('grime'), G('uk-garage'), 'Виріс з UK garage і піратських радіо східного Лондона.'),
  R('emerged_from', G('jazzy-hip-hop'), G('hip-hop'), 'Хіп-хоп, що бере джаз за основу семплів.'),
  R('influenced', G('jazz'), G('jazzy-hip-hop'), 'Джазові семпли, гармонії й контрабас.'),

  // ---- artist → style ----
  ...([
    ['brian-eno', 'ambient', 'established'], ['fred-again', 'house', 'likely'], ['latin-mafia', 'latin', 'likely'],
    ['burial', 'dubstep', 'established'], ['burial', 'uk-garage', 'likely'], ['four-tet', 'electronica', 'disputed'],
    ['jon-hopkins', 'ambient', 'likely'], ['jon-hopkins', 'techno', 'likely'], ['skepta', 'grime', 'established'],
    ['horace-andy', 'roots-reggae', 'established'], ['mad-professor', 'dub', 'established'], ['bob-marley', 'roots-reggae', 'established'],
    ['stephen-marley', 'reggae', 'established'], ['michael-kiwanuka', 'soul', 'likely'], ['a-tribe-called-quest', 'jazzy-hip-hop', 'established'],
    ['brand-nubian', 'hip-hop', 'established'], ['dr-john', 'funk', 'likely'], ['brook-benton', 'soul', 'established'],
    ['bill-evans', 'modal', 'likely'], ['miles-davis', 'modal', 'established'], ['brad-mehldau', 'contemporary-jazz', 'likely'],
    ['charles-mingus', 'hard-bop', 'likely'], ['jazz-liberatorz', 'jazzy-hip-hop', 'likely'], ['sneaker-pimps', 'trip-hop', 'established'],
  ] as const).map(([art, st, c]) => R('in_genre', A(art), G(st), 'Зазвичай класифікується в цьому стилі.', c)),

  // ---- facts ----
  R('collaborated', A('brian-eno'), A('fred-again'), 'Secret Life (2023); ще раніше Fred працював з Eno над Someday World (Eno & Hyde, 2014).'),
  R('influenced', A('brian-eno'), A('fred-again'), 'Ментор: Fred підлітком співав в a cappella групі вдома в Eno, потім працював з ним.', 'likely'),
  R('influenced', A('brian-eno'), G('ambient'), 'Сформулював ідею й назву ambient у нотатках до Music for Airports (1978).'),
  R('collaborated', A('fred-again'), A('latin-mafia'), 'Спільний альбом 9 months & 50 hours (2026).'),
  R('collaborated', A('burial'), A('four-tet'), 'Спільні 12" Moth / Wolf Cub (2009) і Nova (2012).'),
  R('collaborated', A('four-tet'), A('fred-again'), 'Спільні сети з Skrillex (Coachella 2023, Madison Square Garden).', 'likely'),
  R('collaborated', A('jon-hopkins'), A('brian-eno'), 'Small Craft on a Milk Sea (2010, Eno, Hopkins, Leo Abrahams).'),
  R('collaborated', A('jon-hopkins'), A('fred-again'), 'Нова версія «Open Eye Signal» на 9 months & 50 hours.'),
  R('collaborated', A('skepta'), A('fred-again'), 'Victory Lap (2025), Rumble (2023, з Skrillex і Flowdan).'),
  R('on_label', Rl('untrue'), 'label:hyperdub', 'Оригінальний реліз 2007 року.'),
  R('signed_to', A('burial'), 'label:hyperdub', 'Обидва альбоми й більшість EP.'),
  R('collaborated', A('horace-andy'), A('massive-attack'), 'Співає на кожному альбомі Massive Attack, від Blue Lines (1991).'),
  R('collaborated', A('mad-professor'), A('massive-attack'), 'No Protection (1995) і даби для Mezzanine Deluxe (2019).'),
  R('influenced', T('you-are-my-angel'), Rl('mezzanine'), '«Angel» на Mezzanine побудований на цій пісні, і співає її знову Horace Andy.'),
  R('collaborated', A('stephen-marley'), A('erykah-badu'), '«In Love with You» на Mama’s Gun (2000).'),
  R('influenced', A('a-tribe-called-quest'), 'scene:soulquarians', 'Q-Tip входив у коло Soulquarians, а J Dilla продюсував з ним у тріо The Ummah.'),
  R('collaborated', A('bill-evans'), A('miles-davis'), 'Evans — піаніст Kind of Blue (1959). Авторство «Blue in Green» спірне: Evans вважав її своєю.'),
  R('influenced', A('radiohead'), T('exit-music-mehldau'), 'Кавер на «Exit Music (For a Film)» з OK Computer (1997).'),
  R('influenced', A('charles-mingus'), A('radiohead'), 'Yorke слухав Mingus під час Kid A; мідна секція «The National Anthem» — свідома данина.', 'likely'),
  R('collaborated', A('kruder-dorfmeister'), A('depeche-mode'), 'Ремікс «Useless (The Kruder + Dorfmeister Session)», 1997.'),

  // ---- concepts ----
  R('demonstrates', T('everything-in-its-right-place'), 'concept:vocal-chops', 'Jonny Greenwood наживо ріже голос Yorke семплером.'),
  R('demonstrates', Rl('untrue'), 'concept:vocal-chops', 'Порізані й транспоновані вокальні семпли — підпис Burial.'),
  R('demonstrates', T('incubus'), 'concept:spoken-word', 'Вокал Douglas McCarthy радше декламує, ніж співає. Чи весь трек — декламація, не звірено.', 'unverified'),
  R('demonstrates', Rl('no-protection'), 'concept:dub-production', 'Даб-мікс цілого альбому.'),

  // ---- interpretations ----
  R('shares_trait', A('latin-mafia'), G('trip-hop'), 'Billboard описує звук LATIN MAFIA як «ethereal trip-hop». Подібність, не історичний зв’язок.', 'likely'),
  R('sounds_akin', A('burial'), A('latin-mafia'),
    'Спостереження Артура: «ангельські голоси Burial і LATIN MAFIA мають щось спільне, піднесене», і ламаний ритм поруч. Подібність, не вплив.',
    'likely', 'arthur'),
];
