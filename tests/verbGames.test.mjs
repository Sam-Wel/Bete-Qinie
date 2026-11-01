import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOSSES,
  MEMORY_PAIRS,
  PLAYER_HP,
  actionQuestion,
  attack,
  battleState,
  closeMisses,
  fitsBin,
  flipCard,
  graphemes,
  hintTile,
  illustratedVerbs,
  isUnscrambled,
  lightningMultiplier,
  lightningPoints,
  meaningOf,
  memoryDeck,
  memoryDone,
  memoryScore,
  newBattle,
  newMemory,
  nextBoss,
  questionFor,
  scramble,
  sortingRound,
  unscrambleWords,
  verbsFor,
} from "../src/lib/verbGames.js";
import { applyAnswer, stateOf } from "../src/lib/verbQuiz.js";
import { bank, seeded } from "./helpers.mjs";

const LANGS = ["ti", "am", "en"];

test("language switching: meanings, questions and decks follow the chosen language", () => {
  const entry = bank.words.find((e) => e.ask.ti.length && e.ask.am.length && e.ask.en.length);
  for (const lang of LANGS) {
    assert.ok(entry.ask[lang].includes(meaningOf(entry, lang)));
    const q = questionFor(entry, lang, "toMeaning", bank, "medium", seeded(3));
    assert.ok(entry.ask[lang].includes(q.options[q.answerIndex]), `${lang} answer is a ${lang} meaning`);
    const deck = memoryDeck(verbsFor(bank, {}, lang, 20, seeded(4)), lang, 4, seeded(5));
    deck.filter((c) => c.side === "meaning").forEach((c) => {
      const owner = bank.byId[c.pair];
      assert.ok(owner.ask[lang].includes(c.text));
    });
  }
  assert.notEqual(meaningOf(entry, "en"), meaningOf(entry, "am"));
});

test("questions: exactly one right option, no synonyms among the wrong ones", () => {
  for (const lang of LANGS) {
    for (const difficulty of ["easy", "hard"]) {
      for (const entry of verbsFor(bank, {}, lang, 120, seeded(7))) {
        const q = questionFor(entry, lang, "toMeaning", bank, difficulty, seeded(entry.id));
        assert.equal(new Set(q.options).size, q.options.length);
        assert.equal(q.options.filter((o) => entry.tr[lang].includes(o)).length, 1, `${entry.word} ${lang}`);
      }
    }
  }
});

test("hard questions draw look-alike wrong answers from the same ending letter", () => {
  let near = 0;
  let total = 0;
  for (const entry of verbsFor(bank, {}, "am", 80, seeded(9))) {
    const q = questionFor(entry, "am", "toGeez", bank, "hard", seeded(entry.id));
    total += q.options.length;
    near += q.options.filter((o) => bank.words.find((e) => e.word === o)?.family === entry.family).length;
  }
  assert.ok(near / total > 0.8);
});

test("memory match: pairs, matching, misses and completion", () => {
  const entries = verbsFor(bank, {}, "am", 60, seeded(11));
  for (const [level, pairs] of Object.entries(MEMORY_PAIRS)) {
    const deck = memoryDeck(entries, "am", pairs, seeded(12));
    assert.equal(deck.length, pairs * 2, level);
    const meanings = deck.filter((c) => c.side === "meaning").map((c) => c.text);
    assert.equal(new Set(meanings).size, meanings.length, "no two meaning cards alike");
  }
  const deck = memoryDeck(entries, "am", 4, seeded(13));
  let s = newMemory(deck);
  const [g0] = deck.filter((c) => c.side === "geez");
  const wrong = deck.findIndex((c) => c.side === "meaning" && c.pair !== g0.pair);
  let r = flipCard(s, deck.indexOf(g0));
  assert.equal(r.event, "flip");
  r = flipCard(r.state, wrong);
  assert.equal(r.event, "miss");
  assert.equal(flipCard(r.state, 0).event, null, "a third card waits until the miss closes");
  s = closeMisses(r.state);
  assert.ok(s.missed.has(g0.pair));
  for (const pair of new Set(deck.map((c) => c.pair))) {
    const [a, b] = deck.map((c, i) => (c.pair === pair ? i : -1)).filter((i) => i >= 0);
    s = flipCard(s, a).state;
    const m = flipCard(s, b);
    assert.equal(m.event, "match");
    s = m.state;
  }
  assert.ok(memoryDone(s));
  assert.equal(s.moves, 5);
  const perfect = memoryScore({ pairs: 4, moves: 4, seconds: 10 });
  const sloppy = memoryScore({ pairs: 4, moves: 9, seconds: 10 });
  assert.equal(perfect.accuracy, 1);
  assert.ok(perfect.score > sloppy.score);
});

test("memory match uses fewer pairs when there aren't enough verbs", () => {
  const few = verbsFor(bank, {}, "ti", 3, seeded(14));
  assert.equal(memoryDeck(few, "ti", 12, seeded(15)).length, few.length * 2);
});

