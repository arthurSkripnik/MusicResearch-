import type { Entity } from '../schema';

const g = (
  slug: string, name: string, from: number | undefined, summary: string,
  extra: Partial<Entity> = {},
): Entity => ({
  id: `genre:${slug}`, type: 'genre', name, years: from ? { from, approx: true } : undefined,
  summary, confidence: 'established', author: 'claude', ...extra,
});

// Discogs-style taxonomy (Arthur approved 2026-11-06, applied 2026-11-10):
//   level 'genre' — broad Discogs genre (Electronic, Jazz, Reggae…), a big hub on the map;
//   everything else is a style (Trip Hop, Dub, Downtempo…) with one or more parent genres in attrs.genres.
// Ids stay `genre:<slug>` for both, so Arthur's saved statuses keep working.
const top = (slug: string, name: string, summary: string, extra: Partial<Entity> = {}): Entity => ({
  id: `genre:${slug}`, type: 'genre', name, summary, confidence: 'established', author: 'claude',
  ...extra, attrs: { level: 'genre', ...(extra.attrs ?? {}) },
});
const st = (slug: string, name: string, parents: string[], from: number | undefined, summary: string,
  extra: Partial<Entity> = {}): Entity => g(slug, name, from, summary,
  { ...extra, attrs: { genres: parents.map((x) => `genre:${x}`), ...(extra.attrs ?? {}) } });

