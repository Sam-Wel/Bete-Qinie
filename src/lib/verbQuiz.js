// ግሲ ፈተና: the rules of the verb quiz, kept free of React and Supabase so they
// can be checked on their own. A verb is a Ge'ez word ending in a first-order
// letter; verbs are grouped into families by that ending letter.

export const LANGUAGES = [
  { code: "ti", label: "ትግርኛ" },
  { code: "am", label: "አማርኛ" },
  { code: "en", label: "English" },
];

export const LANGUAGE_LABEL = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.label]));

// Letters that sound alike share a family, and a verb may end in any of them
// (including the fourth-order ኃ, ዓ and ኣ). The label names every letter so none
// silently disappears. ቈ and ኰ are labialised forms of ቀ and ከ.
export const FAMILIES = [
  { id: "ሀ", letters: ["ሀ", "ሐ", "ኃ", "ኀ"] },
  { id: "ለ", letters: ["ለ"] },
  { id: "መ", letters: ["መ"] },
  { id: "ሰ", letters: ["ሰ", "ሠ"] },
  { id: "ረ", letters: ["ረ"] },
  { id: "ቀ", letters: ["ቀ"], also: ["ቈ"] },
  { id: "በ", letters: ["በ"] },
  { id: "ተ", letters: ["ተ"] },
  { id: "ነ", letters: ["ነ"] },
  { id: "አ", letters: ["ዐ", "ዓ", "አ", "ኣ"] },
  { id: "ከ", letters: ["ከ"], also: ["ኰ"] },
  { id: "ወ", letters: ["ወ"] },
  { id: "ዘ", letters: ["ዘ"] },
  { id: "የ", letters: ["የ"] },
  { id: "ደ", letters: ["ደ"] },
  { id: "ገ", letters: ["ገ"] },
  { id: "ጠ", letters: ["ጠ"] },
  { id: "ጰ", letters: ["ጰ"] },
  { id: "ጸ", letters: ["ጸ", "ፀ"] },
  { id: "ፈ", letters: ["ፈ"] },
  { id: "ፐ", letters: ["ፐ"] },
].map((family) => ({ ...family, label: family.letters.join("·") }));

export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));

const FAMILY_OF_LETTER = Object.fromEntries(
  FAMILIES.flatMap((f) => [...f.letters, ...(f.also || [])].map((letter) => [letter, f.id]))
);

export const VERB_ENDINGS = Object.keys(FAMILY_OF_LETTER);

export function familyOf(word) {
  const letters = [...(word || "").trim()];
  return FAMILY_OF_LETTER[letters[letters.length - 1]] ?? null;
}

export const PART_SIZE = 20;
export const KNOWN_BOX = 3;
const MAX_BOX = 5;
const OPTION_COUNT = 4;

// ---------------------------------------------------------------------
// The bank
// ---------------------------------------------------------------------

// rows: [{ word_id, word, ti: [], am: [], en: [] }] in source (word_id) order.
export function buildBank(rows) {
  const seen = new Set();
  const words = [];
  for (const row of [...rows].sort((a, b) => a.word_id - b.word_id)) {
    const word = (row.word || "").trim();
    const family = familyOf(word);
    if (!family || seen.has(word)) continue;
    seen.add(word);
    const clean = (list) => [...new Set((list || []).map((t) => (t || "").trim()).filter(Boolean))];
    const tr = { ti: clean(row.ti), am: clean(row.am), en: clean(row.en) };
    // Many verbs are spelled the same in Tigrinya or Amharic. That is worth
    // showing, but asking it would print the answer in the question, so `ask`
    // holds only the meanings that differ from the Ge'ez word.
    const ask = Object.fromEntries(Object.entries(tr).map(([code, list]) => [code, list.filter((t) => t !== word)]));
    words.push({ id: row.word_id, word, family, tr, ask });
  }
  const byFamily = Object.fromEntries(FAMILIES.map((f) => [f.id, []]));
  for (const entry of words) byFamily[entry.family].push(entry);
  const byId = Object.fromEntries(words.map((w) => [w.id, w]));
  // Every Ge'ez word, verb or not, for games that accept any real word as a guess.
  const allWords = [...new Set(rows.map((r) => (r.word || "").trim()).filter(Boolean))];
  return { words, byFamily, byId, allWords };
}

