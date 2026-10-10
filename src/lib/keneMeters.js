export const LINE_TYPES = [
  { key: "wedaqi", label: "ወዳቂ" },
  { key: "tetay", label: "ተጣይ" },
  { key: "tenesh", label: "ተነሽ" },
  { key: "siyaf", label: "ስያፍ" },
];

export const TYPE_KEYS = LINE_TYPES.map((t) => t.key);
export const TYPE_LABEL = Object.fromEntries(LINE_TYPES.map((t) => [t.key, t.label]));

export const NOT_ALLOWED = "አይአቱን";
export const ORDINALS = ["፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱", "፲", "፲፩", "፲፪"];

export const MEASURE_SOURCES = [
  { key: "medeb", label: "መደብ" },
  { key: "mewqe", label: "መውቀዒ ቤት" },
];

// A pair table is one half of a printed መዐቀኒ row: for each line type, the lead counts on
// offer and the follow options each unlocks. A type with no branches is አይአቱን in that
// slot, and a null follow type is አይአቱን beside it. The two halves are separate tables —
// the መደብ side never constrains the መውቀዒ ቤት side.

const QANA_MEDEB = [
  {
    type: "wedaqi",
    branches: [{ counts: [1, 2, 3], follow: { wedaqi: null, tetay: [3], tenesh: [3], siyaf: [4] } }],
  },
  {
    type: "tetay",
    branches: [{ counts: [2, 3, 4], follow: { wedaqi: null, tetay: [2, 3], tenesh: [2, 3], siyaf: [3, 4] } }],
  },
  {
    type: "tenesh",
    branches: [{ counts: [2, 3, 4], follow: { wedaqi: null, tetay: [2], tenesh: [2], siyaf: [3] } }],
  },
  {
    type: "siyaf",
    branches: [{ counts: [3, 4, 5], follow: { wedaqi: null, tetay: [2], tenesh: [2], siyaf: [3] } }],
  },
];

const QANA_MEWQE = [
  {
    type: "wedaqi",
    branches: [{ counts: [5, 6], follow: { wedaqi: [3], tetay: [3], tenesh: [3], siyaf: null } }],
  },
  {
    type: "tetay",
    branches: [{ counts: [6, 7], follow: { wedaqi: [2, 3], tetay: [2, 3], tenesh: [2, 3], siyaf: null } }],
  },
  {
    type: "tenesh",
    branches: [
      { counts: [6, 7], follow: { wedaqi: [2], tetay: [2], tenesh: [2], siyaf: null } },
      { counts: [5], follow: { wedaqi: [3], tetay: [3], tenesh: [3], siyaf: null } },
    ],
  },
  {
    type: "siyaf",
    branches: [
      { counts: [7, 8], follow: { wedaqi: [2], tetay: [2], tenesh: [2], siyaf: null } },
      { counts: [6], follow: { wedaqi: [3], tetay: [3], tenesh: [3], siyaf: null } },
    ],
  },
];

// ማንደርደርያ — the middle line of ዘአምላኪየ, which comes long or short. The long one always
// rests on 6 and never takes a ወዳቂ መደብ; the short one rests on a ወዳቂ of 2 or 3 and
// nothing else. ስያፍ never receives in either. Both share one መውቀዒ ቤት side.
const LONG_REST = { wedaqi: [6], tetay: [6], tenesh: [6], siyaf: null };

const MANDERDERYA_MEDEB = [
  { type: "wedaqi", branches: [] },
  { type: "tetay", branches: [{ counts: [2, 3, 4], follow: LONG_REST }] },
  { type: "tenesh", branches: [{ counts: [2, 3, 4], follow: LONG_REST }] },
  { type: "siyaf", branches: [{ counts: [3, 4, 5], follow: LONG_REST }] },
];

const shortRest = (counts) => ({ wedaqi: counts, tetay: null, tenesh: null, siyaf: null });

const MANDERDERYA_SHORT_MEDEB = [
  { type: "wedaqi", branches: [{ counts: [1, 2, 3], follow: shortRest([3]) }] },
  { type: "tetay", branches: [{ counts: [2, 3, 4], follow: shortRest([2, 3]) }] },
  {
    type: "tenesh",
    branches: [
      { counts: [2, 3], follow: shortRest([3]) },
      { counts: [4], follow: shortRest([2]) },
    ],
  },
  {
    type: "siyaf",
    branches: [
      { counts: [3, 4], follow: shortRest([3]) },
      { counts: [5], follow: shortRest([2]) },
    ],
  },
];

