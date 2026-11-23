import type { Entity, CountryCode } from '../schema';

const city = (slug: string, name: string, country: CountryCode, summary?: string): Entity => ({
  id: `city:${slug}`, type: 'city', name, country, summary, confidence: 'established', author: 'claude',
});

export const cities: Entity[] = [
  city('bristol', 'Bristol', 'GB', 'Портове місто із сильною карибською громадою та sound-system культурою. Батьківщина Wild Bunch, Massive Attack, Portishead, Tricky, Roni Size.'),
  city('london', 'London', 'GB', 'Дім Ninja Tune, Mo’ Wax, XL, Mute, Talkin’ Loud і сцени acid jazz.'),
  city('sheffield', 'Sheffield', 'GB', 'Місто, де заснували Warp і де звучав bleep techno.'),
  city('brighton', 'Brighton', 'GB', 'Центр big beat: лейбл Skint, Fatboy Slim.'),
  city('braintree', 'Braintree', 'GB', 'Місто в Ессексі, де виникли The Prodigy.'),
  city('leeds', 'Leeds', 'GB'),
  city('manchester', 'Manchester', 'GB'),
  city('new-york', 'New York', 'US'),
  city('chicago', 'Chicago', 'US'),
  city('detroit', 'Detroit', 'US'),
  city('kingston', 'Kingston', 'JM'),
  city('berlin', 'Berlin', 'DE'),
  city('vienna', 'Vienna', 'AT'),
  city('reykjavik', 'Reykjavík', 'IS'),
  city('tokyo', 'Tokyo', 'JP'),
  city('dublin', 'Dublin', 'IE'),
  city('kyiv', 'Kyiv', 'UA'),
  city('dallas', 'Dallas', 'US', 'Рідне місто Еріки Баду.'),
  city('philadelphia', 'Philadelphia', 'US', 'Місто The Roots, Questlove і Джеймса Пойзера.'),
];

const scene = (slug: string, name: string, extra: Partial<Entity>): Entity => ({
  id: `scene:${slug}`, type: 'scene', name, confidence: 'established', author: 'claude', ...extra,
});

export const scenes: Entity[] = [
  scene('bristol', 'Bristol sound', {
    aliases: ['Wild Bunch'], city: 'city:bristol', country: 'GB', years: { from: 1983, to: 2000, approx: true },
    summary: 'Коло довкола sound-system колективу The Wild Bunch: хіп-хоп, даб, соул і панк у одному місті. З нього вийшли Massive Attack, а поруч — Portishead, Tricky і drum & bass Roni Size.',
  }),
  scene('uk-rave', 'UK rave', {
    country: 'GB', years: { from: 1988, to: 1995, approx: true },
    summary: 'Масова культура нелегальних вечірок і warehouse-party після «Другого літа любові». Породила breakbeat hardcore, jungle і The Prodigy.',
  }),
  scene('london-acid-jazz', 'London acid jazz', {
    city: 'city:london', country: 'GB', years: { from: 1987, to: 1996, approx: true },
    summary: 'Клубна сцена довкола Gilles Peterson і Eddie Piller: рідкісний groove, jazz-funk і живі бенди для танцполу.',
  }),
  scene('sheffield-bleep', 'Sheffield bleep', {
    city: 'city:sheffield', country: 'GB', years: { from: 1989, to: 1991, approx: true }, confidence: 'likely',
    summary: 'Короткий, але впливовий британський техно-звук: синусоїдальні «біпи» й важкий суббас. Перші релізи Warp.',
  }),
  // placeholders — not researched yet (brief §5)
  scene('berlin-dub-techno', 'Berlin dub techno', {
    city: 'city:berlin', country: 'DE', confidence: 'unverified', attrs: { placeholder: true },
    summary: 'Basic Channel, Chain Reaction. Ще не досліджено.',
  }),
  scene('vienna-downtempo', 'Vienna downtempo', {
    city: 'city:vienna', country: 'AT', confidence: 'unverified', attrs: { placeholder: true },
    summary: 'Kruder & Dorfmeister, культура dub/jazz-soul реміксів. Ще не досліджено.',
  }),
  scene('french-touch', 'French Touch', {
    country: 'FR', confidence: 'unverified', attrs: { placeholder: true },
    summary: 'Air, Motorbass. Ще не досліджено.',
  }),
  scene('belgian-new-beat', 'Belgian New Beat', {
    country: 'BE', confidence: 'unverified', attrs: { placeholder: true },
    summary: 'R&S Records, Front 242, Soulwax. Ще не досліджено.',
  }),
  scene('ukrainian-experimental', 'Ukrainian experimental', {
    city: 'city:kyiv', country: 'UA', confidence: 'unverified', attrs: { placeholder: true },
    summary: 'Kvitnu, Muscut, Heinali, Zavoloka, Nechto. Ще не досліджено.',
  }),
  scene('scandinavian-electronic', 'Scandinavian electronic', {
    confidence: 'unverified', attrs: { placeholder: true },
    summary: 'Röyksopp, The Knife, Fever Ray, Trentemøller, Biosphere. Ще не досліджено.',
  }),
  scene('soulquarians', 'Soulquarians', {
    city: 'city:new-york', country: 'US', years: { from: 1997, to: 2003, approx: true }, confidence: 'likely',
    note: 'Роки приблизні: джерела кажуть «кінець 1990-х — початок 2000-х».',
    summary: 'Змінний колектив довкола Questlove, D’Angelo, J Dilla і Джеймса Пойзера; довгі сесії в студії Electric Lady у Нью-Йорку. Звідти Things Fall Apart (1999), Voodoo, Like Water for Chocolate і Mama’s Gun (2000). Baduizm вийшов раніше й до робіт колективу не зараховується.',
  }),
];