export const hasLanguage = (entry, lang) => entry.ask[lang]?.length > 0;

// A family's words split into parts of PART_SIZE, in source order. Parts are cut
// from the family's full list, so a part keeps its words whichever language is
// chosen; words without that language are simply skipped inside it.
export function partsOf(bank, familyId) {
  const list = bank.byFamily[familyId] || [];
  const parts = [];
  for (let i = 0; i < list.length; i += PART_SIZE) parts.push(list.slice(i, i + PART_SIZE));
  return parts;
}

// scope: { mode: "all" } or { mode: "choose", picks: { [familyId]: "all" | partIndex } }
export function wordsInScope(bank, scope, lang) {
  let pool;
  if (scope.mode === "all") {
    pool = bank.words;
  } else {
    pool = Object.entries(scope.picks || {}).flatMap(([familyId, pick]) =>
      pick === "all" ? bank.byFamily[familyId] || [] : partsOf(bank, familyId)[pick] || []
    );
  }
  return pool.filter((entry) => hasLanguage(entry, lang));
}

// ---------------------------------------------------------------------
// Word progress
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Review schedule (ክለሳ). Every answer, from any game or the quiz, moves the
// same record: a right answer moves the word up a box and puts its next
// review further off; a wrong one drops it to box 1, due tomorrow. Dates are
// whole days, so a word due "tomorrow" is ready from tomorrow morning.
// ---------------------------------------------------------------------

export const REVIEW_DAYS = [1, 1, 3, 7, 21, 60]; // by box
export const REVIEW_SESSION = 20;

