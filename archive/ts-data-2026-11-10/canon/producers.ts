// Producer layer (Arthur, 2026-11-07: «За продюсерів побудуй зараз»).
// Producers and mixing engineers who connect records by DIFFERENT artists that Arthur likes.
// Credits checked in MusicBrainz on 2026-11-07 unless a relation says otherwise.
// Everything here carries attrs.layer = 'producers' and is shown only when the «Продюсери» switch is on.
import type { Entity, Relation, RelationType, Confidence, CountryCode, YearSpan } from '../schema';

const LAYER = { layer: 'producers' as const };

const p = (slug: string, name: string, country: CountryCode, city: string | undefined, years: YearSpan | undefined,
  summary: string, extra: Partial<Entity> = {}): Entity => ({
  id: `producer:${slug}`, type: 'producer', name, country, city: city ? `city:${city}` : undefined, years, summary,
  confidence: 'established', author: 'claude', attrs: { ...LAYER }, ...extra,
});

const a = (slug: string, name: string, country: CountryCode, years: YearSpan | undefined, summary: string,
  person = false): Entity => ({
  id: `artist:${slug}`, type: 'artist', name, country, years, summary, confidence: 'established', author: 'claude',
  attrs: { ...LAYER, ...(person ? { person: true } : {}) },
});

const r = (slug: string, artist: string, name: string, year: number, summary?: string): Entity => ({
  id: `release:${slug}`, type: 'release', name, years: { from: year }, summary, confidence: 'established', author: 'claude',
  attrs: { ...LAYER, artist: `artist:${artist}`, releaseType: 'album' },
});

const t = (slug: string, artist: string, name: string, release: string): Entity => ({
  id: `track:${slug}`, type: 'track', name, confidence: 'established', author: 'claude',
  attrs: { ...LAYER, artist: `artist:${artist}`, release: `release:${release}` },
});

export const producers: Entity[] = [
  p('rick-rubin', 'Rick Rubin', 'US', undefined, { from: 1984 },
    'Співзасновник Def Jam. Продюсер, відомий тим, що прибирає зайве і ставить у центр пісню й голос. Працював у хіп-хопі, металі, кантрі й попі.'),
  p('nellee-hooper', 'Nellee Hooper', 'GB', 'bristol', { from: 1983, approx: true },
    'Учасник бристольської The Wild Bunch, потім Soul II Soul. Продюсував Protection Massive Attack і перші альбоми Björk.'),
  p('spike-stent', 'Mark “Spike” Stent', 'GB', undefined, { from: 1985, approx: true },
    'Звукорежисер зведення. Його звук чути на Massive Attack, Björk, Depeche Mode, Madonna, U2.'),
  p('mark-bell', 'Mark Bell', 'GB', 'leeds', { from: 1988, approx: true, to: 2014 },
    'Учасник LFO з Лідса (Warp). Співпродюсер Homogenic і концертний партнер Björk; пізніше працював і з Depeche Mode.'),
  p('tim-simenon', 'Tim Simenon', 'GB', 'london', { from: 1987 },
    'Людина за проєктом Bomb the Bass. Продюсував Neneh Cherry та Ultra Depeche Mode.'),
  p('nigel-godrich', 'Nigel Godrich', 'GB', 'london', { from: 1994, approx: true },
    'Багаторічний продюсер Radiohead, якого називають «шостим учасником». Працював також із Thom Yorke сольно, Air, Beck, Paul McCartney.'),
  p('flood', 'Flood', 'GB', 'london', { from: 1980, approx: true },
    'Марк Елліс. Продюсер і звукорежисер Depeche Mode (Violator), Nine Inch Nails, U2, PJ Harvey, Nick Cave, Smashing Pumpkins.'),
  p('dj-premier', 'DJ Premier', 'US', 'new-york', { from: 1987 },
    'Половина Gang Starr. Один із головних продюсерів нью-йоркського хіп-хопу: різані семпли, скречі як приспів.'),
  p('organized-noize', 'Organized Noize', 'US', undefined, { from: 1992, approx: true },
    'Продюсерське тріо з Атланти (Rico Wade, Ray Murray, Sleepy Brown). Ядро Dungeon Family: Outkast, Goodie Mob, TLC «Waterfalls».',
    { attrs: { ...LAYER } }),
];