const MANDERDERYA_MEWQE = [
  {
    type: "wedaqi",
    branches: [{ counts: [3], follow: { wedaqi: [3], tetay: [3], tenesh: [3], siyaf: null } }],
  },
  {
    type: "tetay",
    branches: [{ counts: [4], follow: { wedaqi: [2, 3], tetay: [2, 3], tenesh: [2, 3], siyaf: null } }],
  },
  {
    type: "tenesh",
    branches: [
      { counts: [3], follow: { wedaqi: [3], tetay: [3], tenesh: [3], siyaf: null } },
      { counts: [4], follow: { wedaqi: [2], tetay: [2], tenesh: [2], siyaf: null } },
    ],
  },
  {
    type: "siyaf",
    branches: [
      { counts: [4], follow: { wedaqi: [3], tetay: [3], tenesh: [3], siyaf: null } },
      { counts: [5], follow: { wedaqi: [2], tetay: [2], tenesh: [2], siyaf: null } },
    ],
  },
];

// ልውጥ ሚ በዝሑ — an alternative measure for the መውቀዒ ቤት pair of ሚ በዝሑ's first two lines.
// It has no መደብ side. Its lead takes the ዕዝል ጉባኤ ቃና መደብ counts, so each type skips one
// count in its span, and unlike every other ቤት column here, ስያፍ is allowed alongside the
// rest. A line measured this way also takes its መደብ from the ዕዝል sheet — see `swap`.
const LEWUT_MEWQE = [
  {
    type: "wedaqi",
    branches: [{ counts: [1, 2, 3, 5, 6], follow: { wedaqi: [5], tetay: [5], tenesh: [5], siyaf: [5] } }],
  },
  {
    type: "tetay",
    branches: [
      { counts: [2, 3, 4, 6, 7], follow: { wedaqi: [4, 5], tetay: [4, 5], tenesh: [4, 5], siyaf: [4, 5] } },
    ],
  },
  {
    type: "tenesh",
    branches: [{ counts: [2, 3, 4, 6, 7], follow: { wedaqi: [4], tetay: [4], tenesh: [4], siyaf: [4] } }],
  },
  {
    type: "siyaf",
    branches: [{ counts: [3, 4, 5, 7, 8], follow: { wedaqi: [4], tetay: [4], tenesh: [4], siyaf: [4] } }],
  },
];

// ዕዝል ጉባኤ ቃና — its መደብ takes the low counts and the high ones in a single span, so it has
// no ይለኩ በ choice. Each type skips one count (ወዳቂ 4, ተጣይ 5, ተነሽ 5, ስያፍ 6), and the
// ተቀባሊ መደብ is the same as ግዕዝ ጉባኤ ቃና whichever count is taken.
const EZL_MEDEB = [
  {
    type: "wedaqi",
    branches: [{ counts: [1, 2, 3, 5, 6], follow: { wedaqi: null, tetay: [3], tenesh: [3], siyaf: [4] } }],
  },
  {
    type: "tetay",
    branches: [{ counts: [2, 3, 4, 6, 7], follow: { wedaqi: null, tetay: [2, 3], tenesh: [2, 3], siyaf: [3, 4] } }],
  },
  {
    type: "tenesh",
    branches: [{ counts: [2, 3, 4, 6, 7], follow: { wedaqi: null, tetay: [2], tenesh: [2], siyaf: [3] } }],
  },
  {
    type: "siyaf",
    branches: [{ counts: [3, 4, 5, 7, 8], follow: { wedaqi: null, tetay: [2], tenesh: [2], siyaf: [3] } }],
  },
];

// ---- sheets for the longer forms ----
//
// The longer ቅኔ reuse ጉባኤ ቃና, ማንደርደርያ and ልውጥ for most of their lines, and add a handful
// of pairs of their own. Most have one side only. A follow with no type allowed at all
// means the lead stands on its own and nothing is measured beside it.
const all = (counts) => ({ wedaqi: counts, tetay: counts, tenesh: counts, siyaf: counts });
const ALONE = { wedaqi: null, tetay: null, tenesh: null, siyaf: null };
const row = (type, counts, follow) => ({ type, branches: counts ? [{ counts, follow }] : [] });

// The መደብ counts of each ጉባኤ ቃና, for sheets that open the way it does.
const GEEZ_LEAD = { wedaqi: [1, 2, 3], tetay: [2, 3, 4], tenesh: [2, 3, 4], siyaf: [3, 4, 5] };
const EZL_LEAD = { wedaqi: [1, 2, 3, 5, 6], tetay: [2, 3, 4, 6, 7], tenesh: [2, 3, 4, 6, 7], siyaf: [3, 4, 5, 7, 8] };
const leading = (lead, follow, skip = []) =>
  TYPE_KEYS.map((type) => row(type, skip.includes(type) ? null : lead[type], follow));

// ዋዜማ opens on a ጉባኤ ቃና መደብ that is never ወዳቂ, resting on 4 or 5.
const WAZEMA_OPEN = leading(EZL_LEAD, all([4, 5]), ["wedaqi"]);

