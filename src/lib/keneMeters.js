export const LINE_TYPES = [
  { key: "wedaqi", label: "ወዳቂ" },
  { key: "tetay", label: "ተጣይ" },
  { key: "tenesh", label: "ተነሽ" },
  { key: "siyaf", label: "ስያፍ" },
];

export const TYPE_KEYS = LINE_TYPES.map((t) => t.key);
export const TYPE_LABEL = Object.fromEntries(LINE_TYPES.map((t) => [t.key, t.label]));

export const NOT_ALLOWED = "አይአቱን";
export const ORDINALS = ["፩", "፪", "፫", "፬", "፭", "፮"];

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

// ማንደርደርያ — the middle line of ዘአምላኪየ. ወዳቂ is አይአቱን as a መደብ, and the ተቀባሊ ወዳቂ count
// tracks the መደብ count: the lower one takes 3, the higher takes 2, with 6 always beside
// it. ተጣይ and ተነሽ are always 6; ስያፍ is never allowed.
const MANDERDERYA_MEDEB = [
  { type: "wedaqi", branches: [] },
  {
    type: "tetay",
    branches: [
      { counts: [3], follow: { wedaqi: [3, 6], tetay: [6], tenesh: [6], siyaf: null } },
      { counts: [4], follow: { wedaqi: [2, 6], tetay: [6], tenesh: [6], siyaf: null } },
    ],
  },
  {
    type: "tenesh",
    branches: [
      { counts: [3], follow: { wedaqi: [3, 6], tetay: [6], tenesh: [6], siyaf: null } },
      { counts: [4], follow: { wedaqi: [2, 6], tetay: [6], tenesh: [6], siyaf: null } },
    ],
  },
  {
    type: "siyaf",
    branches: [
      { counts: [4], follow: { wedaqi: [3, 6], tetay: [6], tenesh: [6], siyaf: null } },
      { counts: [5], follow: { wedaqi: [2, 6], tetay: [6], tenesh: [6], siyaf: null } },
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
// It has no መደብ side. Each lead type excludes one count from its span, and unlike every
// other ቤት column here, ስያፍ is allowed alongside the rest.
const LEWUT_MEWQE = [
  {
    type: "wedaqi",
    branches: [{ counts: [1, 2, 3, 5, 6], follow: { wedaqi: [5], tetay: [5], tenesh: [5], siyaf: [5] } }],
  },
  {
    type: "tetay",
    branches: [
      { counts: [2, 3, 4, 5, 6, 7], follow: { wedaqi: [4, 5], tetay: [4, 5], tenesh: [4, 5], siyaf: [4, 5] } },
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

// `examples` are the sample poems printed in the second header row of each sheet — they
// illustrate the table rather than naming any part of it, so a table without them is fine.
const QANA_TABLE = {
  id: "qana",
  name: "ጉባኤ ቃና",
  examples: { rowGroup: "ኢታብ ዘጎ", receiving: "ቶማስ", mewqe: "ወልደ መጽብሕ", house: "ሰሐቀ" },
  medeb: QANA_MEDEB,
  mewqe: QANA_MEWQE,
};

const MANDERDERYA_TABLE = {
  id: "manderderya",
  name: "ማንደርደርያ",
  examples: { rowGroup: "በታቢር", receiving: "ዐሪጎ", mewqe: "ወልድየ", house: "ወልድየ" },
  medeb: MANDERDERYA_MEDEB,
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

// A line is an ordered list of parts. A `medeb` pair fills መደብ → ተቀባሊ መደብ and may offer
// the ይለኩ በ choice; a `mewqe` pair fills መውቀዒ ቤት → ቤት and may offer a choice of which
// table measures it; a `hareg` part is a single optional slot.
const medebPair = (extra = {}) => ({ kind: "medeb", tables: [QANA_TABLE], sourceChoice: true, ...extra });
const mewqePair = (extra = {}) => ({ kind: "mewqe", tables: [QANA_TABLE], ...extra });
const haregPart = (options) => ({ kind: "hareg", options });

export const METERS = [
  {
    id: "geez",
    title: "ግእዝ ጉባኤ ቃና",
    lines: [
      { parts: [medebPair({ sourceChoice: false }), mewqePair()] },
      { parts: [medebPair(), mewqePair()] },
    ],
  },
  {
    id: "ezl",
    title: "ዕዝል ጉባኤ ቃና",
    lines: [
      { parts: [medebPair(), haregPart(HAREG_OPENING), mewqePair()] },
      { parts: [medebPair(), haregPart(HAREG_CLOSING), mewqePair()] },
    ],
  },
  {
    id: "zeamlakiye",
    title: "ዘአምላኪየ",
    lines: [
      { parts: [medebPair(), mewqePair()] },
      {
        parts: [
          medebPair({ tables: [MANDERDERYA_TABLE], sourceChoice: false }),
          mewqePair({ tables: [MANDERDERYA_TABLE] }),
        ],
      },
      { parts: [medebPair(), haregPart(HAREG_CLOSING), mewqePair()] },
    ],
  },
  {
    id: "mibezhu",
    title: "ሚ በዝሑ",
    lines: [
      {
        parts: [
          medebPair(),
          medebPair(),
          mewqePair({ tables: [QANA_TABLE, MANDERDERYA_TABLE, LEWUT_TABLE] }),
        ],
      },
      { parts: [medebPair(), mewqePair({ tables: [QANA_TABLE, LEWUT_TABLE] })] },
      { parts: [medebPair(), medebPair(), mewqePair()] },
    ],
  },
];

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
        label: "ሐረግ",
        short: "ሐረግ",
        caption: "Optional — may be left out",
        optional: true,
      });
      return;
    }

    const leadKey = `s${slots.length}`;
    slots.push({
      key: leadKey,
      part: partIndex,
      kind: part.kind,
      role: "lead",
      caption: PAIR_CAPTIONS[part.kind].lead,
      ...PAIR_LABELS[part.kind].lead,
    });
    slots.push({
      key: `s${slots.length}`,
      part: partIndex,
      kind: part.kind,
      role: "follow",
      leadKey,
      caption: PAIR_CAPTIONS[part.kind].follow,
      ...PAIR_LABELS[part.kind].follow,
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

  const config = lineState.parts[slot.part];
  const table = partTable(part, config);
  const side = part.kind === "medeb" && partSource(part, config) === "medeb" ? table.medeb : table.mewqe;

  if (slot.role === "lead") return leadOptions(side);

  const lead = lineState.slots[slot.leadKey];
  return followOptions(side, lead.type, lead.count);
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
  return [...seen.values()];
}

export function haregRows(meter) {
  const rows = [];
  meter.lines.forEach((line, index) => {
    const part = line.parts.find((p) => p.kind === "hareg");
    if (part) rows.push({ index, cells: followCells(part.options) });
  });
  return rows;
}
