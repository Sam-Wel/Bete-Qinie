// ቃል: a daily three-letter Ge'ez verb to guess in six tries. The rules are
// kept free of React so they can be checked on their own.
//
// Fidel carries two things in each letter: a consonant and a vowel order
// (ለ ሉ ሊ ላ ሌ ል ሎ are one consonant in seven orders). So feedback has a level
// English Wordle can't: the right consonant in the right place, but in the
// wrong order.

export const WORD_LENGTH = 3;
export const MAX_GUESSES = 6;
export const HINT_AFTER = 2; // the meaning can be revealed after this many guesses

const ETHIOPIC_START = 0x1200;
const ETHIOPIC_END = 0x137f;

export const isFidel = (ch) => {
  const cp = ch?.codePointAt(0);
  return cp >= ETHIOPIC_START && cp <= ETHIOPIC_END && cp < 0x1360; // letters, not punctuation or numerals
};

// A syllable's consonant row and its order within the row (0 = ግዕዝ, 1 = ካዕብ, …).
export function splitFidel(ch) {
  const offset = ch.codePointAt(0) - ETHIOPIC_START;
  return { consonant: Math.floor(offset / 8), order: offset % 8 };
}

export const consonantBase = (consonant) => String.fromCodePoint(ETHIOPIC_START + consonant * 8);

// The seven orders of a consonant, in fidel order. Labialised rows (ቈ, ኈ, ኰ,
// ጐ) have gaps in the Unicode block, which are skipped.
export function ordersOf(consonant) {
  return Array.from({ length: 7 }, (_, order) => String.fromCodePoint(ETHIOPIC_START + consonant * 8 + order)).filter(
    (ch) => /\p{L}/u.test(ch)
  );
}

export const letters = (word) => [...(word || "").trim()];

const plain = (word) => letters(word).length === WORD_LENGTH && letters(word).every(isFidel);

// ---------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------

// Puzzles: three-letter verbs with at least one meaning, in a fixed order.
export function puzzleWords(bank) {
  return bank.words.filter((e) => plain(e.word) && (e.tr.ti.length || e.tr.am.length || e.tr.en.length));
}

// Any three-letter Ge'ez word in the dictionary is an allowed guess.
export function guessSet(bank) {
  return new Set(bank.allWords.filter(plain));
}