// ሥላሴ opens on the ግዕዝ መደብ only, never ወዳቂ, resting on 4 or 5 — or on 6 with ተናባቢ.
const SILLASE_OPEN = leading(GEEZ_LEAD, all([4, 5, 6]), ["wedaqi"]);

// ኃይለ ቃል takes the high counts and rests the way ልውጥ does.
const HAYLE_QAL = [
  row("wedaqi", [5, 6], all([5])),
  row("tetay", [6, 7], all([4, 5])),
  row("tenesh", [6, 7], all([4])),
  row("siyaf", [7, 8], all([4])),
];

// The ኃይለ ቃል that is ሥላሴ's fourth line may also open on the ግዕዝ counts, resting on 5.
const HAYLE_QAL_FOURTH = HAYLE_QAL.map((entry) => ({
  ...entry,
  branches: [...entry.branches, { counts: GEEZ_LEAD[entry.type], follow: all([5]) }],
}));

// መጽፍያ ቤት closes either on one whole segment — 6 with ተናባቢ, or a ወዳቂ of 4 or 5 — or on
// a ግዕዝ መደብ with a ተጣይ or ተነሽ beside it. ሥላሴ lets the whole segment be ስያፍ as well.
const metsfiya = (wholeSiyaf) => [
  {
    type: "wedaqi",
    branches: [
      { counts: [4, 5], follow: ALONE },
      { counts: [1, 2, 3], follow: { wedaqi: null, tetay: [3], tenesh: [3], siyaf: null } },
    ],
  },
  {
    type: "tetay",
    branches: [
      { counts: [6], follow: ALONE },
      { counts: [2, 3, 4], follow: { wedaqi: null, tetay: [2, 3], tenesh: [2, 3], siyaf: null } },
    ],
  },
  {
    type: "tenesh",
    branches: [
      { counts: [6], follow: ALONE },
      { counts: [2, 3, 4], follow: { wedaqi: null, tetay: [2], tenesh: [2], siyaf: null } },
    ],
  },
  {
    type: "siyaf",
    branches: [
      ...(wholeSiyaf ? [{ counts: [6], follow: ALONE }] : []),
      { counts: [3, 4, 5], follow: { wedaqi: null, tetay: [2], tenesh: [2], siyaf: null } },
    ],
  },
];

// ዘይእዜ opens on a ጉባኤ ቃና መደብ resting on 5.
const ZEYEZE_OPEN = leading(EZL_LEAD, all([5]));

// መወድስ's second line may close on one whole segment of 4 to 6 with ተናባቢ.
const MEWEDES_WHOLE = TYPE_KEYS.map((type) => row(type, [4, 5, 6], ALONE));

// ለዓለሙ breaks on ሂ, ኒ or ሰ, which is always ወዳቂ; unbroken, it opens the way ልውጥ does and
// rests on 4 to 6.
const LEALEMU = leading({ wedaqi: [3, 4, 5, 6] }, all([4, 5]), ["tetay", "tenesh", "siyaf"]);
const LEALEMU_LEWUT = leading(EZL_LEAD, all([4, 5, 6]));

// The ማንደርደርያ that ends ግዕዝ ዕጣነ ሞገር: the usual መውቀዒ ቤት, but every ቤት is 4.
const MANDERDERYA_BET4 = MANDERDERYA_MEWQE.map((entry) => ({
  type: entry.type,
  branches: [{ counts: entry.branches.flatMap((b) => b.counts).sort((a, b) => a - b), follow: all([4]) }],
}));

const NO_EXAMPLES = { rowGroup: "", receiving: "", mewqe: "", house: "" };
const sheet = (id, name, sides) => ({ id, name, examples: NO_EXAMPLES, medeb: [], mewqe: [], ...sides });

const LONG_FORM_TABLES = [
  sheet("wazema_open", "ዋዜማ መክፈቻ", { medeb: WAZEMA_OPEN }),
  sheet("sillase_open", "ሥላሴ መክፈቻ", { medeb: SILLASE_OPEN }),
  sheet("hayle_qal", "ኃይለ ቃል", { mewqe: HAYLE_QAL }),
  sheet("hayle_qal_fourth", "ኃይለ ቃል — ፬ ቤት", { mewqe: HAYLE_QAL_FOURTH }),
  sheet("metsfiya", "መጽፍያ ቤት", { mewqe: metsfiya(false) }),
  sheet("metsfiya_sillase", "መጽፍያ ቤት — ሥላሴ", { mewqe: metsfiya(true) }),
  sheet("zeyeze_open", "ዘይእዜ መክፈቻ", { medeb: ZEYEZE_OPEN }),
  sheet("mewedes_whole", "መወድስ — ፪ ቤት በተናባቢ", { mewqe: MEWEDES_WHOLE }),
  sheet("lealemu", "ለዓለሙ", { medeb: LEALEMU }),
  sheet("lealemu_lewut", "ለዓለሙ — ልውጥ", { medeb: LEALEMU_LEWUT }),
  sheet("manderderya_bet4", "ማንደርደርያ — ቤት ፬", { mewqe: MANDERDERYA_BET4 }),
];