const ev = (slug: string, name: string, year: number, summary: string, extra: Partial<Entity> = {}): Entity => ({
  id: `event:${slug}`, type: 'event', name, years: { from: year }, summary,
  confidence: 'established', author: 'claude', country: 'GB', ...extra,
});

export const events: Entity[] = [
  ev('second-summer-of-love', 'Second Summer of Love', 1988, 'Літо 1988–89: acid house і екстазі перетворюють британські клуби на масові rave.', { years: { from: 1988, to: 1989 } }),
  ev('cja-1994', 'Criminal Justice Act', 1994, 'Закон, який дав поліції повноваження розганяти зібрання під музику з «повторюваними бітами». Знак кінця вільних rave.'),
  ev('mercury-1995', 'Mercury Prize 1995', 1995, 'Portishead отримують Mercury Prize за Dummy — trip-hop стає визнаним мейнстримом.'),
  ev('mercury-1997', 'Mercury Prize 1997', 1997, 'Roni Size / Reprazent отримують Mercury Prize за New Forms — drum & bass визнано як серйозну альбомну музику.'),
  ev('grammy-1998', 'Grammy Awards 1998', 1998, 'Baduizm отримує Grammy за найкращий R&B-альбом, «On & On» — за найкраще жіноче R&B-виконання.', { country: 'US' }),
];

const c = (slug: string, name: string, kind: 'technique' | 'sound', summary: string, extra: Partial<Entity> = {}): Entity => ({
  id: `concept:${slug}`, type: 'concept', name, summary, attrs: { kind }, confidence: 'established', author: 'claude', ...extra,
});