export const startOfDay = (time) => {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Midnight `days` calendar days after `time`. Counted in days, not 24-hour
// steps, so a clock change can't land "tomorrow" late tonight.
export const addDays = (time, days) => {
  const d = new Date(startOfDay(time));
  d.setDate(d.getDate() + days);
  return d.getTime();
};

const dueAfter = (box, correct, now) => addDays(now, correct ? REVIEW_DAYS[Math.min(box, MAX_BOX)] : 1);

export function applyAnswer(stat, correct, now = Date.now()) {
  const s = stat || { seen: 0, correct: 0, streak: 0, box: 0 };
  const box = correct ? Math.min(MAX_BOX, s.box + 1) : 1;
  return {
    seen: s.seen + 1,
    correct: s.correct + (correct ? 1 : 0),
    streak: correct ? s.streak + 1 : 0,
    box,
    lastCorrect: correct,
    lastSeen: now,
    lastWrong: correct ? s.lastWrong ?? null : now,
    due: dueAfter(box, correct, now),
    saved: Boolean(s.saved),
  };
}

// Records kept before review dates existed get one from their last answer.
export function withDue(stat) {
  if (!stat || stat.due != null || !stat.seen) return stat;
  return { ...stat, due: dueAfter(stat.box, stat.lastCorrect !== false, stat.lastSeen ?? Date.now()) };
}

// Added to ክለሳ by hand: in today's review unless it is already scheduled.
export function markSaved(stat, now = Date.now()) {
  const s = stat || { seen: 0, correct: 0, streak: 0, box: 0, lastCorrect: null, lastSeen: null, lastWrong: null };
  return { ...s, saved: true, due: s.due ?? now };
}

export const markUnsaved = (stat) => (stat ? { ...stat, saved: false } : stat);

export const inReview = (stat) => Boolean(stat && (stat.saved || stat.seen > 0) && stat.due != null);
export const isDue = (stat, now = Date.now()) => inReview(stat) && stat.due <= now;

// What ክለሳ asks today: words missed last time first, then the most overdue,
// at most `limit` at a time so a long game can't bury the learner.
export function dueQueue(stats, now = Date.now(), limit = REVIEW_SESSION) {
  return Object.entries(stats)
    .filter(([, s]) => isDue(s, now))
    .sort(([, a], [, b]) => (b.lastCorrect === false) - (a.lastCorrect === false) || a.due - b.due)
    .slice(0, limit)
    .map(([id]) => Number(id));
}

export function reviewSummary(stats, now = Date.now()) {
  let due = 0;
  let week = 0;
  let saved = 0;
  for (const s of Object.values(stats)) {
    if (s?.saved) saved += 1;
    if (!inReview(s)) continue;
    if (s.due <= now) due += 1;
    else if (s.due < addDays(now, 8)) week += 1;
  }
  return { due, week, saved };
}

// new: never asked. shaky: the last answer was wrong. learning: right lately but
// not yet often enough. known: right KNOWN_BOX times without a slip.
export function stateOf(stat) {
  if (!stat || !stat.seen) return "new";
  if (stat.lastCorrect === false) return "shaky";
  if (stat.box >= KNOWN_BOX) return "known";
  return "learning";
}

export const STATES = [
  { key: "known", label: "Known" },
  { key: "learning", label: "Learning" },
  { key: "shaky", label: "Missed last time" },
  { key: "new", label: "New" },
];

// ---------------------------------------------------------------------
// Choosing words
// ---------------------------------------------------------------------

export const FILTERS = [
  { key: "smart", label: "Smart mix", hint: "Words that are due (misses first), then new ones. Words not due yet wait their turn." },
  { key: "all", label: "All words", hint: "Every word in what you picked, in random order." },
  { key: "missed", label: "Words I've missed", hint: "Words you've answered wrong and don't know yet." },
  { key: "unseen", label: "Words I haven't seen", hint: "Only words you've never been asked." },
  { key: "unknown", label: "Not known yet", hint: "Everything you haven't mastered." },
];

export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function filterPool(pool, stats, filter) {
  const state = (entry) => stateOf(stats[entry.id]);
  switch (filter) {
    case "missed":
      return pool.filter((e) => stats[e.id] && stats[e.id].correct < stats[e.id].seen && state(e) !== "known");
    case "unseen":
      return pool.filter((e) => state(e) === "new");
    case "unknown":
      return pool.filter((e) => state(e) !== "known");
    default:
      return pool;
  }
}

// How ready a word is to be asked: 0 due now (or missed last time), 1 never
// seen, 2 not due yet. Records from before review dates count from their last answer.
export function freshness(stat, now = Date.now()) {
  const state = stateOf(stat);
  if (state === "new") return 1;
  if (state === "shaky" || isDue(withDue(stat), now)) return 0;
  return 2;
}

// Earliest first; words never answered sort last.
const byDue = (stats) => (a, b) => (withDue(stats[a.id])?.due ?? Infinity) - (withDue(stats[b.id])?.due ?? Infinity);

// Smart mix: words that are due (misses first, then most overdue) take up to
// 60% of the slots and new words fill the rest. Words that aren't due yet only
// come in when there is nothing else, soonest due first, so the same words
// don't come back game after game.
function smartPick(pool, stats, count, random, now) {
  const ready = [];
  const fresh = [];
  const later = [];
  for (const entry of pool) [ready, fresh, later][freshness(stats[entry.id], now)].push(entry);
  const missedFirst = (a, b) =>
    (stateOf(stats[b.id]) === "shaky") - (stateOf(stats[a.id]) === "shaky") || byDue(stats)(a, b);
  ready.sort(missedFirst);
  later.sort(byDue(stats));
  const unseen = shuffle(fresh, random);

  const readyTake = Math.min(ready.length, Math.ceil(count * 0.6));
  const picked = [...ready.slice(0, readyTake), ...unseen.slice(0, count - readyTake)];
  for (const entry of [...ready.slice(readyTake), ...unseen, ...later]) {
    if (picked.length >= count) break;
    if (!picked.includes(entry)) picked.push(entry);
  }
  return shuffle(picked.slice(0, count), random);
}

// Same order for games with their own small word lists: due, then new, then
// the rest, shuffled within each.
export function freshFirst(items, stats, idOf = (x) => x.id, random = Math.random, now = Date.now()) {
  const tiers = [[], [], []];
  for (const item of items) tiers[freshness(stats[idOf(item)], now)].push(item);
  return tiers.flatMap((tier) => shuffle(tier, random));
}

export function pickWords(pool, stats, filter, count, random = Math.random, now = Date.now()) {
  const limit = count === "all" ? Infinity : count;
  if (filter === "smart") return smartPick(pool, stats, Math.min(limit, pool.length), random, now);
  return shuffle(filterPool(pool, stats, filter), random).slice(0, limit);
}

// ---------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------

export const DIRECTIONS = [
  { key: "mixed", label: "Mixed" },
  { key: "toMeaning", label: "ግዕዝ → meaning" },
  { key: "toGeez", label: "Meaning → ግዕዝ" },
];

const meaningOf = (entry, lang) => entry.ask[lang].slice(0, 3).join(" · ");

// Wrong options come from the same ending family first: they look like the
// answer, so they can only be told apart by knowing the word. Any option that
// shares a meaning with the answer is left out, so exactly one is right.
function distractors(entry, lang, direction, bank, random, near = true) {
  const meanings = new Set(entry.tr[lang]);
  const clash = (other) => other.id === entry.id || other.word === entry.word || other.tr[lang].some((m) => meanings.has(m));
  const candidates = (list) => shuffle(list.filter((o) => hasLanguage(o, lang) && !clash(o)), random);

  const ordered = near ? [...candidates(bank.byFamily[entry.family]), ...candidates(bank.words)] : candidates(bank.words);
  const texts = [];
  const answerText = direction === "toGeez" ? entry.word : null;
  for (const other of ordered) {
    const text = direction === "toGeez" ? other.word : other.ask[lang][Math.floor(random() * other.ask[lang].length)];
    if (texts.includes(text) || text === answerText || meanings.has(text)) continue;
    texts.push(text);
    if (texts.length === OPTION_COUNT - 1) break;
  }
  return texts;
}

// near: wrong options from the same ending family first (look-alikes, harder);
// false draws them from the whole dictionary (easier).
export function buildQuestion(entry, lang, direction, bank, random = Math.random, { near = true } = {}) {
  const dir = direction === "mixed" ? (random() < 0.5 ? "toMeaning" : "toGeez") : direction;
  const answer =
    dir === "toGeez" ? entry.word : entry.ask[lang][Math.floor(random() * entry.ask[lang].length)];
  const options = shuffle([answer, ...distractors(entry, lang, dir, bank, random, near)], random);
  return {
    wordId: entry.id,
    family: entry.family,
    dir,
    prompt: dir === "toGeez" ? meaningOf(entry, lang) : entry.word,
    options,
    answerIndex: options.indexOf(answer),
  };
}

export function buildQuiz(words, lang, direction, bank, random = Math.random) {
  return words.map((entry) => buildQuestion(entry, lang, direction, bank, random));
}

// ---------------------------------------------------------------------
// Runs and progress
// ---------------------------------------------------------------------

// answers: [{ wordId, family, correct }] for the first try at each question.
export function summarizeRun(answers) {
  const families = {};
  for (const a of answers) {
    const f = (families[a.family] = families[a.family] || { n: 0, c: 0 });
    f.n += 1;
    if (a.correct) f.c += 1;
  }
  return {
    total: answers.length,
    correct: answers.filter((a) => a.correct).length,
    families,
    missed: answers.filter((a) => !a.correct).map((a) => a.wordId),
  };
}

const dayKey = (time) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

// Days in a row with at least one finished quiz, counting back from today
// (or from yesterday, so the streak isn't lost before today's quiz).
export function dayStreak(runs, now = Date.now()) {
  const days = new Set(runs.map((r) => dayKey(r.at)));
  const DAY = 24 * 3600 * 1000;
  let cursor = days.has(dayKey(now)) ? now : now - DAY;
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}

export function overview(bank, stats, runs, now = Date.now()) {
  const questions = runs.reduce((sum, r) => sum + r.total, 0);
  const correct = runs.reduce((sum, r) => sum + r.correct, 0);
  let seen = 0;
  let known = 0;
  for (const entry of bank.words) {
    const state = stateOf(stats[entry.id]);
    if (state !== "new") seen += 1;
    if (state === "known") known += 1;
  }
  return {
    quizzes: runs.length,
    questions,
    accuracy: questions ? correct / questions : null,
    seen,
    known,
    total: bank.words.length,
    streak: dayStreak(runs, now),
  };
}

export function familyProgress(bank, stats, familyId) {
  const counts = { known: 0, learning: 0, shaky: 0, new: 0 };
  let seen = 0;
  let right = 0;
  for (const entry of bank.byFamily[familyId] || []) {
    counts[stateOf(stats[entry.id])] += 1;
    seen += stats[entry.id]?.seen || 0;
    right += stats[entry.id]?.correct || 0;
  }
  const total = (bank.byFamily[familyId] || []).length;
  return { total, counts, accuracy: seen ? right / seen : null };
}

export function partProgress(stats, part) {
  if (!part.length) return 0;
  return part.filter((e) => stateOf(stats[e.id]) === "known").length / part.length;
}

export function hardestWords(bank, stats, limit = 10) {
  return Object.entries(stats)
    .map(([id, s]) => ({ entry: bank.byId[id], stat: s, wrong: s.seen - s.correct }))
    .filter((row) => row.entry && row.wrong > 0 && stateOf(row.stat) !== "known")
    .sort((a, b) => b.wrong - a.wrong || a.stat.correct / a.stat.seen - b.stat.correct / b.stat.seen)
    .slice(0, limit);
}

// Guest progress folded into an account's: attempts add up, the newer answer
// decides the current streak and state, the furthest box wins.
export function mergeStats(base, extra) {
  const out = { ...base };
  for (const [id, b] of Object.entries(extra)) {
    const a = out[id];
    if (!a) {
      out[id] = b;
      continue;
    }
    const newer = (b.lastSeen ?? 0) > (a.lastSeen ?? 0) ? b : a;
    out[id] = {
      seen: a.seen + b.seen,
      correct: a.correct + b.correct,
      streak: newer.streak,
      box: Math.max(a.box, b.box),
      lastCorrect: newer.lastCorrect,
      lastSeen: newer.lastSeen,
      lastWrong: Math.max(a.lastWrong ?? 0, b.lastWrong ?? 0) || null,
      due: newer.due ?? a.due ?? b.due ?? null,
      saved: Boolean(a.saved || b.saved),
    };
  }
  return out;
}

// Supabase rows <-> in-app stats.
export function statFromRow(row) {
  return {
    seen: row.seen,
    correct: row.correct,
    streak: row.streak,
    box: row.box,
    lastCorrect: row.last_correct,
    lastSeen: row.last_seen_at ? Date.parse(row.last_seen_at) : null,
    lastWrong: row.last_wrong_at ? Date.parse(row.last_wrong_at) : null,
    due: row.due_at ? Date.parse(row.due_at) : null,
    saved: Boolean(row.saved),
  };
}

export function rowFromStat(userId, wordId, s) {
  return {
    user_id: userId,
    word_id: Number(wordId),
    seen: s.seen,
    correct: s.correct,
    streak: s.streak,
    box: s.box,
    last_correct: s.lastCorrect ?? null,
    last_seen_at: s.lastSeen ? new Date(s.lastSeen).toISOString() : null,
    last_wrong_at: s.lastWrong ? new Date(s.lastWrong).toISOString() : null,
    due_at: s.due ? new Date(s.due).toISOString() : null,
    saved: Boolean(s.saved),
  };
}