// `examples` are the sample poems printed in the second header row of each sheet — they
// illustrate the table rather than naming any part of it, so a table without them is fine.
const QANA_TABLE = {
  id: "qana",
  name: "ጉባኤ ቃና",
  examples: { rowGroup: "ኢታብ ዘጎ", receiving: "ቶማስ", mewqe: "ወልደ መጽብሕ", house: "ሰሐቀ" },
  medeb: QANA_MEDEB,
  mewqe: QANA_MEWQE,
};

// The መውቀዒ ቤት side is ጉባኤ ቃና's, repeated here so the ዕዝል sheet prints whole and can be
// edited without changing ግዕዝ.
const EZL_TABLE = {
  id: "ezl",
  name: "ዕዝል ጉባኤ ቃና",
  examples: { rowGroup: "", receiving: "", mewqe: "", house: "" },
  medeb: EZL_MEDEB,
  mewqe: QANA_MEWQE,
};

const MANDERDERYA_TABLE = {
  id: "manderderya",
  name: "ማንደርደርያ",
  examples: { rowGroup: "በታቢር", receiving: "ዐሪጎ", mewqe: "ወልድየ", house: "ወልድየ" },
  medeb: MANDERDERYA_MEDEB,
  mewqe: MANDERDERYA_MEWQE,
};

const MANDERDERYA_SHORT_TABLE = {
  id: "manderderya_short",
  name: "ሓጺር ማንደርደርያ",
  examples: { rowGroup: "", receiving: "", mewqe: "", house: "" },
  medeb: MANDERDERYA_SHORT_MEDEB,
  mewqe: MANDERDERYA_MEWQE,
};

const LEWUT_TABLE = {
  id: "lewut",
  name: "ልውጥ ሚ በዝሑ",
  examples: { rowGroup: "", receiving: "", mewqe: "", house: "" },
  medeb: [],
  mewqe: LEWUT_MEWQE,
};

const HAREG_OPENING = { wedaqi: [3, 4, 5], tetay: [4, 5], tenesh: [4, 5], siyaf: [4, 5] };
const HAREG_CLOSING = { wedaqi: [3], tetay: null, tenesh: null, siyaf: null };

// Everything an admin can edit lives in these two registries. The meter definitions below
// only name the pieces, so a stored override can replace one without touching structure.
export const DEFAULT_TABLES = {
  qana: QANA_TABLE,
  ezl: EZL_TABLE,
  manderderya: MANDERDERYA_TABLE,
  manderderya_short: MANDERDERYA_SHORT_TABLE,
  lewut: LEWUT_TABLE,
  ...Object.fromEntries(LONG_FORM_TABLES.map((table) => [table.id, table])),
};

export const DEFAULT_HAREG = {
  opening: { id: "opening", name: "ሐረግ — መክፈቻ", options: HAREG_OPENING },
  closing: { id: "closing", name: "ሐረግ — መዝጊያ", options: HAREG_CLOSING },
  // Segments measured on their own rather than in a pair. They are stored like ሐረግ, but a
  // line that names one must have it.
  melali: { id: "melali", name: "መልዓሊ", options: { wedaqi: [4], tetay: [4], tenesh: [4], siyaf: null } },
  rest6: { id: "rest6", name: "መዕረፊ — ፮", options: all([6]) },
  bet45: { id: "bet45", name: "መውቀዒ ቤት — ፬ ወይም ፭", options: all([4, 5]) },
};

// A line is an ordered list of parts. A `medeb` pair fills መደብ → ተቀባሊ መደብ and may offer
// the ይለኩ በ choice; a `mewqe` pair fills መውቀዒ ቤት → ቤት and may offer a choice of which
// table measures it; a `hareg` part is a single optional slot. Parts name their tables by
// id so a stored override can be swapped in without changing any of this structure.
//
// A `swap` on a መደብ pair hands it to another sheet while the line's መውቀዒ ቤት is on a given
// one. That sheet's መደብ side then measures the pair outright, with no ይለኩ በ choice.
const medebPair = (extra = {}) => ({ kind: "medeb", tableIds: ["qana"], sourceChoice: true, ...extra });
const mewqePair = (extra = {}) => ({ kind: "mewqe", tableIds: ["qana"], ...extra });
const haregPart = (haregId) => ({ kind: "hareg", haregId });
const singlePart = (haregId, label) => ({ kind: "hareg", haregId, label, required: true });

