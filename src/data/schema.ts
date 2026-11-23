// Music Explorer — data model.
// Three layers share entity ids but live in separate files:
//   canon   — objective history (entities + relations), every claim has a confidence level
//   journal — Arthur's own listening reactions and statuses (never invented)
//   lab     — hypotheses and research directions

export type Confidence = 'established' | 'likely' | 'disputed' | 'unverified';

export type EntityType =
  | 'genre'
  | 'scene'
  | 'artist'
  | 'release'
  | 'track'
  | 'label'
  | 'city'
  | 'event'
  | 'concept'
  | 'producer';

export type CountryCode =
  | 'GB' | 'US' | 'JM' | 'DE' | 'AT' | 'FR' | 'BE' | 'IS' | 'JP' | 'IE' | 'CA' | 'BR' | 'UA' | 'SE' | 'AU' | 'MX';

export interface YearSpan {
  from?: number;
  to?: number;
  approx?: boolean;
}

export interface Entity {
  id: string;              // '<type>:<slug>', stable forever
  type: EntityType;
  name: string;            // English name (as Arthur asked)
  aliases?: string[];
  years?: YearSpan;
  country?: CountryCode;
  city?: string;           // id of a city entity
  summary?: string;        // 1–3 sentences in Ukrainian, objective
  confidence: Confidence;  // confidence in the entity's own attributes (years, place)
  note?: string;           // what exactly is uncertain
  attrs?: {
    parent?: string;             // genre → parent genre
    releaseType?: 'album' | 'ep' | 'single' | 'compilation';
    artist?: string;             // release / track → artist id
    release?: string;            // track → release id
    kind?: 'technique' | 'sound';// concept
    person?: boolean;            // artist is a person, not a group
    placeholder?: boolean;       // scene not researched yet
    layer?: 'producers';         // shown only when the «Продюсери» switch is on
    // Discogs-style taxonomy (approved 2026-11-06, applied 2026-11-10):
    level?: 'genre' | 'style';   // genre entity: broad Discogs genre or specific style (default: style)
    genres?: string[];           // style → parent Discogs genres (a style can have several)
    discogs?: string;            // exact Discogs name when the display name differs
    styles?: string[];           // release → styles (an album can have several)
  };
  author?: 'claude' | 'arthur';
}

export type RelationType =
  // facts
  | 'released' | 'on_label' | 'signed_to' | 'member_of' | 'founded' | 'collaborated' | 'style_of'
  | 'based_in' | 'part_of_scene' | 'track_of' | 'about_release' | 'produced' | 'mixed'
  // historical claims
  | 'in_genre' | 'emerged_from' | 'influenced' | 'supported' | 'developed_in' | 'scene_genre' | 'shaped_by_event'
  // interpretations
  | 'shares_trait' | 'demonstrates' | 'sounds_akin'
  // personal
  | 'led_me_to';

export type ClaimClass = 'fact' | 'history' | 'interpretation' | 'personal';

export const RELATION_CLASS: Record<RelationType, ClaimClass> = {
  released: 'fact', on_label: 'fact', signed_to: 'fact', member_of: 'fact', founded: 'fact',
  collaborated: 'fact', based_in: 'fact', part_of_scene: 'fact', track_of: 'fact', about_release: 'fact',
  produced: 'fact', mixed: 'fact', style_of: 'fact',
  in_genre: 'history', emerged_from: 'history', influenced: 'history', supported: 'history', developed_in: 'history',
  scene_genre: 'history', shaped_by_event: 'history',
  shares_trait: 'interpretation', demonstrates: 'interpretation', sounds_akin: 'interpretation',
  led_me_to: 'personal',
};

export interface Relation {
  id: string;
  type: RelationType;
  from: string;
  to: string;
  why: string;             // required: one sentence, Ukrainian
  confidence: Confidence;
  years?: YearSpan;
  author: 'claude' | 'arthur' | 'import';
  via?: string[];          // up to 4 evidence ids (artist, release, concept…): «through whom» the influence went
}