export const genres: Entity[] = [
  // ---- Discogs genres (broad) ----
  top('electronic', 'Electronic', 'Найбільший жанр Discogs: уся музика, зроблена передусім електронними засобами, від ambient і house до trip-hop і drum & bass.'),
  top('funk-soul', 'Funk / Soul', 'Жанр Discogs, що об’єднує soul, funk, neo soul, R&B і споріднені стилі.'),
  top('reggae', 'Reggae', 'Ямайська музика від ska і rocksteady до roots reggae, dub і dancehall. Для карти важлива як джерело басу й простору trip-hop.', { country: 'JM' }),
  top('rock', 'Rock', 'Жанр Discogs для гітарної музики: від класичного року до alternative, post rock і art rock.'),
  top('pop', 'Pop', 'Жанр Discogs для пісенної популярної музики; тут — як другий батьківський жанр synth-pop.'),
  top('latin', 'Latin', 'Жанр Discogs для латиноамериканської музики. Тут поки один вхід — LATIN MAFIA.'),
  // ---- roots ----
  g('jazz', 'Jazz', 1910, 'Афроамериканська традиція імпровізації й гармонії. Для цієї карти важлива як джерело семплів, акордів і живих інструментів.', { country: 'US' , attrs: { level: 'genre' } }),
  g('jazz-fusion', 'Fusion', 1969, 'Поєднання джазової імпровізації з електрогітарами, рок- і фанк-ритмами. У Японії мала сильну власну гілку.', { attrs: { genres: ['genre:jazz', 'genre:rock'] } }),
  g('jazz-funk', 'Jazz-Funk', 1970, 'Джаз із фанковим грувом і електричними клавішними 1970-х. Одне з головних джерел семплів і основа британського acid jazz.', { attrs: { genres: ['genre:jazz', 'genre:funk-soul'] } }),
  g('soul', 'Soul', 1958, 'Вокальна традиція з госпелу та R&B. У trip-hop і acid jazz живе через вокал і семпли.', { country: 'US' , attrs: { genres: ['genre:funk-soul'] } }),
  g('funk', 'Funk', 1965, 'Ритмічна музика, де головне — грув баса й барабанів. Барабанні брейки з фанк-записів стали сировиною для хіп-хопу і breakbeat.', { country: 'US' , attrs: { genres: ['genre:funk-soul'] } }),
  g('dub', 'Dub', 1968, 'Ямайська практика ремікшування реґі: бас і барабани на передньому плані, ехо й ревербератор як інструмент. Ключ до «простору» в trip-hop і jungle.', { country: 'JM', city: 'city:kingston' , attrs: { genres: ['genre:reggae', 'genre:electronic'] } }),
  g('hip-hop', 'Hip Hop', 1973, 'Культура з Бронкса: брейки, семплінг, тернтейблізм. Продюсерські прийоми хіп-хопу лежать в основі trip-hop та instrumental hip-hop.', { country: 'US', city: 'city:new-york' , attrs: { level: 'genre' } }),
  g('house', 'House', 1984, 'Танцювальна електроніка з Чикаго на прямій бочці. Через acid house потрапила до Британії в 1987–88.', { country: 'US', city: 'city:chicago' , attrs: { genres: ['genre:electronic'] } }),
  g('acid-house', 'Acid House', 1986, 'Гілка house зі звуком басового синтезатора Roland TB-303. У Британії стала саундтреком «Другого літа любові».', { attrs: { genres: ['genre:electronic'], parent: 'genre:house' } }),
  g('techno', 'Techno', 1985, 'Механістична танцювальна електроніка з Детройта. Вплинула на британський rave, IDM і європейську сцену.', { country: 'US', city: 'city:detroit' , attrs: { genres: ['genre:electronic'] } }),
  g('ambient', 'Ambient', 1978, 'Музика простору й атмосфери, без вимоги активного слухання. Термін закріпив Брайан Іно.', { attrs: { genres: ['genre:electronic'] } }),
  g('synth-pop', 'Synth-pop', 1979, 'Поп-музика, побудована на синтезаторах. Тут потрібна передусім як контекст Depeche Mode і Recoil.', { country: 'GB' , attrs: { genres: ['genre:electronic', 'genre:pop'] } }),
  g('alt-rock', 'Alternative Rock', 1985, 'Широка парасолька незалежного й експериментального року. Тут — як контекст Radiohead.', { attrs: { genres: ['genre:rock'] } }),
  g('post-rock', 'Post Rock', 1994, 'Рок-інструменти, використані для текстур і повільного розвитку замість пісенної форми.', { confidence: 'likely', note: 'Межі жанру й дата появи терміна приблизні.' , attrs: { genres: ['genre:rock'] } }),
  g('industrial', 'Industrial', 1977, 'Шумова, агресивна електроніка. Дала частину жорсткості звуку The Prodigy.', { attrs: { genres: ['genre:electronic', 'genre:rock'] } }),
  // ---- MVP core ----
  g('trip-hop', 'Trip Hop', 1991, 'Повільні хіп-хоп біти, дабовий бас, семпли соулу та джазу, кінематографічна атмосфера. Термін з’явився в пресі 1994 року; бристольські артисти часто від нього відмежовувались.', { country: 'GB', city: 'city:bristol', confidence: 'likely', note: 'Сам термін спірний: його придумала преса, не музиканти.' , attrs: { genres: ['genre:electronic', 'genre:hip-hop'] } }),
  g('downtempo', 'Downtempo', 1990, 'Повільна, атмосферна електроніка для слухання, а не танцю. Перетинається з trip-hop, ambient і dub.', { confidence: 'likely', note: 'Межі з chillout і trip-hop розмиті.' , attrs: { genres: ['genre:electronic'] } }),
  g('instrumental-hip-hop', 'Instrumental Hip Hop', 1993, 'Хіп-хоп продакшн без MC: біт і семпли як самостійна музика. Центральна течія для Mo’ Wax і Ninja Tune.', { attrs: { genres: ['genre:hip-hop'], discogs: 'Instrumental' }, confidence: 'likely' }),
  g('breakbeat', 'Breakbeat', 1988, 'Парасолька для британської електроніки на зламаних ритмах, а не прямій бочці. Брейки беруться з фанку й хіп-хопу.', { country: 'GB', confidence: 'likely', note: 'Як жанр — парасолька; як прийом — див. концепцію Breakbeat.' , attrs: { genres: ['genre:electronic'] } }),
  g('breakbeat-hardcore', 'Breakbeat Hardcore', 1990, 'Британський rave-звук початку 1990-х: прискорені брейки, rave-стаби, семпли. З нього виросли jungle і перший звук The Prodigy.', { country: 'GB', attrs: { genres: ['genre:electronic'], discogs: 'Hardcore (+ Breakbeat)', parent: 'genre:breakbeat' } }),
  g('jungle', 'Jungle', 1992, 'Дуже швидкі, порізані брейки і дабовий/реґі-бас. Британська сцена, зокрема Лондон.', { country: 'GB', city: 'city:london' , attrs: { genres: ['genre:electronic'] } }),
  g('drum-and-bass', 'Drum n Bass', 1994, 'Розвиток jungle: чистіший продакшн, ширша палітра від джазу до техно.', { country: 'GB' , attrs: { genres: ['genre:electronic'] } }),
  g('big-beat', 'Big Beat', 1994, 'Важкі брейки, рок-енергія, семпли, гумор. Центр — Brighton і Лондон, лейбли Skint і Wall of Sound.', { country: 'GB', attrs: { genres: ['genre:electronic'], parent: 'genre:breakbeat' }, confidence: 'likely', note: 'Чи це піджанр breakbeat — питання конвенції.' }),
  g('acid-jazz', 'Acid Jazz', 1987, 'Лондонська клубна сцена: jazz-funk і soul з хіп-хоп та house-ритмами, часто з живим бендом.', { country: 'GB', city: 'city:london' , attrs: { genres: ['genre:electronic', 'genre:jazz', 'genre:funk-soul'] } }),
  g('idm', 'IDM', 1991, 'Електроніка «для слухання» з техно- й ambient-коренів, складні ритми й текстури. Назва спірна: самі артисти її не люблять.', { country: 'GB', confidence: 'disputed', note: 'Назва жанру спірна; явище — ні.' , attrs: { genres: ['genre:electronic'] } }),
  g('electronica', 'Electronica', 1995, 'Широка парасолька для електронної музики поза танцполом. Тут — дім для Apparat, Moderat, UNKLE.', { confidence: 'disputed', note: 'Дуже розмитий термін, використовую як тимчасову полицю.' , attrs: { genres: ['genre:electronic'], discogs: 'немає окремого стилю; найближчі — Leftfield, Experimental' } }),
  g('neo-soul', 'Neo Soul', 1995, 'Американська течія середини 1990-х: соул і R&B 1970-х, поєднані з хіп-хоп грувом, джазовою гармонією й живими інструментами. Назву як маркетинговий термін приписують Кедару Массенбургу.', { country: 'US', attrs: { genres: ['genre:funk-soul'], parent: 'genre:soul' }, confidence: 'likely', note: 'Дата появи жанру й терміна приблизна (термін — кінець 1990-х); межі з R&B розмиті.' }),
  // ---- styles added 2026-11-10 (weekly update) ----
  st('roots-reggae', 'Roots Reggae', ['reggae'], 1972, 'Реґі 1970-х з духовними й соціальними текстами, повільним грувом і важким басом. Боб Марлі, Burning Spear, Horace Andy.', { country: 'JM', city: 'city:kingston' }),
  st('uk-garage', 'UK Garage', ['electronic'], 1994, 'Лондонська клубна музика середини 1990-х: house, прискорений і «розхитаний» під впливом jungle, з порізаними вокалами.', { country: 'GB', city: 'city:london', confidence: 'likely', note: 'Рік початку приблизний.' }),
  st('dubstep', 'Dubstep', ['electronic'], 2001, 'Південний Лондон, початок 2000-х: темний UK garage, повільніший і порожніший, з глибоким сабом із даб-традиції. Burial — його нічна, «привидна» гілка.', { country: 'GB', city: 'city:london' }),
  st('grime', 'Grime', ['electronic', 'hip-hop'], 2002, 'Лондонський реп на швидких (≈140 BPM) холодних електронних бітах, що виріс з UK garage і піратських радіо. Skepta — одне з головних облич.', { country: 'GB', city: 'city:london' }),
  st('modal', 'Modal', ['jazz'], 1958, 'Джаз, де імпровізують не по швидкій зміні акордів, а по ладах: менше гармонійного руху, більше простору. Kind of Blue — головний приклад.', { country: 'US' }),
  st('hard-bop', 'Hard Bop', ['jazz'], 1955, 'Джаз 1950-х, що додав до bebop госпел, блюз і соул. Щільніший, «гарячий» звук із духовими.', { country: 'US', confidence: 'likely', note: 'До якого саме стилю Discogs відносить окремі альбоми Mingus — не звірено.' }),
  st('contemporary-jazz', 'Contemporary Jazz', ['jazz'], undefined, 'Широка полиця Discogs для сучасного джазу. Тут — фортепіанне тріо Brad Mehldau, що грає рок- і поп-пісні як стандарти.', { confidence: 'likely' }),
  st('jazzy-hip-hop', 'Jazzy Hip-Hop', ['hip-hop', 'jazz'], 1988, 'Хіп-хоп на джазових семплах і гармоніях: Native Tongues (A Tribe Called Quest), пізніше Nujabes і Jazz Liberatorz.', { country: 'US', confidence: 'likely' }),
];