export const producerArtists: Entity[] = [
  a('thom-yorke', 'Thom Yorke', 'GB', { from: 1985 }, 'Вокаліст Radiohead. Сольно — електронні альбоми з Nigel Godrich; гостем співав в UNKLE і PJ Harvey.', true),
  a('bjork', 'Björk', 'IS', { from: 1977 }, 'Ісландська співачка й авторка. Після The Sugarcubes пішла в соло, поєднуючи електроніку, струнні та голос.', true),
  a('neneh-cherry', 'Neneh Cherry', 'SE', { from: 1980, approx: true }, 'Шведська співачка й реперка. Raw Like Sushi (1989) записувала в тому ж колі, з якого вийшли Massive Attack.', true),
  a('bomb-the-bass', 'Bomb the Bass', 'GB', { from: 1987 }, 'Проєкт Тіма Сіменона: від семплового «Beat Dis» до темного Clear (1995).'),
  a('danzig', 'Danzig', 'US', { from: 1987 }, 'Гурт Гленна Данціга після Misfits і Samhain. Темний блюзовий метал.'),
  a('system-of-a-down', 'System of a Down', 'US', { from: 1994 }, 'Вірмено-американський гурт з Лос-Анджелеса. Метал із різкими поворотами й політичними текстами.'),
  a('audioslave', 'Audioslave', 'US', { from: 2001, to: 2007 }, 'Супергурт: Кріс Корнелл (Soundgarden) і музиканти Rage Against the Machine.'),
  a('adele', 'Adele', 'GB', { from: 2006 }, 'Лондонська співачка. 21 (2011) став одним із найпродаваніших альбомів століття.', true),
  a('the-strokes', 'The Strokes', 'US', { from: 1998 }, 'Нью-йоркський гурт, що повернув моду на гаражний рок на початку 2000-х.'),
  a('nas', 'Nas', 'US', { from: 1991 }, 'Репер із Квінсбриджа. Illmatic (1994) вважають еталоном нью-йоркського хіп-хопу.', true),
  a('gang-starr', 'Gang Starr', 'US', { from: 1986, to: 2010 }, 'Дует репера Guru і продюсера DJ Premier.'),
  a('the-pharcyde', 'The Pharcyde', 'US', { from: 1989 }, 'Лос-анджелеський гурт альтернативного хіп-хопу з грайливою подачею.'),
  a('nick-cave', 'Nick Cave & The Bad Seeds', 'AU', { from: 1983 }, 'Австралійський автор Нік Кейв і його гурт: від готичного пост-панку до тихих балад.'),
  a('smashing-pumpkins', 'The Smashing Pumpkins', 'US', { from: 1988 }, 'Чиказький альтернативний рок Біллі Коргана.'),
  a('outkast', 'Outkast', 'US', { from: 1992 }, 'Дует André 3000 і Big Boi з Атланти. Обличчя південного хіп-хопу.'),
  a('goodie-mob', 'Goodie Mob', 'US', { from: 1991 }, 'Атлантський гурт Dungeon Family; звідси вийшов CeeLo Green.'),
];

