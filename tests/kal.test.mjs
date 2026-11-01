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