// Lines that recur across the longer forms.
const qanaLine = () => ({ parts: [medebPair(), mewqePair()] });
const lewutPair = () => medebPair({ tableIds: ["lewut"], sourceChoice: false });
const hayleQal = (tableIds) => mewqePair({ tableIds, names: ["ኃይለ ቃል", "ተቀባሊ"] });
const manderderyaParts = (extra = {}) => [
  medebPair({ tableIds: ["manderderya", "manderderya_short"], sourceChoice: false, ...extra }),
  mewqePair({ tableIds: ["manderderya"] }),
];
const manderderyaLine = () => ({ parts: manderderyaParts() });
// After a ኃይለ ቃል the ማንደርደርያ may come without a መደብ of its own.
const hayleQalLine = () => ({
  parts: [hayleQal(["lewut", "zeyeze_open"]), ...manderderyaParts({ optional: true })],
});
const metsfiyaLine = (tableId) => ({ parts: [medebPair(), mewqePair({ tableIds: [tableId] })] });
const closingLine = () => ({ parts: [singlePart("melali", "መልዓሊ"), mewqePair({ tableIds: ["manderderya"] })] });
const haregLine = (haregId) => ({ parts: [medebPair(), haregPart(haregId), mewqePair()] });

const WAZEMA_FIRST = () => ({
  parts: [medebPair({ tableIds: ["wazema_open"], sourceChoice: false }), medebPair(), mewqePair()],
});
const ZEYEZE_FIRST = () => ({
  parts: [medebPair({ tableIds: ["zeyeze_open", "lewut"], sourceChoice: false }), medebPair(), mewqePair()],
});
const ZEYEZE_THIRD = () => ({ parts: [medebPair(), mewqePair({ tableIds: ["lewut"] })] });
const LEWUT_BOTH = () => ({ parts: [lewutPair(), mewqePair({ tableIds: ["lewut"] })] });

const EZL_WHEN_LEWUT = { swap: { whenTableId: "lewut", tableId: "ezl" } };

