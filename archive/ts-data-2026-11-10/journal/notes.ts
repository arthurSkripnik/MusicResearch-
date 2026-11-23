// Arthur's later listening notes, sent as chat messages (after the brief).
// Rule: only what Arthur wrote. Nothing here is inferred or invented.
// Each entry is applied once to the saved personal layer (see `appliedNotes` in lib/repository.ts),
// so a status Arthur later changes in the app is not overwritten.
import type { Reaction, Status, VinylState, Hypothesis } from '../schema';
import { producerTracks } from '../canon/producers';

export interface JournalNote {
  id: string;
  date: string;
  reactions: Omit<Reaction, 'origin' | 'date'>[];
  statuses: Record<string, Status>;
  hypothesisLinks?: Record<string, string[]>; // hypothesis id → entity ids to add to `related`
  removeStatuses?: string[];                  // statuses Arthur's later words or likes made outdated
  removeReactions?: string[];                 // reactions replaced by a corrected one in this note
  vinyl?: Record<string, VinylState>;
  addHypotheses?: Hypothesis[];               // new hypotheses (saved hypotheses override the bundled list)
}

export const journalNotes: JournalNote[] = [
  {
    // «Слухаю еріку баду, альбом будуізм. Відмітив собі трек некст тайм. Подобається цілісність альбому.
    //   Тягуча аттмосфера, бархатний вокал і музика відчувається для вечора або пізньої ночі»
    id: 'note-2026-11-06-baduizm',
    date: '2026-11-06',
    reactions: [
      { id: 'note-2026-11-06-baduizm-1', target: 'release:baduizm', polarity: 'positive', scope: 'album',
        axes: ['atmosphere', 'texture'],
        text: 'Подобається цілісність альбому. Тягуча атмосфера, бархатний вокал, і музика відчувається для вечора або пізньої ночі.' },
      { id: 'note-2026-11-06-baduizm-2', target: 'track:next-lifetime', scope: 'track',
        text: 'Відмітив собі цей трек.' },
    ],
    statuses: { 'release:baduizm': 'listening' },
    hypothesisLinks: { 'hyp:album-cohesion': ['release:baduizm'] },
  },
  {
    // Arthur's Spotify Liked Songs (snapshot 2026-11-07): tracks on the records of the producer layer.
    // A Spotify like is Arthur's own signal (he chose it as the feedback channel); nothing else is inferred.
    id: 'note-2026-11-07-producer-likes',
    date: '2026-11-07',
    reactions: [],
    statuses: Object.fromEntries(producerTracks.map((t) => [t.id, 'liked' as Status])),
  },
  {
    // Weekly update for 2026-11-02…09 (run 2026-11-10). Arthur's words from the threads, plus his Spotify likes
    // (a like is his own chosen feedback signal). Nothing here is inferred beyond what the comments say.
    id: 'note-2026-11-10-weekly',
    date: '2026-11-10',
    reactions: [
      // ChatGPT-catalog answers (2026-11-06, voice)
      { id: 'w46-incubus', target: 'track:incubus', polarity: 'strong_positive', scope: 'track', axes: ['texture', 'atmosphere'],
        text: 'Мені сподобався саме вокал: здається, це коли не співається, а промовляються слова. Дуже сподобалося звучання, кінематографічність, враження дуже-дуже класні.' },
      { id: 'w46-black-sands', target: 'release:black-sands', polarity: 'positive', scope: 'part', axes: ['melody', 'atmosphere'],
        text: 'Мені подобається, мабуть, декілька треків з альбому, але цікавий альбом в цілому. Не сказав би, що прям всі треки подобаються. Поки не ставимо, що прям весь альбом.' },
      { id: 'w46-kong', target: 'track:kong', polarity: 'positive', scope: 'track', text: 'Здається, там трек «Конго» цікавий.' },
      { id: 'w46-bonobo', target: 'artist:bonobo', polarity: 'positive', scope: 'artist', text: 'Мені було цікаве звучання Bonobo, відкрити його для себе.' },
      ...['dummy', 'mezzanine', 'psyence-fiction'].map((s) => ({ id: `w46-${s}`, target: `release:${s}`, polarity: 'strong_positive' as const,
        scope: 'album' as const, text: 'Це мені дуже подобається: в мене приємні враження від трип-хопу, і я хочу це мати на вінілі.' })),
      { id: 'w46-shunt', target: 'track:shunt', polarity: 'strong_positive', scope: 'track', text: 'Сильна позитивна реакція.' },
      { id: 'w46-archive', target: 'artist:archive', polarity: 'strong_positive', scope: 'artist', text: 'Один з моїх улюблених артистів.' },
      // neo-soul thread
      { id: 'w46-kiwanuka', target: 'artist:michael-kiwanuka', polarity: 'strong_positive', scope: 'artist',
        text: 'Він у моєму топі. Я не можу сказати, що мені подобається все від нього.' },
      { id: 'w46-love-and-hate', target: 'release:love-and-hate', polarity: 'positive', scope: 'album', text: 'Альбом — переважно так.' },
      { id: 'w46-cold-little-heart', target: 'track:cold-little-heart', polarity: 'strong_positive', scope: 'track', text: 'Особливо Cold Little Heart.' },
      { id: 'w46-mamas-gun', target: 'release:mamas-gun', polarity: 'mixed', scope: 'album', text: 'Не такі приємні враження, як з минулого альбому (Baduizm).' },
      { id: 'w46-in-love-with-you', target: 'track:in-love-with-you', polarity: 'strong_positive', scope: 'track', axes: ['texture'],
        text: 'Дуже сподобався. Цікава колаборація, цікавий звук. Хочу дослідити гостя (Stephen Marley).' },
      // reggae & dub thread
      { id: 'w46-no-protection', target: 'release:no-protection', polarity: 'positive', scope: 'album', axes: ['groove'],
        text: 'В цілому гарно. Під настрій. Добре розкрився вдома на акустичній системі: це був сонячний день, не хотілось важкого, просто потягнувся, попив чаю і послухав цей грув.' },
      { id: 'w46-teardrop-dub', target: 'track:teardrop-mazaruni', polarity: 'strong_positive', scope: 'track', text: 'Це щось неймовірне.' },
      { id: 'w46-dub', target: 'genre:dub', polarity: 'positive', scope: 'part', axes: ['groove'],
        text: 'Мені привідкрились витоки трип-хопу: цей басовий і повільний грув. Почав слухати, і мені було б цікаво дослідити.' },
      // Fred again.. & LATIN MAFIA, Eno
      { id: 'w46-nine-months', target: 'release:nine-months', polarity: 'strong_positive', scope: 'album',
        text: 'Альбом в цілому — один з найкращих за останній час прослуханих.' },
      { id: 'w46-cmon-edit', target: 'track:cmon-edit', polarity: 'strong_positive', scope: 'track', text: 'Дуже подобається трек з Браяном Іно.' },
      { id: 'w46-secret-life', target: 'release:secret-life', polarity: 'positive', scope: 'album', axes: ['atmosphere', 'space'],
        text: 'Просто невагома музика, подобається. Така нічна і спокійна, легка. Вже додав весь альбом і буду точно слухати.' },
      { id: 'w46-eno', target: 'artist:brian-eno', scope: 'artist', text: 'У Fred again.. чути вплив Eno, хочу його дослідити.' },
      // Radiohead thread
      { id: 'w46-kid-a', target: 'release:kid-a', polarity: 'positive', scope: 'album', text: 'Цікавий альбом. Хотілось би мати на вінілі.' },
      { id: 'w46-eiirp', target: 'track:everything-in-its-right-place', polarity: 'positive', scope: 'track', axes: ['texture'],
        text: 'Перший трек точно лайк. Цікаво, що голос тут — як інструмент.' },
      { id: 'w46-kid-a-track', target: 'track:kid-a-track', polarity: 'mixed', scope: 'track', axes: ['development', 'texture'],
        text: 'Точно щось з духу Aphex Twin. Добре лягає під відео чи сторіс, але для прослуховування складно. Хоча друга половина, коли додався шар гітари і потім піднесення, зазвучала цікаво. Кінець сподобався більше: був накал, який формував незручність, і потім так легко і добре стало, коли вивільнилося.' },
      { id: 'w46-national-anthem', target: 'track:the-national-anthem', polarity: 'positive', scope: 'part',
        text: 'На середині цікаво заграли труби. Джазові труби на електронній музиці — цікаво.' },
      { id: 'w46-morning-bell', target: 'track:morning-bell', polarity: 'positive', scope: 'track', text: 'Також сподобався трек Morning Bell.' },
      // jazz thread (2026-11-10)
      { id: 'w46-bill-evans', target: 'artist:bill-evans', polarity: 'positive', scope: 'artist', axes: ['space'],
        text: 'Bill Evans мені зайшов, бо я відчував там повітря.' },
      { id: 'w46-jazz', target: 'genre:jazz', polarity: 'mixed', scope: 'part', axes: ['space', 'texture'],
        text: 'Мені не дуже заходить занадто джазовий джаз, де нашаровується багато інструментів, труби. Нема повітря: може, під настрій у барі, але не для прослуховування вдома. Більш розмірене, ембієнт, можливо софт-джаз, мені сподобалося б більше. Але потрошки треба слухати й інше.' },
    ],
    removeReactions: ['brief-5', 'brief-18'], // Black Sands (whole album → several tracks), Shunt (identified)
    removeStatuses: ['artist:tricky'],        // «not_now» from the brief: his likes now include early and late Tricky
    statuses: {
      // recommendations he did not pick himself (his answer to the ChatGPT catalog)
      'release:smokers-delight': 'recommended', 'release:timeless': 'recommended', 'release:new-forms': 'recommended',
      'release:dig-your-own-hole': 'recommended',
      'release:black-sands': 'listened', 'track:kong': 'liked', 'track:incubus': 'favorite',
      'release:dummy': 'liked', 'release:mezzanine': 'liked', 'release:psyence-fiction': 'liked',
      'release:love-and-hate': 'liked', 'track:cold-little-heart': 'favorite',
      'release:mamas-gun': 'listened', 'track:in-love-with-you': 'favorite',
      'release:no-protection': 'liked', 'track:teardrop-mazaruni': 'favorite',
      'genre:dub': 'exploring', 'genre:reggae': 'exploring', 'artist:stephen-marley': 'curious', 'artist:mad-professor': 'curious',
      'release:nine-months': 'listened', 'track:cmon-edit': 'liked', 'release:secret-life': 'listening',
      'artist:brian-eno': 'curious', 'genre:ambient': 'curious',
      'release:kid-a': 'liked', 'track:everything-in-its-right-place': 'liked', 'track:morning-bell': 'liked',
      'genre:jazz': 'exploring', 'artist:bill-evans': 'exploring',
      // Spotify likes, 06–09 Nov
      ...Object.fromEntries([
        'cmon', 'come-on-home', 'archangel', 'secrets-of-patriarchy', 'victory-lap', 'bumper-ball-dub', 'trinity-dub',
        'you-are-my-angel', 'natural-mystic', 'electric-relaxation', 'hold-on-brand-nubian', 'right-place-wrong-time',
        'rainy-night-in-georgia', 'blue-in-green', 'river-man', 'exit-music-mehldau', 'goodbye-pork-pie-hat', 'clin-doeil-track',
        'six-underground', 'passion-of-the-christ', 'useless-kd', 'caruso',
      ].map((s) => [`track:${s}`, 'liked' as Status])),
    },
    vinyl: {
      'release:dummy': 'owned', 'release:mezzanine': 'owned', 'release:ultra': 'owned',
      'release:psyence-fiction': 'wanted', 'release:kid-a': 'wanted',
    },
    addHypotheses: [
      { id: 'hyp:day-night-groove', status: 'open', origin: 'note',
        text: 'Реґі й даб — для прослуховування в обід під сонечко, а трип-хоп обернув той самий повільний басовий грув у формат для ночі й нуару.',
        related: ['genre:dub', 'genre:roots-reggae', 'genre:trip-hop', 'release:no-protection', 'release:mezzanine'] },
      { id: 'hyp:tension-release', status: 'open', origin: 'note',
        text: 'Мене ловить дуга «накал → вивільнення», а не текстура сама по собі: трек, що спершу муляє, а потім розряджається.',
        related: ['track:kid-a-track', 'track:heroist', 'release:lp5'] },
      { id: 'hyp:air', status: 'open', origin: 'note',
        text: 'Мені важливе повітря й простір у звуці: Bill Evans, Secret Life, Nujabes. Щільний, нашарований джаз із духовими — для бару, не для дому.',
        related: ['artist:bill-evans', 'genre:jazz', 'track:blue-in-green', 'release:secret-life', 'genre:ambient'] },
    ],
    hypothesisLinks: {
      'hyp:vocals-as-texture': ['track:everything-in-its-right-place', 'concept:vocal-chops', 'track:incubus'],
      'hyp:album-cohesion': ['release:kid-a', 'release:nine-months'],
    },
  },
];
