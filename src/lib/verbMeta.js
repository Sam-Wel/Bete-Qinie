// Extra facts about some dictionary verbs that the dictionary itself doesn't
// store: a picture of the action and its semantic categories. Entries point at
// existing verbs by their Ge'ez spelling; meanings and translations always come
// from the dictionary, never from here.
//
// Every entry names an `anchor`: words that must appear in the dictionary's own
// Amharic, English or Tigrinya meanings for that verb. The tests check each
// anchor against real data, so a picture or category can't drift away from what
// the dictionary says. Verbs whose dictionary meanings contradict the obvious
// sense (ባረከ is listed in English as "curse", ሰረረ as "went up") are left out.
//
// To add a verb: give its Ge'ez spelling as in the dictionary, a picture if the
// action is clearly drawable, its categories, and an anchor from its meanings.

export const CATEGORIES = [
  { key: "movement", label: { en: "Movement", am: "እንቅስቃሴ", ti: "ምንቅስቓስ" } },
  { key: "communication", label: { en: "Speech & hearing", am: "ንግግርና መስማት", ti: "ዘረባን ምስማዕን" } },
  { key: "learning", label: { en: "Learning & thinking", am: "ትምህርትና ዕውቀት", ti: "ትምህርትን ፍልጠትን" } },
  { key: "emotions", label: { en: "Emotions", am: "ስሜት", ti: "ስምዒት" } },
  { key: "daily", label: { en: "Daily activities", am: "ዕለታዊ ተግባር", ti: "መዓልታዊ ንጥፈታት" } },
  { key: "religious", label: { en: "Religious & spiritual", am: "መንፈሳዊ ተግባር", ti: "መንፈሳዊ ተግባር" } },
];

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