export const METER_DEFS = [
  {
    id: "geez",
    contentType: "ግዕዝ",
    title: "ግእዝ ጉባኤ ቃና",
    lines: [
      { parts: [medebPair({ sourceChoice: false }), mewqePair()] },
      { parts: [medebPair(), mewqePair()] },
    ],
  },
  {
    id: "ezl",
    contentType: "እዝል",
    title: "ዕዝል ጉባኤ ቃና",
    lines: [
      {
        parts: [
          medebPair({ tableIds: ["ezl"], sourceChoice: false }),
          haregPart("opening"),
          mewqePair({ tableIds: ["ezl"] }),
        ],
      },
      {
        parts: [
          medebPair({ tableIds: ["ezl"], sourceChoice: false }),
          haregPart("closing"),
          mewqePair({ tableIds: ["ezl"] }),
        ],
      },
    ],
  },
  {
    id: "zeamlakiye",
    contentType: "ዘአምላኪየ",
    title: "ዘአምላኪየ",
    lines: [
      { parts: [medebPair(), mewqePair()] },
      {
        parts: [
          medebPair({ tableIds: ["manderderya", "manderderya_short"], sourceChoice: false }),
          mewqePair({ tableIds: ["manderderya"] }),
        ],
      },
      { parts: [medebPair(), haregPart("closing"), mewqePair()] },
    ],
  },
  {
    id: "mibezhu",
    contentType: "ሚበዝሑ",
    title: "ሚ በዝሑ",
    lines: [
      {
        parts: [
          medebPair(EZL_WHEN_LEWUT),
          medebPair(EZL_WHEN_LEWUT),
          mewqePair({ tableIds: ["qana", "manderderya", "lewut"] }),
        ],
      },
      { parts: [medebPair(EZL_WHEN_LEWUT), mewqePair({ tableIds: ["qana", "lewut"] })] },
      { parts: [medebPair(), medebPair(), mewqePair()] },
    ],
  },
  {
    id: "wazema",
    contentType: "ዋዜማ",
    title: "ዋዜማ",
    lines: [WAZEMA_FIRST(), manderderyaLine(), qanaLine(), metsfiyaLine("metsfiya"), closingLine()],
  },
  {
    id: "wazema_short",
    contentType: "ዋዜማ",
    title: "ሓጺር ዋዜማ",
    lines: [manderderyaLine(), qanaLine()],
  },
  {
    id: "wazema_meskot",
    contentType: "ዋዜማ",
    title: "መስኮት ዋዜማ",
    lines: [WAZEMA_FIRST(), metsfiyaLine("metsfiya"), closingLine()],
  },
  {
    id: "sillase",
    contentType: "ሥላሴ",
    title: "ሥላሴ",
    lines: [
      {
        parts: [
          medebPair({ tableIds: ["sillase_open"], sourceChoice: false }),
          hayleQal(["hayle_qal"]),
          medebPair(),
          haregPart("closing"),
          mewqePair(),
        ],
      },
      manderderyaLine(),
      haregLine("closing"),
      { parts: [hayleQal(["hayle_qal_fourth"])] },
      metsfiyaLine("metsfiya_sillase"),
      closingLine(),
    ],
  },
  {
    id: "zeyeze",
    contentType: "ዘይእዜ",
    title: "ዘይእዜ",
    lines: [
      ZEYEZE_FIRST(),
      hayleQalLine(),
      ZEYEZE_THIRD(),
      { parts: [medebPair(), singlePart("rest6", "መዕረፊ")] },
      qanaLine(),
    ],
  },
  {
    id: "sahlike",
    contentType: "ሣህልከ",
    title: "ሣህልከ",
    lines: [ZEYEZE_FIRST(), hayleQalLine(), ZEYEZE_THIRD()],
  },
  {
    id: "mewedes",
    contentType: "መወድስ",
    title: "መወድስ",
    lines: [
      {
        parts: [
          medebPair(),
          singlePart("rest6", "መዕረፊ"),
          medebPair(),
          mewqePair({ tableIds: ["qana", "lewut"] }),
        ],
      },
      { parts: [medebPair(), mewqePair({ tableIds: ["qana", "mewedes_whole"] })] },
      hayleQalLine(),
      { parts: [hayleQal(["lewut"]), medebPair(), mewqePair({ tableIds: ["qana", "lewut"] })] },
      // Unbroken, ለዓለሙ may end on its own rest, so the መውቀዒ ቤት after it can be left out.
      {
        parts: [
          medebPair({ tableIds: ["lealemu", "lealemu_lewut"], sourceChoice: false }),
          mewqePair({ optional: true }),
        ],
      },
      LEWUT_BOTH(),
      qanaLine(),
      LEWUT_BOTH(),
    ],
  },
  {
    id: "mewedes_short",
    contentType: "አጭር-መወድስ",
    title: "ሓጺር መወድስ",
    lines: [{ parts: [medebPair({ sourceChoice: false }), mewqePair()] }, manderderyaLine()],
  },
  {
    id: "kibr_geez",
    contentType: "ክብር-ይእቲ-ግዕዝ",
    title: "ግዕዝ ክብር ይእቲ",
    lines: [ZEYEZE_THIRD(), qanaLine(), qanaLine(), ZEYEZE_THIRD()],
  },
  {
    id: "kibr_ezl",
    contentType: "ክብር-ይእቲ-ዕዝል",
    title: "ዕዝል ክብር ይእቲ",
    lines: [haregLine("opening"), qanaLine(), qanaLine(), haregLine("opening")],
  },
  {
    id: "etane_geez",
    contentType: "ዕጣነ-ሞገር-ግዕዝ",
    title: "ግዕዝ ዕጣነ ሞገር",
    lines: [
      { parts: [medebPair(), medebPair(), haregPart("opening"), mewqePair({ tableIds: ["lewut"] })] },
      qanaLine(),
      qanaLine(),
      manderderyaLine(),
      // አሠረ ንጉሥ
      { parts: [medebPair(), haregPart("opening"), mewqePair({ tableIds: ["lewut"] })] },
      haregLine("opening"),
      {
        parts: [
          medebPair({ tableIds: ["manderderya", "manderderya_short"], sourceChoice: false }),
          mewqePair({ tableIds: ["manderderya_bet4"] }),
        ],
      },
    ],
  },
  {
    id: "etane_ezl",
    contentType: "ዕጣነ-ሞገር-ዕዝል",
    title: "ዕዝል ዕጣነ ሞገር",
    lines: [
      qanaLine(),
      { parts: [medebPair(), singlePart("bet45", "መውቀዒ ቤት")] },
      { parts: [lewutPair(), mewqePair()] },
      { parts: [lewutPair()] },
      haregLine("closing"),
      manderderyaLine(),
      // አሠረ ንጉሥ
      haregLine("opening"),
      haregLine("closing"),
      metsfiyaLine("metsfiya_sillase"),
      closingLine(),
    ],
  },
];

// Swaps the named tables and ሐረግ sets into the structure above. Anything missing from an
// override falls back to the bundled default, so a partial or failed load still works.
export function resolveMeters(tables = DEFAULT_TABLES, hareg = DEFAULT_HAREG) {
  const tableOf = (id) => tables[id] ?? DEFAULT_TABLES[id];
  const haregOf = (id) => (hareg[id] ?? DEFAULT_HAREG[id])?.options ?? null;

  return METER_DEFS.map((meter) => ({
    ...meter,
    lines: meter.lines.map((line) => ({
      ...line,
      parts: line.parts.map((part) =>
        part.kind === "hareg"
          ? { ...part, options: haregOf(part.haregId) }
          : {
              ...part,
              tables: part.tableIds.map(tableOf).filter(Boolean),
              ...(part.swap ? { swap: { ...part.swap, table: tableOf(part.swap.tableId) } } : {}),
            }
      ),
    })),
  }));
}