export const producerReleases: Entity[] = [
  r('debut', 'bjork', 'Debut', 1993, 'Перший сольний альбом Björk після The Sugarcubes; продюсер Nellee Hooper.'),
  r('homogenic', 'bjork', 'Homogenic', 1997, 'Струнні й жорсткі біти; співпродюсер Mark Bell (LFO).'),
  r('protection', 'massive-attack', 'Protection', 1994, 'Другий альбом Massive Attack; вокал Tracey Thorn, Nicolette, Horace Andy.'),
  r('raw-like-sushi', 'neneh-cherry', 'Raw Like Sushi', 1989, 'Дебют Neneh Cherry з хітом «Buffalo Stance».'),
  r('clear', 'bomb-the-bass', 'Clear', 1995, 'Темний альбом Bomb the Bass з гостями: Sinéad O’Connor, Benjamin Zephaniah, Bernard Fowler.'),
  r('ok-computer', 'radiohead', 'OK Computer', 1997, 'Альбом про тривогу технологічної епохи; перший великий спільний реліз з Nigel Godrich.'),
  r('the-eraser', 'thom-yorke', 'The Eraser', 2006, 'Перший сольний альбом Thom Yorke, електронний і камерний.'),
  r('talkie-walkie', 'air', 'Talkie Walkie', 2004, 'Альбом Air, спродюсований Nigel Godrich.'),
  r('danzig-1988', 'danzig', 'Danzig', 1988, 'Дебют Danzig на лейблі Def American Ріка Рубіна.'),
  r('toxicity', 'system-of-a-down', 'Toxicity', 2001),
  r('audioslave-2002', 'audioslave', 'Audioslave', 2002),
  r('21', 'adele', '21', 2011, 'Над альбомом працювали кілька продюсерів; Rick Rubin спродюсував частину треків, зокрема «Lovesong».'),
  r('the-new-abnormal', 'the-strokes', 'The New Abnormal', 2020, 'Альбом The Strokes, записаний з Rick Rubin у Малібу.'),
  r('illmatic', 'nas', 'Illmatic', 1994, 'Дебют Nas; продюсери DJ Premier, Pete Rock, Q-Tip, Large Professor, L.E.S.'),
  r('hard-to-earn', 'gang-starr', 'Hard to Earn', 1994),
  r('moment-of-truth', 'gang-starr', 'Moment of Truth', 1998),
  r('labcabincalifornia', 'the-pharcyde', 'Labcabincalifornia', 1995, 'Другий альбом The Pharcyde; кілька треків спродюсував ще маловідомий Jay Dee (J Dilla).'),
  r('the-boatmans-call', 'nick-cave', 'The Boatman’s Call', 1997, 'Тихий, фортепіанний альбом Nick Cave.'),
  r('mellon-collie', 'smashing-pumpkins', 'Mellon Collie and the Infinite Sadness', 1995, 'Подвійний альбом; продюсери Flood і Alan Moulder разом із Billy Corgan.'),
  r('aquemini', 'outkast', 'Aquemini', 1998),
  r('soul-food', 'goodie-mob', 'Soul Food', 1995),
];

// Tracks from Arthur's Spotify Liked Songs (snapshot 2026-11-07) on these releases.
export const producerTracks: Entity[] = [
  t('protection', 'massive-attack', 'Protection', 'protection'),
  t('angel', 'massive-attack', 'Angel', 'mezzanine'),
  t('human-behaviour', 'bjork', 'Human Behaviour', 'debut'),
  t('come-to-me', 'bjork', 'Come to Me', 'debut'),
  t('pluto', 'bjork', 'Pluto', 'homogenic'),
  t('bachelorette', 'bjork', 'Bachelorette', 'homogenic'),
  t('empire', 'bomb-the-bass', 'Empire', 'clear'),
  t('its-no-good', 'depeche-mode', 'It’s No Good', 'ultra'),
  t('karma-police', 'radiohead', 'Karma Police', 'ok-computer'),
  t('exit-music', 'radiohead', 'Exit Music (For a Film)', 'ok-computer'),
  t('let-down', 'radiohead', 'Let Down', 'ok-computer'),
  t('nude', 'radiohead', 'Nude', 'in-rainbows'),
  t('reckoner', 'radiohead', 'Reckoner', 'in-rainbows'),
  t('black-swan', 'thom-yorke', 'Black Swan', 'the-eraser'),
  t('cherry-blossom-girl', 'air', 'Cherry Blossom Girl', 'talkie-walkie'),
  t('mother', 'danzig', 'Mother', 'danzig-1988'),
  t('aerials', 'system-of-a-down', 'Aerials', 'toxicity'),
  t('like-a-stone', 'audioslave', 'Like a Stone', 'audioslave-2002'),
  t('lovesong-adele', 'adele', 'Lovesong', '21'),
  t('why-are-sundays', 'the-strokes', 'Why Are Sundays So Depressing', 'the-new-abnormal'),
  t('ode-to-the-mets', 'the-strokes', 'Ode to the Mets', 'the-new-abnormal'),
  t('the-adults-are-talking', 'the-strokes', 'The Adults Are Talking', 'the-new-abnormal'),
  t('ny-state-of-mind', 'nas', 'N.Y. State of Mind', 'illmatic'),
  t('mass-appeal', 'gang-starr', 'Mass Appeal', 'hard-to-earn'),
  t('work', 'gang-starr', 'Work', 'moment-of-truth'),
  t('runnin', 'the-pharcyde', 'Runnin’', 'labcabincalifornia'),
  t('into-my-arms', 'nick-cave', 'Into My Arms', 'the-boatmans-call'),
  t('1979', 'smashing-pumpkins', '1979', 'mellon-collie'),
  t('return-of-the-g', 'outkast', 'Return of the “G”', 'aquemini'),
  t('cell-therapy', 'goodie-mob', 'Cell Therapy', 'soul-food'),
];

