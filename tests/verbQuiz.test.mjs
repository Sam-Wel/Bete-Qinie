import { test } from "node:test";
import assert from "node:assert/strict";
import * as Q from "../src/lib/verbQuiz.js";
import { bank, seeded } from "./helpers.mjs";

const DAY = 864e5;

test("families: every verb has one, merged letters included", () => {
  assert.equal(Q.familyOf("መልኃ"), "ሀ");
  assert.equal(Q.familyOf("መርዓ"), "አ");
  assert.equal(Q.familyOf("ጾመ"), "መ");
  assert.equal(Q.familyOf("ቤት"), null);
  assert.ok(bank.words.every((e) => e.family));
});

test("a meaning spelled like the Ge'ez word is shown but never asked", () => {
  for (const e of bank.words) for (const lang of ["ti", "am", "en"]) assert.ok(!e.ask[lang].includes(e.word));
});

test("quiz questions never print their answer in the prompt", () => {
  for (const e of Q.wordsInScope(bank, { mode: "all" }, "ti").slice(0, 150)) {
    const q = Q.buildQuestion(e, "ti", "toGeez", bank, seeded(e.id));
    assert.ok(!q.prompt.split(" · ").includes(q.options[q.answerIndex]));
    assert.equal(q.options.filter((o) => o === e.word).length, 1);
  }
});

test("word states move new → learning → known, and a miss is shaky", () => {
  let s = Q.applyAnswer(null, true);
  assert.equal(Q.stateOf(s), "learning");
  s = Q.applyAnswer(Q.applyAnswer(s, true), true);
  assert.equal(Q.stateOf(s), "known");
  s = Q.applyAnswer(s, false);
  assert.equal(Q.stateOf(s), "shaky");
  assert.equal(s.box, 1);
});

test("review schedule: 1, 3, 7, 21, 60 days; a miss is tomorrow; clock changes don't shift it", () => {
  const now = new Date(2026, 10, 2, 21, 30).getTime();
  const today = Q.startOfDay(now);
  let s = null;
  const days = [];
  for (let i = 0; i < 5; i++) {
    s = Q.applyAnswer(s, true, now);
    days.push(Math.round((s.due - today) / DAY));
  }
  assert.deepEqual(days, [1, 3, 7, 21, 60]);
  const fallBack = new Date(2026, 10, 1, 2, 3).getTime();
  const due = new Date(Q.applyAnswer(null, true, fallBack).due);
  assert.equal(due.getDate(), 2);
  assert.equal(due.getHours(), 0);
});

test("ክለሳ queue: missed first, then most overdue, at most 20", () => {
  const now = Date.now();
  const stats = {};
  for (let i = 1; i <= 30; i++) stats[i] = Q.applyAnswer(null, true, now - (40 - i) * DAY);
  stats[99] = Q.applyAnswer(null, false, now - 5 * DAY);
  stats[100] = Q.markSaved(null, now);
  const queue = Q.dueQueue(stats, now);
  assert.equal(queue.length, 20);
  assert.equal(queue[0], 99);
  assert.ok(Q.dueQueue(stats, now, 100).includes(100));
});

test("guest progress merges into an account without losing a save", () => {
  const known = Q.applyAnswer(Q.applyAnswer(Q.applyAnswer(null, true, 1), true, 2), true, 3);
  const merged = Q.mergeStats({ 1: Q.markSaved(known) }, { 1: Q.applyAnswer(null, false, 10) });
  assert.equal(merged[1].saved, true);
  assert.equal(merged[1].lastCorrect, false);
  const row = Q.rowFromStat("u", "1", merged[1]);
  assert.deepEqual(Q.statFromRow(row).saved, true);
});
