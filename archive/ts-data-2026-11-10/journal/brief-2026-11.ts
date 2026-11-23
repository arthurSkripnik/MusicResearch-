// Arthur's personal layer, transcribed from his brief (2026-11-06).
// Rule: only what Arthur wrote. Nothing here is inferred or invented.
import type { Journal, Reaction, Status } from '../schema';

const D = '2026-11-06';
let i = 0;
const re = (target: string, r: Omit<Reaction, 'id' | 'target' | 'date' | 'origin'>): Reaction => ({
  id: `brief-${++i}`, target, date: D, origin: 'brief-2026-11', ...r,
});

const reactions: Reaction[] = [
  // ---- anchor albums (§3) ----
  re('release:londinium', { polarity: 'strong_positive', scope: 'album', anchor: true, axes: ['atmosphere', 'space'],
    text: 'Нуарна атмосфера, відкритість, емоційна глибина. Цікавий перетин хіп-хопу, соулу й кінематографічної композиції.' }),
  re('release:lights', { polarity: 'strong_positive', scope: 'album', anchor: true, axes: ['atmosphere'],
    text: 'Атмосферний, цілісний альбомний досвід. Часто працює як фонове слухання.' }),
  re('release:ultra', { polarity: 'strong_positive', scope: 'album', anchor: true, axes: ['atmosphere', 'texture'],
    text: 'Темний, важкий, тактильний і психологічно інтенсивний. Атмосфера цього альбому мені ближча за впізнаваніший synth-pop гурту.' }),
  re('release:in-rainbows', { polarity: 'strong_positive', scope: 'album', anchor: true, axes: ['melody'],
    text: 'Один із найменш виснажливих для мене альбомів. Сильні мелодія й гармонія.' }),
  re('release:black-sands', { polarity: 'strong_positive', scope: 'album', anchor: true, axes: ['melody', 'atmosphere', 'groove'],
    text: 'Мелодійна, атмосферна електроніка з органічними й ритмічними елементами.' }),
  re('release:blood-like-lemonade', { polarity: 'strong_positive', scope: 'album', anchor: true, axes: ['groove'],
    text: 'Бас, вокал, грув і теплота.' }),
  re('release:lp5', { polarity: 'strong_positive', scope: 'album', anchor: true, axes: ['development'],
    text: 'Особливо цікавить розвиток Heroist приблизно після 4-ї хвилини.' }),
  re('track:heroist', { polarity: 'strong_positive', scope: 'part', anchor: true, axes: ['development'],
    segment: { fromSec: 240 }, text: 'Розвиток треку приблизно після 4:00.' }),
  re('release:war-stories', { polarity: 'strong_positive', scope: 'album', anchor: true, axes: ['atmosphere'],
    text: 'Цікавий перетин електроніки, року, семплів і кінематографічної атмосфери.' }),
  // ---- other references (§3) — anchors without a stated polarity ----
  re('track:bad-kingdom', { scope: 'track', anchor: true, text: 'Важливий музичний орієнтир.' }),
  re('track:a-new-error', { scope: 'track', anchor: true, text: 'Важливий музичний орієнтир.' }),
  re('track:svefn-g-englar', { scope: 'track', anchor: true, text: 'Важливий музичний орієнтир.' }),
  re('track:how-to-disappear', { scope: 'track', anchor: true, text: 'Важливий музичний орієнтир.' }),
  re('track:drone-bomb-me', { scope: 'track', anchor: true, text: 'Важливий музичний орієнтир.' }),
  re('artist:the-weeknd', { scope: 'artist', anchor: true, axes: ['groove'], text: 'Особливо голос, грув і бас.' }),
  // ---- strong positive feedback (§6) ----
  re('release:unsound-methods', { polarity: 'strong_positive', scope: 'album', axes: ['atmosphere', 'development'],
    segment: { tracks: 'перші три треки і фінальний' },
    text: 'Особливо перші три треки й фінальний. Сильна цілісність альбому. Темний і атмосферний, але цікавіший як цілісний досвід, ніж окремі треки.' }),
  re('track:curse', { polarity: 'strong_positive', scope: 'track', text: 'Сильна позитивна реакція.' }),
  re('track:shunt', { polarity: 'strong_positive', scope: 'track', text: 'Сильна позитивна реакція. (Трек ще треба ідентифікувати.)' }),
  re('track:pick-up', { polarity: 'strong_positive', scope: 'track', text: 'Сильна позитивна реакція.' }),
  re('track:the-plug', { polarity: 'strong_positive', scope: 'track', text: 'Сильна позитивна реакція.' }),
  re('track:terrorist', { polarity: 'strong_positive', scope: 'track', axes: ['groove'], text: 'Сильний грув і фізична енергія.' }),
  re('track:dark-lady', { polarity: 'strong_positive', scope: 'track', text: 'Сильна позитивна реакція.' }),
  re('release:the-music-scene', { polarity: 'strong_positive', scope: 'album', text: 'Сильна позитивна реакція.' }),
  re('track:rising-arch', { polarity: 'strong_positive', scope: 'track', anchor: true, text: 'Сильна позитивна реакція; також у списку орієнтирів.' }),
  re('release:shag-tobacco', { polarity: 'strong_positive', scope: 'album', axes: ['atmosphere'],
    text: 'Димний, театральний, кабаре/нуар. Інший тип темряви, ніж у Recoil.' }),
  // ---- negative / weaker (§6) — contextual, not permanent ----
  re('artist:air', { polarity: 'negative', scope: 'artist', reason: 'too_light', text: 'Загалом занадто легко для мого теперішнього смаку.' }),
  re('artist:rhye', { polarity: 'negative', scope: 'artist', reason: 'not_now', text: 'Не особливо цікаво.' }),
  re('artist:bishop', { polarity: 'negative', scope: 'artist', reason: 'disliked', text: 'Раніше не сподобалось. Хто саме — не пам’ятаю.' }),
  re('artist:tricky', { polarity: 'neutral', scope: 'artist', reason: 'not_now', text: 'Частина матеріалу — не обов’язково не подобається, але зараз не той напрям, який хочу пріоритезувати.' }),
  re('artist:dj-shadow', { polarity: 'neutral', scope: 'artist', reason: 'not_now', text: 'Частина матеріалу — не обов’язково не подобається, але зараз не той напрям, який хочу пріоритезувати.' }),
  re('release:fantasma', { polarity: 'negative', scope: 'album', reason: 'disliked', axes: ['texture'], text: 'Здалося занадто різким або мультяшним.' }),
  re('artist:mogwai', { polarity: 'negative', scope: 'part', reason: 'too_intense', axes: ['atmosphere'], text: 'У частині матеріалу напруга ставала занадто гнітючою.' }),
  re('release:liquid', { polarity: 'mixed', scope: 'part', reason: 'too_intense', axes: ['development'],
    text: 'Початок працює, але далі матеріал може перевантажувати.' }),
];