export const producerLayerEntities: Entity[] = [...producers, ...producerArtists, ...producerReleases, ...producerTracks];

let n = 0;
const R = (type: RelationType, from: string, to: string, why: string, confidence: Confidence = 'established'): Relation => ({
  id: `prod:${++n}`, type, from, to, why, confidence, author: 'claude',
});
const P = (s: string) => `producer:${s}`;
const Rl = (s: string) => `release:${s}`;
const T = (s: string) => `track:${s}`;
const A = (s: string) => `artist:${s}`;
const G = (s: string) => `genre:${s}`;
const MB = 'Кредит у MusicBrainz.';

export const producerRelations: Relation[] = [
  // Rick Rubin — п'ять артистів, п'ять різних світів
  R('produced', P('rick-rubin'), Rl('danzig-1988'), `Продюсер альбому. ${MB}`),
  R('produced', P('rick-rubin'), Rl('toxicity'), `Продюсер разом із Daron Malakian і Serj Tankian. ${MB}`),
  R('produced', P('rick-rubin'), Rl('audioslave-2002'), `Продюсер разом із гуртом. ${MB}`),
  R('produced', P('rick-rubin'), T('lovesong-adele'), `Продюсер треку «Lovesong», каверу The Cure. ${MB}`),
  R('produced', P('rick-rubin'), Rl('the-new-abnormal'), `Продюсер альбому. ${MB}`),

  // Nellee Hooper + Spike Stent: міст Massive Attack ↔ Björk
  R('produced', P('nellee-hooper'), Rl('debut'), `Продюсер «Human Behaviour», «Come to Me» та більшості альбому. ${MB}`),
  R('produced', P('nellee-hooper'), Rl('protection'), `Співпродюсер разом із Massive Attack. ${MB}`),
  R('part_of_scene', P('nellee-hooper'), 'scene:bristol', 'Учасник sound-system колективу The Wild Bunch, з якого вийшли Massive Attack.'),
  R('mixed', P('spike-stent'), Rl('protection'), `Зводив заголовний трек. ${MB}`),
  R('mixed', P('spike-stent'), Rl('mezzanine'), `Зводив альбом, зокрема «Angel». ${MB}`),
  R('mixed', P('spike-stent'), Rl('homogenic'), `Зводив треки, зокрема «Pluto» і «Bachelorette». ${MB}`),

  R('member_of', A('thom-yorke'), A('radiohead'), 'Вокаліст і автор Radiohead.'),

  // Mark Bell: LFO → Björk
  R('produced', P('mark-bell'), Rl('homogenic'), `Співпродюсер, зокрема «Pluto». ${MB}`),
  R('member_of', P('mark-bell'), A('lfo'), 'Один із засновників LFO.'),

  // Tim Simenon
  R('member_of', P('tim-simenon'), A('bomb-the-bass'), 'Bomb the Bass — його власний проєкт.'),
  R('produced', P('tim-simenon'), Rl('ultra'), `Продюсер альбому, зокрема «It’s No Good». ${MB}`),
  R('produced', P('tim-simenon'), Rl('raw-like-sushi'), `Продюсер «Buffalo Stance». ${MB}`),

  // Nigel Godrich
  R('produced', P('nigel-godrich'), Rl('ok-computer'), `Продюсер разом із Radiohead. ${MB}`),
  R('produced', P('nigel-godrich'), Rl('kid-a'), `Продюсер разом із Radiohead. ${MB}`),
  R('produced', P('nigel-godrich'), Rl('in-rainbows'), `Продюсер і звукорежисер зведення. ${MB}`),
  R('produced', P('nigel-godrich'), Rl('the-eraser'), 'Продюсер сольного альбому Thom Yorke.', 'established'),
  R('produced', P('nigel-godrich'), Rl('talkie-walkie'), `Продюсер разом з Air. ${MB}`),

  // Flood
  R('produced', P('flood'), Rl('the-boatmans-call'), `Співпродюсер, зокрема «Into My Arms». ${MB}`),
  R('produced', P('flood'), Rl('mellon-collie'), `Співпродюсер разом з Alan Moulder і Billy Corgan. ${MB}`),

  // DJ Premier
  R('member_of', P('dj-premier'), A('gang-starr'), 'Продюсер і діджей Gang Starr.'),
  R('produced', P('dj-premier'), Rl('hard-to-earn'), 'Продюсував музику Gang Starr.'),
  R('produced', P('dj-premier'), Rl('moment-of-truth'), `Продюсер разом із Guru. ${MB}`),
  R('produced', P('dj-premier'), T('ny-state-of-mind'), `Продюсер треку. ${MB}`),

  // J Dilla (already on the map as an artist)
  R('produced', A('j-dilla'), T('runnin'), `Продюсер треку (тоді як Jay Dee). ${MB}`),

  // Organized Noize
  R('produced', P('organized-noize'), Rl('aquemini'), `Співпродюсер альбому, зокрема «Return of the “G”». ${MB}`),
  R('produced', P('organized-noize'), Rl('soul-food'), `Продюсер, зокрема «Cell Therapy». ${MB}`),

  // genre anchors for the new artists, so the layer lands near the right islands
  R('in_genre', A('bjork'), G('electronica'), 'Електроніка в центрі звуку з Debut.', 'likely'),
  R('in_genre', A('neneh-cherry'), G('hip-hop'), 'Реп і хіп-хоп біти на Raw Like Sushi.', 'likely'),
  R('in_genre', A('bomb-the-bass'), G('breakbeat'), 'Семпли й брейкбіт.', 'likely'),
  R('in_genre', A('danzig'), G('alt-rock'), 'Важкий рок поза мейнстримом.', 'likely'),
  R('in_genre', A('system-of-a-down'), G('alt-rock'), 'Альтернативний метал.', 'likely'),
  R('in_genre', A('audioslave'), G('alt-rock'), 'Альтернативний рок.'),
  R('in_genre', A('adele'), G('soul'), 'Соул-манера вокалу.', 'likely'),
  R('in_genre', A('the-strokes'), G('alt-rock'), 'Інді- і гаражний рок.'),
  R('in_genre', A('nas'), G('hip-hop'), 'Репер.'),
  R('in_genre', A('gang-starr'), G('hip-hop'), 'Хіп-хоп дует.'),
  R('in_genre', A('the-pharcyde'), G('hip-hop'), 'Альтернативний хіп-хоп.'),
  R('in_genre', A('nick-cave'), G('alt-rock'), 'Пост-панк і альтернативний рок.', 'likely'),
  R('in_genre', A('smashing-pumpkins'), G('alt-rock'), 'Альтернативний рок 90-х.'),
  R('in_genre', A('outkast'), G('hip-hop'), 'Південний хіп-хоп.'),
  R('in_genre', A('goodie-mob'), G('hip-hop'), 'Південний хіп-хоп.'),
];