export const METERS = resolveMeters();

const PAIR_LABELS = {
  medeb: { lead: { label: "መደብ", short: "መደብ" }, follow: { label: "ተቀባሊ መደብ", short: "ተቀባሊ" } },
  mewqe: { lead: { label: "መውቀዒ ቤት", short: "መውቀዒ" }, follow: { label: "ቤት", short: "ቤት" } },
};

const PAIR_CAPTIONS = {
  medeb: { lead: "Opens the pair and picks its row", follow: "Receives the መደብ" },
  mewqe: { lead: "Opens the pair on its own row", follow: "Closes the pair" },
};

// Where a label repeats inside one line, number the occurrences so the strip stays readable.
function numberRepeats(slots) {
  const totals = {};
  for (const slot of slots) totals[slot.label] = (totals[slot.label] ?? 0) + 1;

  const seen = {};
  return slots.map((slot) => {
    if (totals[slot.label] < 2) return slot;
    seen[slot.label] = (seen[slot.label] ?? 0) + 1;
    const mark = ORDINALS[seen[slot.label] - 1];
    return { ...slot, label: `${slot.label} ${mark}`, short: `${slot.short} ${mark}` };
  });
}

export function buildLineSlots(lineDef) {
  const slots = [];

  lineDef.parts.forEach((part, partIndex) => {
    if (part.kind === "hareg") {
      slots.push({
        key: `s${slots.length}`,
        part: partIndex,
        kind: "hareg",
        role: "single",
        label: part.label ?? "ሐረግ",
        short: part.label ?? "ሐረግ",
        caption: part.required ? "Measured on its own" : "Optional — may be left out",
        optional: !part.required,
      });
      return;
    }

    // A pair may carry its own names (ኃይለ ቃል), and an optional pair is left out by
    // leaving its lead empty — the follow then has nothing to answer to.
    const named = (index, fallback) =>
      part.names ? { label: part.names[index], short: part.names[index] } : fallback;

    const leadKey = `s${slots.length}`;
    slots.push({
      key: leadKey,
      part: partIndex,
      kind: part.kind,
      role: "lead",
      caption: part.optional ? "Optional — the pair may be left out" : PAIR_CAPTIONS[part.kind].lead,
      ...named(0, PAIR_LABELS[part.kind].lead),
      ...(part.optional ? { optional: true } : {}),
    });
    slots.push({
      key: `s${slots.length}`,
      part: partIndex,
      kind: part.kind,
      role: "follow",
      leadKey,
      caption: PAIR_CAPTIONS[part.kind].follow,
      ...named(1, PAIR_LABELS[part.kind].follow),
      ...(part.optional ? { optionalPair: true } : {}),
    });
  });

  return numberRepeats(slots);
}

export function partSource(part, config) {
  return part.sourceChoice ? config?.source ?? "medeb" : "medeb";
}

export function partTable(part, config) {
  return part.tables[config?.table ?? 0] ?? part.tables[0];
}

// Which sheet and side measure a pair right now. `fixed` means the line's መውቀዒ ቤት has
// handed this መደብ to another sheet, so there is nothing for the reader to choose.
export function partMeasure(lineDef, partIndex, lineState) {
  const part = lineDef.parts[partIndex];
  const config = lineState.parts[partIndex];

  const swapped =
    part.swap?.table &&
    lineDef.parts.some(
      (other, i) => other.kind === "mewqe" && partTable(other, lineState.parts[i])?.id === part.swap.whenTableId
    );
  if (swapped) return { table: part.swap.table, source: "medeb", fixed: true };

  return { table: partTable(part, config), source: partSource(part, config), fixed: false };
}

const emptyOptions = () => ({ wedaqi: null, tetay: null, tenesh: null, siyaf: null });

export function leadOptions(table) {
  const options = emptyOptions();

  for (const entry of table) {
    for (const branch of entry.branches) {
      const merged = [...(options[entry.type] ?? []), ...branch.counts];
      options[entry.type] = [...new Set(merged)].sort((a, b) => a - b);
    }
  }

  return options;
}

export function followOptions(table, type, count) {
  if (!table || !type || count == null) return null;
  const entry = table.find((e) => e.type === type);
  return entry?.branches.find((b) => b.counts.includes(count))?.follow ?? null;
}