// Statuses: set only where the brief says so.
const statuses: Record<string, Status> = {
  // §3 and §6 — explicitly identified as liked
  'release:londinium': 'liked', 'release:lights': 'liked', 'release:ultra': 'liked', 'release:in-rainbows': 'liked',
  'release:black-sands': 'liked', 'release:blood-like-lemonade': 'liked', 'release:lp5': 'liked',
  'release:war-stories': 'liked', 'release:unsound-methods': 'liked', 'release:the-music-scene': 'liked',
  'release:shag-tobacco': 'liked', 'track:curse': 'liked', 'track:shunt': 'liked', 'track:pick-up': 'liked',
  'track:the-plug': 'liked', 'track:terrorist': 'liked', 'track:dark-lady': 'liked', 'track:rising-arch': 'liked',
  'track:heroist': 'liked',
  // §5 — Smokers Delight marked as priority recommendation; other named albums are research directions
  'release:smokers-delight': 'to_listen', 'release:timeless': 'to_listen', 'release:new-forms': 'to_listen',
  'release:dig-your-own-hole': 'to_listen',
  // §4 — current research focus
  'genre:trip-hop': 'exploring', 'scene:bristol': 'exploring',
  'label:ninja-tune': 'curious', 'label:mo-wax': 'curious', 'artist:prodigy': 'curious',
  // §5 — directions to explore
  'genre:downtempo': 'curious', 'genre:jungle': 'curious', 'genre:drum-and-bass': 'curious', 'genre:big-beat': 'curious',
  'genre:idm': 'curious', 'label:warp': 'curious', 'genre:acid-jazz': 'curious', 'genre:jazz-funk': 'curious',
  // §6 — contextual
  'artist:air': 'not_now', 'artist:rhye': 'not_now', 'artist:tricky': 'not_now', 'artist:dj-shadow': 'not_now',
  'release:fantasma': 'disliked',
};

export const briefJournal: Journal = { statuses, reactions, notes: {} };