/** Optional note on a genre ⇄ genre bridge (data/bridges.json). Everything else in the bridge panel is derived. */
export interface BridgeNote {
  id: string;              // 'bridge:<a>~<b>', ids sorted
  a: string;
  b: string;
  diff?: string;           // one sentence, Ukrainian: how the two differ
  pin?: string[];          // up to 5 ids shown first in their group
  era?: [number, number];  // overrides the derived era
}

// ---- personal layer ----

export type ListeningStatus =
  | 'recommended' | 'to_listen' | 'listening' | 'listened' | 'liked' | 'disliked' | 'favorite' | 'revisit';
export type ExplorationStatus = 'curious' | 'exploring' | 'familiar' | 'deep' | 'not_now';
export type Status = ListeningStatus | ExplorationStatus;

export type Polarity = 'strong_positive' | 'positive' | 'mixed' | 'neutral' | 'negative';
export type ReactionScope = 'album' | 'track' | 'artist' | 'part';
export type NegativeReason =
  | 'disliked'        // album/track disliked
  | 'not_now'         // not interesting currently
  | 'too_intense'     // too intense for current mood
  | 'too_light'
  | 'not_explored'    // not explored enough
  | 'uncertain';      // neutral / uncertain

export type ListeningAxis = 'atmosphere' | 'texture' | 'space' | 'development' | 'melody' | 'groove';

export interface Reaction {
  id: string;
  target: string;
  date: string;            // ISO date of the note
  polarity?: Polarity;
  scope: ReactionScope;
  reason?: NegativeReason;
  anchor?: boolean;        // a taste anchor / reference from the brief
  axes?: ListeningAxis[];  // which listening axes the note speaks about
  segment?: { tracks?: string; fromSec?: number; toSec?: number };
  text: string;            // Arthur's words (translated from the brief) — never invented
  origin: 'brief-2026-11' | 'note' | 'app';
}

export type VinylState = 'owned' | 'wanted';

export interface Journal {
  statuses: Record<string, Status>;
  reactions: Reaction[];
  notes: Record<string, string>;
  vinyl?: Record<string, VinylState>;   // records Arthur has (or wants) on vinyl
}

export interface Hypothesis {
  id: string;
  text: string;
  status: 'open' | 'supported' | 'weakened';
  related: string[];
  origin: 'brief-2026-11' | 'note' | 'app';
}

// ---- UI labels (Ukrainian) ----

export const TYPE_LABEL: Record<EntityType, string> = {
  genre: 'Жанр / стиль', scene: 'Сцена', artist: 'Артист', release: 'Реліз', track: 'Трек',
  label: 'Лейбл', city: 'Місто', event: 'Подія', concept: 'Концепція', producer: 'Продюсер',
};

export const RELATION_LABEL: Record<RelationType, [string, string]> = {
  // [forward, backward]
  released: ['випустив', 'реліз артиста'],
  on_label: ['вийшов на лейблі', 'реліз лейблу'],
  signed_to: ['видавався на', 'артист лейблу'],
  member_of: ['учасник', 'учасники'],
  founded: ['заснував', 'засновник'],
  collaborated: ['співпраця з', 'співпраця з'],
  based_in: ['базується в', 'тут базується'],
  part_of_scene: ['частина сцени', 'артист сцени'],
  track_of: ['трек з', 'трек'],
  about_release: ['стосується', 'подія'],
  produced: ['продюсував', 'продюсер'],
  mixed: ['зводив', 'звукорежисер зведення'],
  style_of: ['стиль жанру', 'стилі жанру'],
  in_genre: ['стиль', 'артисти й релізи стилю'],
  emerged_from: ['виросло з', 'породило'],
  influenced: ['вплинуло на', 'зазнало впливу'],
  supported: ['підтримував', 'підтримка лейблу'],
  developed_in: ['сформувалося в', 'тут сформувалося'],
  scene_genre: ['сцена жанру', 'сцена'],
  shaped_by_event: ['позначилося подією', 'вплинула на'],
  shares_trait: ['спільна риса', 'спільна риса'],
  demonstrates: ['демонструє', 'приклад'],
  sounds_akin: ['звучить споріднено з', 'звучить споріднено з'],
  led_me_to: ['привело мене до', 'я прийшов звідси'],
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  established: 'встановлено',
  likely: 'ймовірно',
  disputed: 'спірно',
  unverified: 'не перевірено',
};