// concept: one short English key per distinct action, so two verbs that show
// the same picture (two words for "drink") never appear as rival answers.
export const VERB_META = [
  // Daily activities
  { word: "በልዐ", concept: "eat", picture: "🍽️", categories: ["daily"], anchor: ["በላ", "ate"] },
  { word: "ሰትየ", concept: "drink", picture: "🥤", categories: ["daily"], anchor: ["ጠጣ", "drink"] },
  { word: "ለትሐ", concept: "drink", categories: ["daily"], anchor: ["drink"] },
  { word: "ኖመ", concept: "sleep", picture: "😴", categories: ["daily"], anchor: ["ተኛ", "sleep"] },
  { word: "ሰከበ", concept: "sleep", categories: ["daily"], anchor: ["ተኛ", "sleep"] },
  { word: "ኀፀበ", concept: "wash", picture: "🧼", categories: ["daily"], anchor: ["አጠበ"] },
  { word: "ኀበሰ", concept: "bake", picture: "🍞", categories: ["daily"], anchor: ["ጋገረ", "bake"] },
  { word: "ሐረሰ", concept: "plough", picture: "🐂", categories: ["daily"], anchor: ["አረሰ", "plough"] },
  { word: "ተከለ", concept: "plant", picture: "🌳", categories: ["daily"], anchor: ["ተከለ"] },
  { word: "ዐጸደ", concept: "reap", picture: "🌾", categories: ["daily"], anchor: ["አጨደ", "reap"] },
  { word: "ሐለበ", concept: "milk", picture: "🥛", categories: ["daily"], anchor: ["አለበ", "milk"] },
  { word: "ከረየ", concept: "dig", picture: "⛏️", categories: ["daily"], anchor: ["ቆፈረ", "dig"] },
  { word: "ሐነጸ", concept: "build", picture: "🧱", categories: ["daily"], anchor: ["ሠራ (የቤት)"] },

  // Learning and thinking
  { word: "ጸሐፈ", concept: "write", picture: "✍️", categories: ["learning"], anchor: ["ጻፈ", "write"] },
  { word: "አንበበ", concept: "read", picture: "📖", categories: ["learning"], anchor: ["አነበበ", "read"] },
  { word: "መሀረ", concept: "teach", picture: "🧑‍🏫", categories: ["learning"], anchor: ["አስተማረ"] },
  { word: "አእመረ", concept: "know", picture: "💡", categories: ["learning"], anchor: ["አወቀ"] },
  { word: "ተዘከረ", concept: "think", picture: "💭", categories: ["learning"], anchor: ["አሰበ"] },

  // Movement
  { word: "ሖረ", concept: "go", picture: "🚶", categories: ["movement"], anchor: ["ሔደ", "went"] },
  { word: "መጽአ", concept: "come", picture: "👋", categories: ["movement"], anchor: ["መጣ"] },
  { word: "ሮጸ", concept: "run", picture: "🏃", categories: ["movement"], anchor: ["ሮጠ", "ran"] },
  { word: "ዐርገ", concept: "climb", picture: "🧗", categories: ["movement"], anchor: ["ወጣ", "climb"] },
  { word: "ወረደ", concept: "descend", picture: "🛝", categories: ["movement"], anchor: ["ወረደ", "go down"] },
  { word: "ቆመ", concept: "stand", picture: "🧍", categories: ["movement"], anchor: ["ቆመ", "stood"] },
  { word: "ነበረ", concept: "sit", picture: "🪑", categories: ["movement"], anchor: ["ተቀመጠ"] },
  { word: "ጸበተ", concept: "swim", picture: "🏊", categories: ["movement"], anchor: ["ዋኘ", "swim"] },
  { word: "ወድቀ", concept: "fall", picture: "🤕", categories: ["movement"], anchor: ["ወደቀ", "fell"] },
  { word: "ሰከመ", concept: "carry", picture: "🎒", categories: ["movement"], anchor: ["ተሸከመ", "carry"] },

  // Speech and hearing
  { word: "ነበበ", concept: "speak", picture: "🗣️", categories: ["communication"], anchor: ["ተናገረ"] },
  { word: "ሰምዐ", concept: "hear", picture: "👂", categories: ["communication"], anchor: ["ሰማ", "heard"] },
  { word: "ጸውዐ", concept: "call", categories: ["communication"], anchor: ["ጠራ"] },
  { word: "ጸርሐ", concept: "shout", picture: "📢", categories: ["communication"], anchor: ["ጮኸ", "shout"] },
  { word: "ተሰአለ", concept: "ask", picture: "🙋", categories: ["communication"], anchor: ["ጠየቀ"] },
  { word: "ዘፈነ", concept: "dance", picture: "💃", categories: ["communication"], anchor: ["ዘፈነ", "dance"] },

  // Emotions
  { word: "ሠሀቀ", concept: "laugh", picture: "😂", categories: ["emotions"], anchor: ["ሳቀ", "laugh"] },
  { word: "በከየ", concept: "weep", picture: "😢", categories: ["emotions"], anchor: ["አለቀሰ", "weep"] },
  { word: "ፈርሀ", concept: "fear", picture: "😨", categories: ["emotions"], anchor: ["ፈራ", "fear"] },
  { word: "ተፈሥሐ", concept: "rejoice", picture: "😊", categories: ["emotions"], anchor: ["ደስ ተሰኘ", "happy"] },
  { word: "አፍቀረ", concept: "love", picture: "❤️", categories: ["emotions"], anchor: ["ወደደ"] },
  { word: "ተምዐ", concept: "be angry", picture: "😠", categories: ["emotions"], anchor: ["ተቆጣ", "angry"] },
  { word: "ሐዘነ", concept: "grieve", picture: "😔", categories: ["emotions"], anchor: ["አዘነ"] },

  // Religious and spiritual
  { word: "ጸለየ", concept: "pray", picture: "🙏", categories: ["religious"], anchor: ["ጸለየ", "pray"] },
  { word: "ሰገደ", concept: "bow down", picture: "🛐", categories: ["religious"], anchor: ["ሰገደ", "bowed"] },
  { word: "ጾመ", concept: "fast", categories: ["religious"], anchor: ["ጾመ", "fasted"] },
  { word: "ሰብሐ", concept: "praise", picture: "🎼", categories: ["religious"], anchor: ["አመሰገነ", "glorify"] },
  { word: "በረከ", concept: "kneel", picture: "🧎", categories: ["religious"], anchor: ["ተንበረከከ", "kneel"] },
  { word: "ሐለየ", concept: "sing a hymn", categories: ["religious"], anchor: ["ዘመረ"] },
  { word: "ዘመረ", concept: "give thanks", categories: ["religious"], anchor: ["አመሰገነ"] },

  // Pictures without a sorting category
  { word: "ዘንመ", concept: "rain", picture: "🌧️", categories: [], anchor: ["ዘነበ", "rain"] },
  { word: "ነደ", concept: "burn", picture: "🔥", categories: [], anchor: ["ነደደ", "burn"] },
];

const META_BY_WORD = Object.fromEntries(VERB_META.map((m) => [m.word, m]));

export const metaOf = (entry) => (entry ? META_BY_WORD[entry.word] ?? null : null);

// The bank entries that have metadata, joined to it. Entries missing from the
// loaded dictionary are simply skipped.
export function withMeta(bank) {
  return bank.words.map((entry) => ({ entry, meta: metaOf(entry) })).filter((x) => x.meta);
}

// Whether a dictionary entry's own meanings confirm a metadata entry.
export function anchorHolds(entry, meta) {
  const meanings = [...entry.tr.am, ...entry.tr.en, ...entry.tr.ti].join(" | ").toLowerCase();
  return meta.anchor.some((a) => meanings.includes(a.toLowerCase()));
}

export const categoryLabel = (key, lang) => CATEGORY_BY_KEY[key]?.label[lang] ?? CATEGORY_BY_KEY[key]?.label.en ?? key;