test("unscramble: Ethiopic is split by grapheme and really rearranged", () => {
  assert.deepEqual(graphemes("ተምዐ"), ["ተ", "ም", "ዐ"]);
  assert.deepEqual(graphemes("éተ"), ["é", "ተ"], "a combining mark stays with its letter");
  for (const difficulty of ["easy", "medium", "hard"]) {
    const words = unscrambleWords(bank, "am", difficulty);
    assert.ok(words.length > 5, `${difficulty} has words`);
    for (const entry of words.slice(0, 80)) {
      const tiles = scramble(entry.word, seeded(entry.id));
      const letters = graphemes(entry.word);
      assert.deepEqual([...tiles.map((t) => t.ch)].sort(), [...letters].sort(), "same letters");
      if (new Set(letters).size > 1) assert.notEqual(tiles.map((t) => t.ch).join(""), entry.word, `${entry.word} shuffled`);
      assert.ok(isUnscrambled(letters, entry.word));
      assert.ok(!/[\s/]/.test(entry.word));
    }
  }
  assert.deepEqual(scramble("ለለለ").map((t) => t.ch), ["ለ", "ለ", "ለ"], "all-same letters stay");
});

test("unscramble hints place the next correct letter", () => {
  const word = "ሐረሰ";
  const tiles = scramble(word, seeded(2));
  const first = hintTile(word, [], tiles);
  assert.equal(tiles.find((t) => t.id === first).ch, "ሐ");
  const placed = [tiles.find((t) => t.id === first)];
  assert.equal(tiles.find((t) => t.id === hintTile(word, placed, tiles)).ch, "ረ");
});

test("lightning: the multiplier climbs with the streak", () => {
  assert.deepEqual([0, 1, 3, 6, 10, 20].map(lightningMultiplier), [1, 1, 2, 3, 4, 4]);
  assert.equal(lightningPoints(7), 30);
});

test("guess the action: four different pictured actions, one right", () => {
  const illustrated = illustratedVerbs(bank, "en");
  assert.ok(illustrated.length >= 8);
  assert.equal(new Set(illustrated.map((x) => x.meta.concept)).size, illustrated.length);
  for (const target of illustrated) {
    for (const difficulty of ["easy", "hard"]) {
      const q = actionQuestion(target, illustrated, difficulty, seeded(target.entry.id));
      assert.equal(q.options.length, 4);
      assert.equal(new Set(q.options.map((o) => o.meta.picture)).size, 4);
      assert.equal(q.options[q.answerIndex], target);
    }
  }
});

test("sorting: bins come from the data and every card fits a bin on the table", () => {
  for (const difficulty of ["easy", "medium", "hard"]) {
    for (const lang of LANGS) {
      const round = sortingRound(bank, lang, difficulty, seeded(21));
      assert.ok(round.bins.length >= 2, `${difficulty} ${lang}`);
      for (const card of round.cards) {
        assert.ok(fitsBin(card, card.home));
        assert.ok(round.bins.includes(card.home));
      }
    }
  }
  const both = { entry: bank.words.find((e) => e.word === "ሰብሐ") };
  assert.ok(fitsBin(both, "religious"));
  assert.ok(!fitsBin(both, "movement"));
});

test("boss battle: damage, combos, defeat and the next boss", () => {
  let b = newBattle(0);
  assert.equal(b.bossHp, BOSSES[0].hp);
  let r = attack(b, true);
  assert.equal(r.damage, 20);
  b = r.battle;
  for (let i = 0; i < 3; i++) b = attack(b, true).battle;
  r = attack(b, true);
  assert.ok(r.combo, "every fifth hit in a row is a combo strike");
  assert.ok(r.damage > 40);
  b = attack(r.battle, false).battle;
  assert.equal(b.combo, 0);
  assert.equal(b.playerHp, PLAYER_HP - BOSSES[0].hit);
  while (battleState(b) === "fighting") b = attack(b, true).battle;
  assert.equal(battleState(b), "won");
  assert.ok(b.xp >= 50);
  const next = nextBoss(b);
  assert.equal(next.level, 1);
  assert.equal(next.xp, b.xp);
  assert.ok(next.playerHp <= PLAYER_HP);
  let lost = newBattle(3, 10);
  lost = attack(lost, false).battle;
  assert.equal(battleState(lost), "lost");
});

test("progress: missed verbs come back first in the next round", () => {
  const pool = verbsFor(bank, {}, "am", 40, seeded(31));
  const stats = {};
  pool.slice(0, 5).forEach((e) => (stats[e.id] = applyAnswer(null, false)));
  pool.slice(5, 30).forEach((e) => (stats[e.id] = applyAnswer(applyAnswer(applyAnswer(null, true), true), true)));
  const next = verbsFor(bank, stats, "am", 8, seeded(32));
  const missed = next.filter((e) => stateOf(stats[e.id]) === "shaky");
  assert.equal(missed.length, 5, "all five missed verbs are asked again");
  assert.ok(next.every((e) => stateOf(stats[e.id]) !== "known"), "known verbs wait while others are due");
});