export const CLASS_LABEL: Record<ClaimClass, string> = {
  fact: 'Факт',
  history: 'Історична теза',
  interpretation: 'Інтерпретація',
  personal: 'Особисте',
};

export const STATUS_LABEL: Record<Status, string> = {
  recommended: 'Рекомендовано', to_listen: 'Послухати', listening: 'Слухаю', listened: 'Прослухано', liked: 'Подобається',
  disliked: 'Не подобається', favorite: 'Улюблене', revisit: 'Переслухати',
  curious: 'Цікаво', exploring: 'Досліджую', familiar: 'Знайоме', deep: 'Глибоко досліджено',
  not_now: 'Не зараз',
};

export const LISTENING_STATUSES: ListeningStatus[] =
  ['recommended', 'to_listen', 'listening', 'listened', 'liked', 'favorite', 'revisit', 'disliked'];
export const EXPLORATION_STATUSES: ExplorationStatus[] =
  ['curious', 'exploring', 'familiar', 'deep', 'not_now'];

export const REASON_LABEL: Record<NegativeReason, string> = {
  disliked: 'не сподобалось',
  not_now: 'зараз не цікаво',
  too_intense: 'занадто інтенсивно під настрій',
  too_light: 'занадто легко',
  not_explored: 'ще мало слухав',
  uncertain: 'нейтрально / непевно',
};

export const POLARITY_LABEL: Record<Polarity, string> = {
  strong_positive: 'Дуже подобається',
  positive: 'Подобається',
  mixed: 'Неоднозначно',
  neutral: 'Нейтрально',
  negative: 'Не працює',
};

export const SCOPE_LABEL: Record<ReactionScope, string> = {
  album: 'альбом', track: 'трек', artist: 'артист', part: 'фрагмент',
};

export const AXIS_LABEL: Record<ListeningAxis, string> = {
  atmosphere: 'атмосфера', texture: 'текстура', space: 'простір',
  development: 'розвиток', melody: 'мелодія/гармонія', groove: 'грув',
};

export const COUNTRY_LABEL: Record<CountryCode, string> = {
  GB: 'Велика Британія', US: 'США', JM: 'Ямайка', DE: 'Німеччина', AT: 'Австрія', FR: 'Франція',
  BE: 'Бельгія', IS: 'Ісландія', JP: 'Японія', IE: 'Ірландія', CA: 'Канада', BR: 'Бразилія', UA: 'Україна', SE: 'Швеція', AU: 'Австралія', MX: 'Мексика',
};

export const VINYL_LABEL: Record<VinylState, string> = { owned: 'вініл є в колекції', wanted: 'хочу на вінілі' };

/** «Жанр» for a broad Discogs genre, «Стиль» for a specific style. */
export function typeLabel(e: { type: EntityType; attrs?: { level?: 'genre' | 'style' } }): string {
  if (e.type === 'genre') return e.attrs?.level === 'genre' ? 'Жанр' : 'Стиль';
  return TYPE_LABEL[e.type];
}

export function isListeningType(t: EntityType) {
  return t === 'release' || t === 'track';
}

/** Arthur's later listening note (after the brief), applied once to the saved personal layer. */
export interface JournalNote {
  id: string;
  date: string;
  source?: string;                            // Arthur's own words this note was transcribed from
  reactions: Omit<Reaction, 'origin' | 'date'>[];
  statuses: Record<string, Status>;
  hypothesisLinks?: Record<string, string[]>; // hypothesis id → entity ids to add to `related`
  removeStatuses?: string[];                  // statuses Arthur's later words or likes made outdated
  removeReactions?: string[];                 // reactions replaced by a corrected one in this note
  vinyl?: Record<string, VinylState>;
  addHypotheses?: Hypothesis[];               // new hypotheses (saved hypotheses override the bundled list)
}
