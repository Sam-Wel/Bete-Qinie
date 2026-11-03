import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../src/lib/kal.js";
import { bank } from "./helpers.mjs";

test("fidel splits into consonant and vowel order", () => {
  assert.equal(K.splitFidel("ሉ").consonant, K.splitFidel("ለ").consonant);
  assert.equal(K.splitFidel("ሉ").order, 1);
  assert.deepEqual(K.ordersOf(K.splitFidel("ለ").consonant), ["ለ", "ሉ", "ሊ", "ላ", "ሌ", "ል", "ሎ"]);
  assert.ok(K.ordersOf(K.splitFidel("ቈ").consonant).every((ch) => /\p{L}/u.test(ch)), "no blank keys");
});

test("guess colours, including repeated letters", () => {
  assert.deepEqual(K.scoreGuess("ሰብሐ", "ሰብሐ"), ["exact", "exact", "exact"]);
  assert.deepEqual(K.scoreGuess("ሱብሐ", "ሰብሐ"), ["order", "exact", "exact"]);
  assert.deepEqual(K.scoreGuess("ብሰሐ", "ሰብሐ"), ["moved", "moved", "exact"]);
  assert.deepEqual(K.scoreGuess("ለሉለ", "ለመሰ"), ["exact", "absent", "absent"]);
});

test("the daily word is the same all day, changes daily and doesn't repeat", () => {
  const puzzles = K.puzzleWords(bank);
  const a = K.dailyWord(puzzles, new Date(2026, 10, 3, 1).getTime());
  const b = K.dailyWord(puzzles, new Date(2026, 10, 3, 23).getTime());
  const c = K.dailyWord(puzzles, new Date(2026, 10, 4, 9).getTime());
  assert.equal(a.id, b.id);
  assert.notEqual(a.id, c.id);
  const days = Array.from({ length: Math.min(60, puzzles.length) }, (_, i) => K.dailyWord(puzzles, new Date(2026, 10, 1 + i).getTime()).id);
  assert.equal(new Set(days).size, days.length);
});

test("streaks count consecutive wins ending today or yesterday", () => {
  const h = [
    { date: "2026-10-29", won: true, guesses: 3 },
    { date: "2026-10-30", won: false, guesses: 6 },
    { date: "2026-10-31", won: true, guesses: 2 },
    { date: "2026-11-01", won: true, guesses: 4 },
  ];
  assert.equal(K.stats(h, "2026-11-01").current, 2);
  assert.equal(K.stats(h, "2026-11-02").current, 2);
  assert.equal(K.stats(h, "2026-11-03").current, 0);
});

test("root mode: consonants only, vowels ignored", () => {
  const r = (w) => K.rootOf(w);
  assert.ok(K.sameRoot(r("ሰብሐ"), r("ሰበሐ")), "ሰብሐ and ሰበሐ share a root");
  assert.deepEqual(K.scoreRoot(r("ሰብሐ"), r("ሰብሐ")), ["exact", "exact", "exact"]);
  assert.deepEqual(K.scoreRoot(r("ብሰሐ"), r("ሰብሐ")), ["moved", "moved", "exact"]);
  assert.deepEqual(K.scoreRoot(r("ለለለ"), r("ለመሰ")), ["exact", "absent", "absent"]);
});

test("root mode: the remaining roots always include the answer and shrink", () => {
  const roots = [...K.rootIndex(bank).keys()].map((k) => k.split(".").map(Number));
  const puzzles = K.dailyPuzzles(bank);
  assert.ok(puzzles.length > 50, "enough daily words");
  for (const entry of puzzles.slice(0, 40)) {
    const target = K.rootOf(entry.word);
    const fixed = { 2: target[2] };
    const all = K.possibleRoots(roots, [], target, fixed);
    const guess = roots.find((g) => !K.sameRoot(g, target) && g[2] === target[2]) || roots[0];
    const after = K.possibleRoots(roots, [guess], target, fixed);
    assert.ok(after.some((x) => K.sameRoot(x, target)));
    assert.ok(after.length <= all.length);
  }
});

test("easy mode offers six consonants per open square, including the right one", () => {
  const roots = [...K.rootIndex(bank).keys()].map((k) => k.split(".").map(Number));
  const target = K.rootOf(K.dailyPuzzles(bank)[0].word);
  const choices = K.easyChoices(target, roots, { 2: target[2] }, 7);
  assert.equal(choices[2], null);
  for (const i of [0, 1]) {
    assert.ok(choices[i].includes(target[i]));
    assert.ok(choices[i].length <= 6 && choices[i].length >= 2);
  }
  assert.deepEqual(K.easyChoices(target, roots, { 2: target[2] }, 7), choices, "same puzzle, same choices");
});

test("hints: stars drop as hints are used; the revealed consonant is one not yet known", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(K.stars), [3, 2, 2, 1, 1]);
  const t = K.rootOf("ሰብሐ");
  assert.equal(K.revealPosition(t, [], { 2: t[2] }), 0);
  assert.equal(K.revealPosition(t, [K.rootOf("ሰለሐ")], { 2: t[2] }), 1);
});
