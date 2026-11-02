// Rules shared by the six verb games (Memory Match, Guess the Action,
// Unscramble, Lightning Round, Sorting Challenge, Boss Battle). Pure functions:
// no React, no storage, so each can be tested on its own. Word choice, wrong
// options and meanings all come from the dictionary through verbQuiz.js; per-word
// progress stays in the shared word-progress record.

import { buildQuestion, hasLanguage, pickWords, shuffle, wordsInScope } from "./verbQuiz";
import { CATEGORIES, metaOf, withMeta } from "./verbMeta";

export const DIFFICULTIES = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

// The meanings that can be asked in a language (never the Ge'ez word itself).
export const meaningsIn = (entry, lang) => entry.ask[lang] ?? [];
export const meaningOf = (entry, lang) => meaningsIn(entry, lang)[0] ?? null;

// Verbs playable in a language, weakest first: words missed last time, then
// ones still being learned, then new ones (the ግሲ ፈተና Smart mix).
export function verbsFor(bank, stats, lang, count, random = Math.random) {
  const pool = wordsInScope(bank, { mode: "all" }, lang);
  return pickWords(pool, stats, "smart", count, random);
}

// A four-option question. Easy draws wrong answers from anywhere; harder levels
// use verbs ending in the same letter, which look alike. Any option sharing a
// meaning with the answer is excluded by buildQuestion, so exactly one is right.
export const questionFor = (entry, lang, direction, bank, difficulty = "medium", random = Math.random) =>
  buildQuestion(entry, lang, direction, bank, random, { near: difficulty !== "easy" });

// ---------------------------------------------------------------------
// Memory Match
// ---------------------------------------------------------------------

export const MEMORY_PAIRS = { easy: 4, medium: 8, hard: 12 };

// Cards: one Ge'ez verb and one meaning per pair. Verbs are chosen so no two
// share a meaning and no meaning card could match a second verb.
export function memoryDeck(entries, lang, pairs, random = Math.random) {
  const chosen = [];
  const used = new Set();
  for (const entry of entries) {
    if (chosen.length >= pairs) break;
    const meanings = meaningsIn(entry, lang);
    if (!meanings.length || meanings.some((m) => used.has(m))) continue;
    meanings.forEach((m) => used.add(m));
    chosen.push({ entry, text: meanings[0] });
  }
  const cards = chosen.flatMap(({ entry, text }) => [
    { pair: entry.id, side: "geez", text: entry.word },
    { pair: entry.id, side: "meaning", text },
  ]);
  return shuffle(cards, random).map((card, i) => ({ ...card, key: i }));
}

// state: { cards, open: [index], matched: Set(pair ids), moves, missed: Set(pair ids) }
export const newMemory = (cards) => ({ cards, open: [], matched: new Set(), moves: 0, missed: new Set() });

// Turn a card. Returns the next state and what happened: "flip" (first card),
// "match", "miss" (two open, wait then call closeMisses), or null (ignored).
export function flipCard(state, index) {
  const card = state.cards[index];
  if (!card || state.open.length >= 2 || state.open.includes(index) || state.matched.has(card.pair)) {
    return { state, event: null };
  }
  const open = [...state.open, index];
  if (open.length === 1) return { state: { ...state, open }, event: "flip" };

  const [a, b] = open.map((i) => state.cards[i]);
  const moves = state.moves + 1;
  if (a.pair === b.pair && a.side !== b.side) {
    const matched = new Set(state.matched).add(a.pair);
    return { state: { ...state, open: [], matched, moves }, event: "match", pair: a.pair };
  }
  const missed = new Set(state.missed).add(a.pair).add(b.pair);
  return { state: { ...state, open, moves, missed }, event: "miss" };
}

export const closeMisses = (state) => ({ ...state, open: [] });
export const memoryDone = (state) => state.matched.size * 2 === state.cards.length;

export function memoryScore({ pairs, moves, seconds }) {
  const accuracy = moves ? pairs / moves : 0;
  return { accuracy, score: pairs * 50 + Math.round(accuracy * 500) + Math.max(0, pairs * 8 - seconds) * 5 };
}

// ---------------------------------------------------------------------
// Guess the Action
// ---------------------------------------------------------------------

// Verbs with a picture, one per action concept.
export function illustratedVerbs(bank, lang) {
  const seen = new Set();
  return withMeta(bank)
    .filter(({ entry, meta }) => meta.picture && hasLanguage(entry, lang))
    .filter(({ meta }) => (seen.has(meta.concept) ? false : seen.add(meta.concept)));
}

// Four options with four different pictured actions; on hard, rivals come
// from the same category when there are enough.
export function actionQuestion(target, illustrated, difficulty = "medium", random = Math.random) {
  const others = illustrated.filter((x) => x.meta.concept !== target.meta.concept);
  const sameCategory = others.filter((x) => x.meta.categories.some((c) => target.meta.categories.includes(c)));
  const pool = difficulty === "hard" && sameCategory.length >= 3 ? sameCategory : others;
  const options = shuffle([target, ...shuffle(pool, random).slice(0, 3)], random);
  return { target, options, answerIndex: options.indexOf(target) };
}

export const ACTION_SECONDS = { easy: null, medium: 15, hard: 8 };

// ---------------------------------------------------------------------
// Unscramble the Verb
// ---------------------------------------------------------------------

// User-perceived characters. Ethiopic syllables are single code points, but
// segmenting by grapheme keeps any combining marks with their letter.
export function graphemes(text) {
  const value = (text || "").trim();
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)].map((s) => s.segment);
  }
  return [...value];
}