// The calendar day as a whole number, the same for everyone on that date.
export function dayNumber(time = Date.now()) {
  const d = new Date(time);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

export const dateKey = (time = Date.now()) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// A stable 32-bit hash (FNV-1a with a final mix).
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

const LAUNCH = Math.floor(Date.UTC(2026, 10, 1) / 86400000); // the first daily ቃል
const NO_REPEAT_DAYS = 300;

function winner(puzzles, day, skip) {
  let best = null;
  let bestScore = Infinity;
  for (const entry of puzzles) {
    if (skip.has(entry.id)) continue;
    const score = hash(`${day}:${entry.id}`);
    if (score < bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best;
}

// Today's word: every puzzle word draws a number from (day, word id) and the
// lowest wins, skipping the words of the last NO_REPEAT_DAYS days (counted from
// launch). Adding or removing words, or a device holding a slightly older copy
// of the dictionary, only changes a day's word if that very word would have
// won, so everyone gets the same puzzle.
export function dailyWord(puzzles, time = Date.now()) {
  const today = dayNumber(time);
  if (!puzzles.length) return null;
  const recent = [];
  const skip = new Set();
  let pick = null;
  for (let day = Math.min(LAUNCH, today); day <= today; day++) {
    pick = winner(puzzles, day, skip.size < puzzles.length ? skip : new Set());
    recent.push(pick.id);
    skip.add(pick.id);
    if (recent.length > NO_REPEAT_DAYS) skip.delete(recent.shift());
  }
  return pick;
}

export const randomWord = (puzzles, random = Math.random) => puzzles[Math.floor(random() * puzzles.length)];

// ---------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------

// Per letter, best first:
//   exact  – this letter, here.
//   order  – this consonant, here, but another vowel order.
//   moved  – this consonant belongs somewhere else in the word.
//   absent – not in the word (or already accounted for).
export const MARKS = ["exact", "order", "moved", "absent"];
const RANK = { exact: 0, order: 1, moved: 2, absent: 3 };

export function scoreGuess(guess, target) {
  const g = letters(guess).map(splitFidel);
  const t = letters(target).map(splitFidel);
  const marks = Array(g.length).fill("absent");
  const used = Array(t.length).fill(false);

  g.forEach((gl, i) => {
    if (gl.consonant === t[i].consonant && gl.order === t[i].order) {
      marks[i] = "exact";
      used[i] = true;
    }
  });
  g.forEach((gl, i) => {
    if (marks[i] === "absent" && gl.consonant === t[i].consonant && !used[i]) {
      marks[i] = "order";
      used[i] = true;
    }
  });
  g.forEach((gl, i) => {
    if (marks[i] !== "absent") return;
    const j = t.findIndex((tl, k) => !used[k] && tl.consonant === gl.consonant);
    if (j >= 0) {
      marks[i] = "moved";
      used[j] = true;
    }
  });
  return marks;
}

// The best thing known about each consonant, for colouring the keyboard.
export function keyboardMarks(guesses, target) {
  const best = {};
  for (const guess of guesses) {
    scoreGuess(guess, target).forEach((mark, i) => {
      const { consonant } = splitFidel(letters(guess)[i]);
      if (best[consonant] == null || RANK[mark] < RANK[best[consonant]]) best[consonant] = mark;
    });
  }
  return best;
}

export function checkGuess(guess, allowed) {
  const ls = letters(guess);
  if (ls.length < WORD_LENGTH) return "Three letters, please.";
  if (!allowed.has(guess.trim())) return "Not in the dictionary.";
  return null;
}

// ---------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------

const EMOJI = { exact: "🟩", order: "🟨", moved: "🟦", absent: "⬜" };

export function shareText({ date, guesses, target, won, hint }) {
  const rows = guesses.map((g) => scoreGuess(g, target).map((m) => EMOJI[m]).join(""));
  return [`ቃል ${date} ${won ? guesses.length : "X"}/${MAX_GUESSES}${hint ? " (with hint)" : ""}`, ...rows].join("\n");
}

// history: [{ date, won, guesses }] for daily puzzles, any order.
export function stats(history, today = dateKey()) {
  const byDate = new Map(history.map((h) => [h.date, h]));
  const dates = [...byDate.keys()].sort();
  const wins = history.filter((h) => h.won).length;
  const distribution = Array(MAX_GUESSES).fill(0);
  history.forEach((h) => h.won && distribution[h.guesses - 1]++);

  // A streak is consecutive days won, ending today or yesterday.
  const prev = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    return dateKey(new Date(y, m - 1, d - 1).getTime());
  };
  let cursor = byDate.get(today)?.won ? today : prev(today);
  let current = 0;
  while (byDate.get(cursor)?.won) {
    current += 1;
    cursor = prev(cursor);
  }
  let best = 0;
  let run = 0;
  let last = null;
  for (const date of dates) {
    run = byDate.get(date).won && last && prev(date) === last ? run + 1 : byDate.get(date).won ? 1 : 0;
    best = Math.max(best, run);
    last = date;
  }

  return { played: history.length, wins, winRate: history.length ? wins / history.length : null, current, best, distribution };
}

// ---------------------------------------------------------------------
// Root mode: guess the three consonants (the root) instead of the full
// spelling. The vowels follow from the verb, so they're shown once it's found.
// ---------------------------------------------------------------------

export const DAILY_VERSION = 2; // daily state saved by the root game

export const rootOf = (word) => letters(word).map((ch) => splitFidel(ch).consonant);
export const rootKey = (root) => root.join(".");
export const sameRoot = (a, b) => rootKey(a) === rootKey(b);

// Every root that a three-letter dictionary word has, with the words that share it.
export function rootIndex(bank) {
  const map = new Map();
  for (const word of bank.allWords.filter(plain)) {
    const key = rootKey(rootOf(word));
    if (!map.has(key)) map.set(key, []);
    if (!map.get(key).includes(word)) map.get(key).push(word);
  }
  return map;
}

// The daily pool: three-letter verbs with Tigrinya, Amharic and English, so
// every hint has something to show and the word is a well-documented one.
export function dailyPuzzles(bank) {
  return puzzleWords(bank).filter((e) => e.tr.ti.length && e.tr.am.length && e.tr.en.length);
}

// Practice prefers verbs the learner has already met in the games or ክለሳ.
export function practiceWord(puzzles, stats = {}, random = Math.random) {
  const seen = puzzles.filter((e) => stats[e.id]?.seen);
  const pool = seen.length >= 10 && random() < 0.7 ? seen : puzzles;
  return pool[Math.floor(random() * pool.length)];
}

// Consonant feedback: exact (here), moved (elsewhere in the root), absent.
export function scoreRoot(guess, target) {
  const marks = Array(guess.length).fill("absent");
  const used = Array(target.length).fill(false);
  guess.forEach((c, i) => {
    if (c === target[i]) {
      marks[i] = "exact";
      used[i] = true;
    }
  });
  guess.forEach((c, i) => {
    if (marks[i] !== "absent") return;
    const j = target.findIndex((t, k) => !used[k] && t === c);
    if (j >= 0) {
      marks[i] = "moved";
      used[j] = true;
    }
  });
  return marks;
}

export function rootKeyboardMarks(guesses, target) {
  const best = {};
  for (const guess of guesses) {
    scoreRoot(guess, target).forEach((mark, i) => {
      const c = guess[i];
      if (best[c] == null || RANK[mark] < RANK[best[c]]) best[c] = mark;
    });
  }
  return best;
}

// Dictionary roots still consistent with every guess so far and with the
// consonants already shown (fixed: { position: consonant }).
export function possibleRoots(roots, guesses, target, fixed = {}) {
  const wanted = guesses.map((g) => scoreRoot(g, target).join());
  return roots.filter(
    (root) =>
      Object.entries(fixed).every(([i, c]) => root[i] === c) &&
      guesses.every((g, n) => scoreRoot(g, root).join() === wanted[n])
  );
}

// The hint ladder. Each rung unlocks after that many guesses; fewer hints, more stars.
export const HINTS = [
  { after: 1, kind: "english", label: "English meaning" },
  { after: 2, kind: "other", label: "Tigrinya or Amharic meaning" },
  { after: 3, kind: "letter", label: "Show a consonant" },
  { after: 4, kind: "list", label: "Show the verbs that fit" },
];

export const stars = (hintsUsed) => (hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1);

// The consonant a "Show a consonant" hint reveals: the first one not yet known.
export function revealPosition(target, guesses, fixed = {}) {
  const known = new Set(Object.keys(fixed).map(Number));
  for (const g of guesses) g.forEach((c, i) => c === target[i] && known.add(i));
  return [0, 1, 2].find((i) => !known.has(i)) ?? null;
}

// Easy mode: each open square offers six consonants, one of them right. The
// others come from roots that share what's already shown, so they're plausible.
export function easyChoices(target, roots, fixed = {}, seed = 0, size = 6) {
  const rand = (n) => {
    seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return seed % n;
  };
  return target.map((c, i) => {
    if (fixed[i] != null) return null;
    const pool = [...new Set(roots.filter((r) => Object.entries(fixed).every(([j, f]) => r[j] === f)).map((r) => r[i]))].filter(
      (x) => x !== c
    );
    const picks = [c];
    while (picks.length < size && pool.length) picks.push(pool.splice(rand(pool.length), 1)[0]);
    return picks.sort((a, b) => a - b);
  });
}

const STAR = ["", "★☆☆", "★★☆", "★★★"];
const ROOT_EMOJI = { exact: "🟩", moved: "🟦", absent: "⬜" };

export function rootShareText({ date, guesses, target, won, hints }) {
  const rows = guesses.map((g) => scoreRoot(g, target).map((m) => ROOT_EMOJI[m]).join(""));
  return [`ቃል ${date} ${won ? guesses.length : "X"}/${MAX_GUESSES} ${won ? STAR[stars(hints)] : ""}`.trim(), ...rows].join("\n");
}
