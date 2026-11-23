import type { Entity, CountryCode, YearSpan } from '../schema';

interface A extends Partial<Entity> { }
const a = (slug: string, name: string, country: CountryCode | undefined, city: string | undefined,
  years: YearSpan | undefined, summary: string, extra: A = {}): Entity => ({
  id: `artist:${slug}`, type: 'artist', name, country, city: city ? `city:${city}` : undefined, years, summary,
  confidence: 'established', author: 'claude', ...extra,
});

export const artists: Entity[] = [
  // Bristol / trip-hop
  a('massive-attack', 'Massive Attack', 'GB', 'bristol', { from: 1988 }, 'Вийшли з The Wild Bunch. Blue Lines (1991) задав звук, який преса згодом назвала trip-hop.'),
  a('portishead', 'Portishead', 'GB', 'bristol', { from: 1991 }, 'Джефф Барроу, Бет Гіббонс, Едріан Атлі. Нуарні семпли, вініловий шум, крихкий вокал.'),
  a('tricky', 'Tricky', 'GB', 'bristol', { from: 1991 }, 'Читав на ранніх записах Massive Attack, далі — сольно. Темніший, клаустрофобний варіант бристольського звуку.', { attrs: { person: true } }),
  a('archive', 'Archive', 'GB', 'london', { from: 1994 }, 'Лондонський колектив. Londinium (1996) стилістично близький до trip-hop, далі — до атмосферного й прогресивного року. Не бристольська група.'),
  a('roni-size', 'Roni Size / Reprazent', 'GB', 'bristol', { from: 1993, approx: true }, 'Бристольський drum & bass з живим контрабасом і джазовими фактурами.'),
  // Ninja Tune
  a('coldcut', 'Coldcut', 'GB', 'london', { from: 1986 }, 'Метт Блек і Джонатан Мор. Піонери британського семпл-колажу, засновники Ninja Tune.'),
  a('dj-food', 'DJ Food', 'GB', 'london', { from: 1990 }, 'Проєкт, що почався в колі Coldcut як серія брейків для діджеїв (Jazz Brakes); пізніше — Strictly Kev.', { confidence: 'likely' }),
  a('cinematic-orchestra', 'The Cinematic Orchestra', 'GB', 'london', { from: 1999 }, 'Проєкт Джейсона Свінскоу: живий джазовий бенд, монтаж і кінематографічна драматургія.'),
  a('bonobo', 'Bonobo', 'GB', 'brighton', { from: 1999, approx: true }, 'Саймон Грін. Мелодійний downtempo з живими інструментами; з середини 2000-х — на Ninja Tune.', { attrs: { person: true }, confidence: 'likely', note: 'Дебют вийшов на Tru Thoughts; точний рік переходу на Ninja Tune не звірено.' }),
  a('amon-tobin', 'Amon Tobin', 'BR', undefined, { from: 1996, approx: true }, 'Бразильський продюсер: джазові семпли, порізані у breakbeat-конструкції.', { attrs: { person: true } }),
  a('herbaliser', 'The Herbaliser', 'GB', 'london', { from: 1995, approx: true }, 'Instrumental hip-hop із фанковими й джазовими семплами, пізніше — з живим бендом.'),
  a('funki-porcini', 'Funki Porcini', 'GB', undefined, { from: 1995, approx: true }, 'Джеймс Брейдвуд. Кінематографічний downtempo на Ninja Tune.', { confidence: 'likely', attrs: { person: true } }),
  a('mr-scruff', 'Mr Scruff', 'GB', 'manchester', { from: 1994, approx: true }, 'Манчестерський діджей і продюсер: фанк, джаз, гумор.', { attrs: { person: true } }),
  a('roots-manuva', 'Roots Manuva', 'GB', 'london', { from: 1994, approx: true }, 'Британський MC з дабовим басом; виходив на Big Dada, хіп-хоп саблейблі Ninja Tune.', { attrs: { person: true } }),
  a('dj-vadim', 'DJ Vadim', 'GB', 'london', { from: 1995, approx: true }, 'Народився в Ленінграді, працював у Лондоні. Абстрактний хіп-хоп на Ninja Tune.', { attrs: { person: true }, confidence: 'likely' }),
  a('motion-man', 'Motion Man', 'US', undefined, undefined, 'MC з Каліфорнії.', { attrs: { person: true }, confidence: 'likely' }),
  a('blockhead', 'Blockhead', 'US', 'new-york', { from: 2002, approx: true }, 'Нью-йоркський продюсер instrumental hip-hop на Ninja Tune.', { attrs: { person: true } }),
  // Mo' Wax
  a('dj-shadow', 'DJ Shadow', 'US', undefined, { from: 1991, approx: true }, 'Джош Девіс. Endtroducing….. — орієнтир семпл-колажу й instrumental hip-hop.', { attrs: { person: true } }),
  a('james-lavelle', 'James Lavelle', 'GB', 'london', undefined, 'Засновник Mo’ Wax і ядро UNKLE.', { attrs: { person: true } }),
  a('unkle', 'UNKLE', 'GB', 'london', { from: 1994, approx: true }, 'Проєкт Джеймса Лавелла зі змінним складом: електроніка, рок, семпли, кінематографічна атмосфера.'),
  // Rave / big beat
  a('prodigy', 'The Prodigy', 'GB', 'braintree', { from: 1990 }, 'Паралельна гілка британської електроніки: rave, breakbeat hardcore, згодом big beat з індустріальною і рок-енергією. Не trip-hop.'),
  a('chemical-brothers', 'The Chemical Brothers', 'GB', 'manchester', { from: 1989, approx: true }, 'Том Роулендс і Ед Саймонс; почали в Манчестері. Одні з облич big beat.'),
  a('fatboy-slim', 'Fatboy Slim', 'GB', 'brighton', { from: 1996 }, 'Норман Кук. Big beat на Skint.', { aliases: ['Norman Cook'], attrs: { person: true } }),
  a('propellerheads', 'Propellerheads', 'GB', undefined, { from: 1995, to: 2000, approx: true }, 'Дует big beat із Бата.', { confidence: 'likely' }),
  // Jungle / DnB
  a('goldie', 'Goldie', 'GB', undefined, { from: 1992, approx: true }, 'Timeless (1995) показав, що jungle/drum & bass може бути масштабним альбомом.', { attrs: { person: true } }),
  a('ltj-bukem', 'LTJ Bukem', 'GB', undefined, { from: 1990, approx: true }, 'Атмосферний, джазовий drum & bass; лейбл Good Looking.', { attrs: { person: true } }),
  a('4hero', '4hero', 'GB', 'london', { from: 1990, approx: true }, 'Від rave і jungle до джазового drum & bass і broken beat.'),
  // IDM / Warp
  a('aphex-twin', 'Aphex Twin', 'GB', undefined, { from: 1991, approx: true }, 'Річард Д. Джеймс. Від ambient до хаотичної ритміки.', { attrs: { person: true } }),
  a('autechre', 'Autechre', 'GB', undefined, { from: 1991, approx: true }, 'Дует з Рочдейла; абстрактні ритми й текстури.'),
  a('boards-of-canada', 'Boards of Canada', 'GB', undefined, { from: 1995, approx: true }, 'Шотландський дует: розмиті плівкові текстури, ностальгія, хіп-хоп повільність.'),
  a('plaid', 'Plaid', 'GB', 'london', { from: 1991, approx: true }, 'Мелодійна IDM на Warp.'),
  a('lfo', 'LFO', 'GB', 'leeds', { from: 1988, approx: true }, 'Bleep techno з Лідса; одноіменний трек — ранній хіт Warp.'),
  a('nightmares-on-wax', 'Nightmares on Wax', 'GB', 'leeds', { from: 1988, approx: true }, 'Джордж Еванс. Від bleep до тягучого downtempo з соул-семплами.'),
  // Acid jazz
  a('brand-new-heavies', 'The Brand New Heavies', 'GB', 'london', { from: 1985, approx: true }, 'Acid jazz / funk бенд з Лондона.'),
  a('jamiroquai', 'Jamiroquai', 'GB', 'london', { from: 1992 }, 'Почав на Acid Jazz Records; jazz-funk, диско-грув.'),
  a('galliano', 'Galliano', 'GB', 'london', { from: 1988, approx: true }, 'Перший артист Talkin’ Loud.', { confidence: 'likely' }),
  a('us3', 'Us3', 'GB', 'london', { from: 1992 }, 'Хіп-хоп поверх семплів з каталогу Blue Note.'),
  a('incognito', 'Incognito', 'GB', 'london', { from: 1979, approx: true }, 'Jazz-funk бенд, що пережив acid jazz-хвилю.'),
  // Downtempo
  a('thievery-corporation', 'Thievery Corporation', 'US', undefined, { from: 1995 }, 'Дует з Вашингтона: даб, боса-нова, лаунж.'),
  a('kruder-dorfmeister', 'Kruder & Dorfmeister', 'AT', 'vienna', { from: 1993, approx: true }, 'Віденський дует; The K&D Sessions — еталон повільного dub/jazz-ремікса.'),
  a('the-orb', 'The Orb', 'GB', 'london', { from: 1988 }, 'Ambient house: dub, семпли, космічна тривалість.'),
  // Arthur's anchors and references
  a('depeche-mode', 'Depeche Mode', 'GB', undefined, { from: 1980 }, 'Від synth-pop до темного, фізичного електронного року.'),
  a('alan-wilder', 'Alan Wilder', 'GB', undefined, undefined, 'Учасник Depeche Mode 1982–1995, автор проєкту Recoil.', { attrs: { person: true } }),
  a('recoil', 'Recoil', 'GB', undefined, { from: 1986 }, 'Проєкт Алана Вайлдера: темні, кінематографічні, семплові полотна із запрошеними вокалістами.'),
  a('radiohead', 'Radiohead', 'GB', undefined, { from: 1985 }, 'Від гітарного року до електроніки й складної гармонії.'),
  a('morcheeba', 'Morcheeba', 'GB', 'london', { from: 1995 }, 'Лондонський trip-hop/downtempo з соул-вокалом.'),
  a('apparat', 'Apparat', 'DE', 'berlin', { from: 1999, approx: true }, 'Саша Ринг. Мелодійна, оркестрова електроніка.', { attrs: { person: true } }),
  a('modeselektor', 'Modeselektor', 'DE', 'berlin', { from: 1996, approx: true }, 'Берлінський дует; разом з Apparat — Moderat.'),
  a('moderat', 'Moderat', 'DE', 'berlin', { from: 2002, approx: true }, 'Apparat + Modeselektor.'),
  a('sigur-ros', 'Sigur Rós', 'IS', 'reykjavik', { from: 1994 }, 'Повільна, текстурна музика; вокал як інструмент.'),
  a('anohni', 'ANOHNI', 'US', undefined, undefined, 'Виконавиця й авторка; Hopelessness (2016) — політична електроніка.', { attrs: { person: true } }),
  a('the-weeknd', 'The Weeknd', 'CA', undefined, { from: 2010 }, 'Сучасний R&B/поп з темною атмосферою.', { attrs: { person: true } }),
  a('takanaka', 'Masayoshi Takanaka', 'JP', 'tokyo', { from: 1976, approx: true }, 'Японський гітарист jazz fusion / city pop.', { attrs: { person: true } }),
  a('gavin-friday', 'Gavin Friday', 'IE', 'dublin', undefined, 'Дублінський виконавець (раніше Virgin Prunes): театральність, кабаре, нуар.', { attrs: { person: true } }),
  a('mogwai', 'Mogwai', 'GB', undefined, { from: 1995 }, 'Шотландський post-rock: довга напруга й вибухи гучності.'),
  a('air', 'Air', 'FR', undefined, { from: 1995 }, 'Французький дует: м’який, ретро-синтезаторний downtempo.'),
  a('cornelius', 'Cornelius', 'JP', 'tokyo', undefined, 'Кейґо Оямада; Fantasma (1997) — щільний поп-колаж.', { attrs: { person: true } }),
  a('rhye', 'Rhye', undefined, undefined, undefined, 'Мінімалістичний соул/R&B.', { confidence: 'likely' }),
  a('bishop', 'Bishop (?)', undefined, undefined, undefined, 'Невідомо, який саме виконавець: Артур не пам’ятає. Залишено, щоб не загубити реакцію.', { confidence: 'unverified' }),
  // ---- neo-soul / Soulquarians (2026-11-06) ----
  a('erykah-badu', 'Erykah Badu', 'US', 'dallas', { from: 1996, approx: true }, 'Співачка з Далласа. Дебют Baduizm (1997) зробив її одним з облич neo-soul; критики порівнювали її фразування з Біллі Голідей.', { attrs: { person: true } }),
  a('d-angelo', 'D’Angelo', 'US', undefined, { from: 1995, approx: true }, 'Співак і мультиінструменталіст. Brown Sugar (1995) вважають одним із перших альбомів neo-soul; Voodoo (2000) записаний у колі Soulquarians.', { attrs: { person: true } }),
  a('the-roots', 'The Roots', 'US', 'philadelphia', { from: 1987 }, 'Хіп-хоп гурт із живим бендом. Разом із менеджером Річардом Ніколсом спродюсували три треки Baduizm.'),
  a('questlove', 'Questlove', 'US', 'philadelphia', undefined, 'Ахмір Томпсон, барабанщик і співлідер The Roots. «Музичний двигун» Soulquarians.', { attrs: { person: true } }),
  a('j-dilla', 'J Dilla', 'US', 'detroit', { from: 1993, to: 2006, approx: true }, 'Продюсер із Детройта (Slum Village), співзасновник Soulquarians. Його розхитаний грув вплинув на neo-soul та instrumental hip-hop. На Baduizm не працював.', { aliases: ['Jay Dee'], attrs: { person: true } }),
  a('james-poyser', 'James Poyser', 'US', 'philadelphia', undefined, 'Клавішник і продюсер; серед продюсерів Baduizm і в ядрі Soulquarians.', { attrs: { person: true }, confidence: 'likely' }),
  a('common', 'Common', 'US', undefined, { from: 1992, approx: true }, 'Репер із Чикаго. Like Water for Chocolate (2000) — один із головних альбомів Soulquarians.', { attrs: { person: true } }),
];