// Shuffled letter tiles, guaranteed to differ from the word whenever its
// letters aren't all the same.
export function scramble(word, random = Math.random) {
  const letters = graphemes(word);
  const tiles = letters.map((ch, i) => ({ id: i, ch }));
  if (new Set(letters).size < 2) return tiles;
  for (let tries = 0; tries < 20; tries++) {
    const shuffled = shuffle(tiles, random);
    if (shuffled.map((t) => t.ch).join("") !== letters.join("")) return shuffled;
  }
  return [...tiles.slice(1), tiles[0]]; // rotate as a last resort
}

export const isUnscrambled = (attempt, word) => attempt.join("") === graphemes(word).join("");

export const UNSCRAMBLE_LENGTH = { easy: [3, 3], medium: [4, 4], hard: [5, 12] };

// Verbs of the right length with a meaning in the language. Spelling variants
// ("ጎርየመ/ጎርዔመ") and multi-word entries are left out.
export function unscrambleWords(bank, lang, difficulty) {
  const [min, max] = UNSCRAMBLE_LENGTH[difficulty];
  return bank.words.filter((e) => {
    if (!hasLanguage(e, lang) || /[\s/()-]/.test(e.word)) return false;
    const n = graphemes(e.word).length;
    return n >= min && n <= max;
  });
}

// The hint places the next correct letter: the tile id to use.
export function hintTile(word, placed, tiles) {
  const letters = graphemes(word);
  const need = letters[placed.length];
  const used = new Set(placed.map((p) => p.id));
  return tiles.find((t) => !used.has(t.id) && t.ch === need)?.id ?? null;
}

export const unscramblePoints = ({ letters, hints, streak }) => Math.max(10, letters * 20 - hints * 15) + Math.min(streak, 5) * 10;

// ---------------------------------------------------------------------
// Lightning Round
// ---------------------------------------------------------------------

export const LIGHTNING_MODES = [30, 60, 90];

export const lightningMultiplier = (combo) => (combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1);
export const lightningPoints = (combo) => 10 * lightningMultiplier(combo);

// ---------------------------------------------------------------------
// Sorting Challenge
// ---------------------------------------------------------------------

export const SORT_SHAPE = { easy: { bins: 2, per: 3 }, medium: { bins: 3, per: 3 }, hard: { bins: 4, per: 3 } };

// Bins are categories that have enough verbs; each verb card belongs to at
// least one bin on the table (a verb may fit several).
export function sortingRound(bank, lang, difficulty, random = Math.random) {
  const { bins, per } = SORT_SHAPE[difficulty];
  const tagged = withMeta(bank).filter(({ entry, meta }) => meta.categories.length && hasLanguage(entry, lang));
  const byCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c.key, tagged.filter(({ meta }) => meta.categories.includes(c.key))])
  );
  const usable = CATEGORIES.filter((c) => byCategory[c.key].length >= per);
  const chosen = shuffle(usable, random).slice(0, bins);
  const cards = [];
  const taken = new Set();
  for (const category of chosen) {
    for (const item of shuffle(byCategory[category.key], random)) {
      if (cards.filter((c) => c.home === category.key).length >= per) break;
      if (taken.has(item.entry.id)) continue;
      taken.add(item.entry.id);
      cards.push({ ...item, home: category.key });
    }
  }
  return { bins: chosen.map((c) => c.key), cards: shuffle(cards, random) };
}

export const fitsBin = (card, bin) => metaOf(card.entry)?.categories.includes(bin) ?? false;

// ---------------------------------------------------------------------
// Boss Battle
// ---------------------------------------------------------------------

export const PLAYER_HP = 100;

// Forces of evil from Scripture and the icons, each one beaten by the cross.
export const BOSSES = [
  { key: "serpent", name: "ከይሲ", english: "Serpent of Eden", emoji: "🐍", hp: 100, hit: 14, seconds: 14 },
  { key: "goliath", name: "ጎልያድ", english: "Goliath", emoji: "🛡️", hp: 140, hit: 18, seconds: 12 },
  { key: "lion", name: "አንበሳ", english: "Roaring Lion", emoji: "🦁", hp: 180, hit: 22, seconds: 11 },
  { key: "dragon", name: "ዘንዶ", english: "The Dragon", emoji: "🐉", hp: 240, hit: 26, seconds: 10 },
];

export const newBattle = (level = 0, playerHp = PLAYER_HP) => ({
  level,
  boss: BOSSES[level],
  bossHp: BOSSES[level].hp,
  playerHp,
  combo: 0,
  xp: 0,
});

// One answer: a hit damages the boss (more on a combo), a miss or a timeout
// lets the boss strike. Returns the next state and the damage dealt.
export function attack(battle, correct) {
  if (correct) {
    const combo = battle.combo + 1;
    const damage = 20 + Math.min(combo - 1, 4) * 6 + (combo % 5 === 0 ? 20 : 0); // every 5th in a row is a combo strike
    const bossHp = Math.max(0, battle.bossHp - damage);
    const xp = battle.xp + 10 + battle.level * 3 + (bossHp === 0 ? 50 * (battle.level + 1) : 0);
    return { battle: { ...battle, combo, bossHp, xp }, damage, combo: combo % 5 === 0 };
  }
  const damage = battle.boss.hit;
  return { battle: { ...battle, combo: 0, playerHp: Math.max(0, battle.playerHp - damage) }, damage, combo: false };
}

export const battleState = (battle) =>
  battle.bossHp <= 0 ? (battle.level + 1 < BOSSES.length ? "won" : "champion") : battle.playerHp <= 0 ? "lost" : "fighting";

// The next boss keeps the player's health, topped up a little.
export const nextBoss = (battle) => ({ ...newBattle(battle.level + 1, Math.min(PLAYER_HP, battle.playerHp + 30)), xp: battle.xp });