export const concepts: Entity[] = [
  c('sampling', 'Sampling', 'technique', 'Побудова музики з фрагментів інших записів.'),
  c('breakbeat', 'Breakbeat (drum break)', 'technique', 'Фрагмент, де в записі грають лише барабани; зациклений, стає основою нового треку.'),
  c('amen-break', 'Amen break', 'technique', 'Шестисекундний барабанний брейк з треку The Winstons «Amen, Brother» (1969). Мабуть, найвідоміший семпл jungle.'),
  c('turntablism', 'Turntablism', 'technique', 'Програвач як інструмент: скретч, біт-джаглінг.'),
  c('collage', 'Musical collage', 'technique', 'Композиція як монтаж різнорідних семплів у цілісний твір.'),
  c('dub-production', 'Dub production', 'technique', 'Ехо, ревербератор, вимикання інструментів у міксі — простір як матеріал.'),
  c('dub-bass', 'Dub bass', 'sound', 'Глибокий, повільний, фізично відчутний бас із реґі/даб-традиції.'),
  c('live-instruments', 'Live instruments', 'sound', 'Живі інструменти й бенд поверх або замість семплів.'),
  c('cinematic', 'Cinematic atmosphere', 'sound', 'Музика як саундтрек до неіснуючого фільму: оркестрові/нуарні семпли, драматургія.'),
  c('rave-stabs', 'Rave stabs & hoovers', 'sound', 'Різкі синтезаторні акорди й «пилососні» звуки ранньої rave-музики.'),
  c('dilla-feel', 'Dilla feel (unquantized groove)', 'sound', 'Біт без жорсткої прив’язки до сітки: удари трохи запізнюються або «плавають», і грув звучить розхитано й по-людськи. Пов’язують з J Dilla.', { confidence: 'likely', note: 'Назва неформальна, з музичної журналістики.' }),
];

const lab = (slug: string, name: string, extra: Partial<Entity>): Entity => ({
  id: `label:${slug}`, type: 'label', name, confidence: 'established', author: 'claude', country: 'GB', ...extra,
});

export const labels: Entity[] = [
  lab('ninja-tune', 'Ninja Tune', { city: 'city:london', years: { from: 1990 }, summary: 'Лейбл, заснований Coldcut у Лондоні 1990 року. Не жанр: від instrumental hip-hop і downtempo до jazz-електроніки й breakbeat. Має хіп-хоп саблейбл Big Dada.' }),
  lab('mo-wax', 'Mo’ Wax', { city: 'city:london', years: { from: 1992, to: 2002, approx: true }, summary: 'Лейбл Джеймса Лавелла: instrumental hip-hop, семплінг, тернтейблізм, обкладинки як арт-об’єкти.', note: 'Рік закриття приблизний.', confidence: 'likely' }),
  lab('warp', 'Warp', { city: 'city:sheffield', years: { from: 1989 }, summary: 'Заснований у Шеффілді 1989 року. Від bleep techno до серії Artificial Intelligence, що задала IDM. Пізніше переїхав до Лондона.' }),
  lab('xl', 'XL Recordings', { city: 'city:london', years: { from: 1989 }, summary: 'Британський лейбл, що виріс з rave-музики; дім The Prodigy.' }),
  lab('mute', 'Mute', { city: 'city:london', years: { from: 1978 }, summary: 'Лейбл Деніела Міллера: Depeche Mode, Recoil, пізніше Apparat.' }),
  lab('go-beat', 'Go! Beat', { city: 'city:london', years: { from: 1994, approx: true }, summary: 'Саблейбл Go! Discs, на якому вийшов Dummy Portishead.', confidence: 'likely' }),
  lab('circa', 'Circa', { city: 'city:london', summary: 'Лейбл під Virgin, на якому виходили Massive Attack.', confidence: 'likely' }),
  lab('talkin-loud', 'Talkin’ Loud', { city: 'city:london', years: { from: 1990 }, summary: 'Лейбл Gilles Peterson: acid jazz, Galliano, пізніше Roni Size / Reprazent.' }),
  lab('acid-jazz-records', 'Acid Jazz Records', { city: 'city:london', years: { from: 1987 }, summary: 'Лейбл Eddie Piller і Gilles Peterson, що дав назву сцені. Перші релізи Jamiroquai й The Brand New Heavies.' }),
  lab('skint', 'Skint', { city: 'city:brighton', years: { from: 1995 }, summary: 'Брайтонський лейбл, синонім big beat; дім Fatboy Slim.' }),
  lab('kedar-entertainment', 'Kedar Entertainment', { country: 'US', confidence: 'likely', summary: 'Лейбл Кедара Массенбурга, що видавався через Universal. Массенбург підписав Еріку Баду й був виконавчим продюсером Baduizm.' }),
  lab('stones-throw', 'Stones Throw', { country: 'US', summary: 'Незалежний хіп-хоп лейбл із Лос-Анджелеса, заснований Peanut Butter Wolf. Видав Donuts J Dilla.' }),
];
