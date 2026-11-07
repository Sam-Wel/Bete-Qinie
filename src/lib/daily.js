// ዛሬ: the daily study plan. A set number of new words a day (20 by default)
// is the only way words enter study; games can focus on them, on them plus
// what's due in ክለሳ, or play freely (practice only). Pure functions, like
// verbQuiz.js, so they can be tested on their own.

import {
  FAMILIES,
  MASTERED_BOX,
  hasLanguage,
  inTodaySet,
  isDue,
  isLearning,
  pickWords,
  reviewSummary,
  startOfDay,
  wordsInScope,
} from "./verbQuiz";

export const DAILY_SIZES = [5, 10, 20];
export const DEFAULT_DAILY = 20;
// New words wait while this many reviews are due: catch up first.
export const BACKLOG_PAUSE = 60;

export const FOCUSES = [
  { key: "today", label: "Today's words", hint: "Only the words you're learning today." },
  { key: "studying", label: "Today's + ክለሳ", hint: "Today's words and the ones due for review." },
  { key: "free", label: "Free play", hint: "Any word. Practice only: new words aren't added to ክለሳ." },
];

const DAY = 24 * 3600 * 1000;

// Never studied, so it can be put into a daily set.
export const isFresh = (stat) => !stat || (!stat.study?.intro && !(stat.box >= 1) && !stat.saved);

// Every verb in teaching order: family by family, source order inside each.
// A chosen `family` (an id) goes first and the order carries on from there
// (ለ, then መ, ሰ, … and back round to ሀ); "auto" starts at ሀ.
export function teachingOrder(bank, lang, family = "auto") {
  const ids = FAMILIES.map((f) => f.id);
  const start = family !== "auto" ? Math.max(0, ids.indexOf(family)) : 0;
  const order = [...ids.slice(start), ...ids.slice(0, start)];
  return order.flatMap((id) => (bank.byFamily[id] || []).filter((entry) => hasLanguage(entry, lang)));
}

// Put in today's set today and not touched yet: can still be swapped out
// when the daily size or the family changes.
export const isUntouched = (stat, now = Date.now()) =>
  isLearning(stat) && stat.study.intro === startOfDay(now) && !stat.seen;

// Where today stands, and how to bring today's set in line with the settings.
// settings: { size, family, override } — override is the day the learner
// chose to add new words despite a backlog. Words already started (answered,
// learned, skipped, carried over) always stay; untouched ones are the first
// `size - started` words in teaching order, so changing the size or the family
// takes effect at once: `add` joins the set, `remove` goes back to new.
export function planToday(bank, stats, lang, settings = {}, now = Date.now()) {
  const today = startOfDay(now);
  const size = settings.size || DEFAULT_DAILY;
  const ids = Object.keys(stats).filter((id) => inTodaySet(stats[id], now)).map(Number);
  const untouched = ids.filter((id) => isUntouched(stats[id], now));
  const counted = ids.filter((id) => !untouched.includes(id) && stats[id].study?.skipped !== today).length;
  const due = reviewSummary(stats, now).due;
  const paused = due > BACKLOG_PAUSE && settings.override !== today;
  if (paused) return { ids, add: [], remove: [], paused, due, size };

  const want = Math.max(0, size - counted);
  const target = want
    ? teachingOrder(bank, lang, settings.family)
        .filter((e) => isFresh(stats[e.id]) || untouched.includes(e.id))
        .slice(0, want)
        .map((e) => e.id)
    : [];
  const inSet = new Set(ids);
  const keep = new Set(target);
  return {
    ids,
    add: target.filter((id) => !inSet.has(id)),
    remove: untouched.filter((id) => !keep.has(id)),
    paused,
    due,
    size,
  };
}

// How far today's set has come: learned (graduated or skipped) out of all.
export function todayProgress(stats, now = Date.now()) {
  const today = startOfDay(now);
  let total = 0;
  let learned = 0;
  let skipped = 0;
  for (const s of Object.values(stats)) {
    if (!inTodaySet(s, now)) continue;
    total += 1;
    if (s.study.skipped === today) skipped += 1;
    else if (!isLearning(s)) learned += 1;
  }
  return { total, learned, skipped, left: total - learned - skipped };
}

// The next words a daily set would bring, for a look ahead at tomorrow.
export function upcoming(bank, stats, lang, settings = {}, count = 5) {
  return teachingOrder(bank, lang, settings.family)
    .filter((e) => isFresh(stats[e.id]))
    .slice(0, count);
}

// Words that only flashed past in games before daily sets existed: seen once
// or twice, never past box 1, not saved. The one-time clean-up of ክለሳ sends
// them back to new. Words without a `study` record predate the daily plan.
export function legacyPile(stats) {
  return Object.entries(stats)
    .filter(([, s]) => s && !s.study && !s.saved && s.seen > 0 && s.seen <= 2 && s.box <= 1)
    .map(([id]) => Number(id));
}

// Days in a row on which at least one word was learned, from today or yesterday.
export function studyStreak(stats, now = Date.now()) {
  const days = new Set(Object.values(stats).map((s) => s?.study?.learned).filter(Boolean));
  let cursor = days.has(startOfDay(now)) ? startOfDay(now) : startOfDay(now - DAY);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = startOfDay(cursor - DAY / 2); // the midnight before, safe across clock changes
  }
  return streak;
}

export const MILESTONES = [25, 100, 250, 500, 1000, 2000];

export function masteredCount(stats) {
  return Object.values(stats).filter((s) => s && !isLearning(s) && s.box >= MASTERED_BOX).length;
}

export function nextMilestone(mastered) {
  return MILESTONES.find((m) => m > mastered) ?? null;
}

// Is a word in a game's focus?
export function inFocus(stat, focus, now = Date.now()) {
  if (focus === "today") return inTodaySet(stat, now);
  if (focus === "studying") return inTodaySet(stat, now) || isDue(stat, now);
  return true;
}

// Words for a game: from its pool (all verbs in `lang` unless given), kept to
// the focus, weakest first. When the focus has fewer than `min` words the rest
// are filled from the whole pool (as practice), so every game can still be played.
export function focusWords(bank, stats, lang, focus, count, { pool, min = 1, random = Math.random, now = Date.now() } = {}) {
  const base = pool ?? wordsInScope(bank, { mode: "all" }, lang);
  if (focus === "free") return pickWords(base, stats, "smart", count, random, now);
  const focused = base.filter((e) => inFocus(stats[e.id], focus, now));
  const picked = pickWords(focused, stats, "smart", count, random, now);
  if (picked.length >= Math.min(min, base.length)) return picked;
  const rest = base.filter((e) => !focused.includes(e));
  return [...picked, ...pickWords(rest, stats, "smart", min - picked.length, random, now)];
}

// The next question in ዛሬ's learn session for a word being learned: first
// ግዕዝ → meaning, then meaning → ግዕዝ, then either; wrong options from
// anywhere at first (easy), from look-alike verbs once it's answered right twice.
export function learnStep(stat, random = Math.random) {
  const kinds = stat?.study?.kinds || [];
  const right = stat?.study?.right || 0;
  let dir;
  if (!kinds.includes("learn:toMeaning")) dir = "toMeaning";
  else if (!kinds.includes("learn:toGeez")) dir = "toGeez";
  else dir = random() < 0.5 ? "toMeaning" : "toGeez";
  return { dir, near: right >= 2 };
}

// Where a word goes back into the session's queue after an answer: a few
// cards later, so it isn't asked twice in a row.
export function requeue(queue, id, gap = 3) {
  const rest = queue.filter((x) => x !== id);
  const at = Math.min(gap, rest.length);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}