export function slotOptions(lineDef, slot, lineState) {
  const part = lineDef.parts[slot.part];
  if (part.kind === "hareg") return part.options;

  const { table, source } = partMeasure(lineDef, slot.part, lineState);
  // A one-sided sheet measures whichever pair names it.
  const [wanted, other] =
    part.kind === "medeb" && source === "medeb" ? [table.medeb, table.mewqe] : [table.mewqe, table.medeb];
  const side = wanted?.length ? wanted : other;

  if (slot.role === "lead") return leadOptions(side);

  const lead = lineState.slots[slot.leadKey];
  return followOptions(side, lead.type, lead.count);
}

// A follow is not part of the line when its pair was left out, or when the lead chosen
// stands on its own.
export function slotNeeded(lineDef, slot, lineState) {
  if (slot.role !== "follow") return true;

  const lead = lineState.slots[slot.leadKey];
  if (lead?.skipped || (slot.optionalPair && !lead?.type)) return false;

  const options = slotOptions(lineDef, slot, lineState);
  return !(options && TYPE_KEYS.every((key) => !options[key]?.length));
}

export function isAllowed(options, type, count) {
  if (!options || !type || count == null) return false;
  return Boolean(options[type]?.includes(count));
}

// ---- printed-table rendering, derived from the same rules the checker uses ----

export function formatCounts(counts) {
  if (!counts?.length) return NOT_ALLOWED;

  const sorted = [...counts].sort((a, b) => a - b);
  const runs = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (const count of sorted.slice(1)) {
    if (count === prev + 1) {
      prev = count;
      continue;
    }
    runs.push([start, prev]);
    start = count;
    prev = count;
  }
  runs.push([start, prev]);

  return runs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(" ወይም ");
}

// Types that carry measures are printed first, then the አይአቱን ones — which is how the
// ማንደርደርያ sheet lists ወዳቂ last on its መደብ side.
function orderedEntries(table) {
  return [...table.filter((e) => e.branches.length), ...table.filter((e) => !e.branches.length)];
}

function leadCell(entry) {
  if (!entry.branches.length) return TYPE_LABEL[entry.type];
  const [first, ...rest] = entry.branches;
  return [`${TYPE_LABEL[entry.type]} ${formatCounts(first.counts)}`, ...rest.map((b) => formatCounts(b.counts))].join(
    "\n"
  );
}

const followCells = (follow) => Object.fromEntries(TYPE_KEYS.map((key) => [key, formatCounts(follow[key])]));

// One cell per type; a value that is the same on every branch is printed once.
function mergedFollowCells(entry) {
  if (!entry.branches.length) return Object.fromEntries(TYPE_KEYS.map((key) => [key, NOT_ALLOWED]));

  return Object.fromEntries(
    TYPE_KEYS.map((key) => {
      const values = entry.branches.map((b) => formatCounts(b.follow[key]));
      return [key, values.every((v) => v === values[0]) ? values[0] : values.join("\n")];
    })
  );
}

export function buildMeasureTable(table) {
  const left = orderedEntries(table.medeb);
  const right = orderedEntries(table.mewqe);
  const blank = Object.fromEntries(TYPE_KEYS.map((key) => [key, ""]));

  const rows = Array.from({ length: Math.max(left.length, right.length) }, (_, i) => ({
    medeb: left[i] ? leadCell(left[i]) : "",
    tekebali: left[i] ? mergedFollowCells(left[i]) : blank,
    mewqe: right[i] ? leadCell(right[i]) : "",
    bet: right[i] ? right[i].branches.map((b) => followCells(b.follow)) : [blank],
  }));

  return {
    title: table.name,
    rowGroupLabel: table.examples.rowGroup,
    receivingLabel: table.examples.receiving,
    mewqeHeaderLabel: table.examples.mewqe,
    houseLabel: table.examples.house,
    rows,
  };
}

export function meterTables(meter) {
  const seen = new Map();
  for (const line of meter.lines)
    for (const part of line.parts)
      for (const table of part.tables ?? []) if (!seen.has(table.id)) seen.set(table.id, table);
  // Sheets reached only through a swap come last, after the ones a line names outright.
  for (const line of meter.lines)
    for (const part of line.parts)
      if (part.swap?.table && !seen.has(part.swap.table.id)) seen.set(part.swap.table.id, part.swap.table);
  return [...seen.values()];
}

// Every segment measured on its own: ሐረግ, which may be left out, and the named ones a
// line must have.
export function haregRows(meter) {
  const rows = [];
  meter.lines.forEach((line, index) => {
    for (const part of line.parts) {
      if (part.kind !== "hareg" || !part.options) continue;
      rows.push({
        index,
        label: part.label ?? "ሐረግ",
        required: Boolean(part.required),
        cells: followCells(part.options),
      });
    }
  });
  return rows;
}
