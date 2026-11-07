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

// A word in review: studied, now in `box`, due `dueIn` days from `now`.
const reviewing = (box, now, dueIn = 0, extra = {}) => ({
  ...Q.EMPTY_STAT,
  seen: 3,
  correct: 3,
  box,
  lastCorrect: true,
  lastSeen: now - DAY,
  due: Q.addDays(now, dueIn),
  study: { intro: Q.startOfDay(now - 30 * DAY), learned: Q.startOfDay(now - 30 * DAY) },
  ...extra,
});

test("an answer on a word not being studied is practice: nothing is saved", () => {
  assert.equal(Q.applyAnswer(null, true), null);
  assert.equal(Q.applyAnswer(undefined, false), undefined);
  const s = Q.resetStat();
  assert.equal(Q.applyAnswer(s, true), s);
  assert.equal(Q.stateOf(null), "new");
});

test("learning: 3 right in 2 kinds of question, then due tomorrow in box 1", () => {
  const now = new Date(2026, 10, 6, 10).getTime();
  let s = Q.introduce(null, now);
  assert.equal(Q.stateOf(s), "learning");
  assert.ok(Q.inTodaySet(s, now));
  assert.ok(!Q.inReview(s), "learning words aren't in ክለሳ");
  s = Q.applyAnswer(s, true, now, { kind: "learn:toMeaning" });
  s = Q.applyAnswer(s, true, now, { kind: "learn:toMeaning" });
  s = Q.applyAnswer(s, true, now, { kind: "learn:toMeaning" });
  assert.ok(Q.isLearning(s), "one kind of question isn't enough");
  s = Q.applyAnswer(s, false, now, { kind: "verb_memory" });
  assert.equal(s.study.right, 2, "a miss takes one right answer back");
  s = Q.applyAnswer(s, true, now, { kind: "learn:toGeez" });
  assert.ok(!Q.isLearning(s));
  assert.equal(s.box, 1);
  assert.equal(s.due, Q.addDays(now, 1));
  assert.equal(s.study.learned, Q.startOfDay(now));
  assert.ok(Q.inTodaySet(s, now), "still counted in today's set once learned");
  assert.ok(!Q.inTodaySet(s, now + DAY));
});

test("review: up one box when due, at most once a day; early answers don't move it", () => {
  const now = new Date(2026, 10, 6, 10).getTime();
  let s = Q.applyAnswer(reviewing(2, now, 0), true, now);
  assert.equal(s.box, 3);
  assert.equal(s.due, Q.addDays(now, 7));
  const again = Q.applyAnswer(s, true, now + 3600e3);
  assert.equal(again.box, 3, "same day: no second step");
  assert.equal(again.seen, s.seen + 1);
  const early = Q.applyAnswer(reviewing(2, now, 2), true, now);
  assert.equal(early.box, 2, "not due yet");
});

test("review schedule: 1, 3, 7, 21, 60, 120 days; clock changes don't shift it", () => {
  const now = new Date(2026, 10, 2, 21, 30).getTime();
  const days = [];
  for (let box = 0; box < 6; box++) {
    const s = Q.applyAnswer(reviewing(box, now, 0, box === 0 ? { saved: true, study: null } : {}), true, now);
    days.push(Math.round((s.due - Q.startOfDay(now)) / DAY));
  }
  assert.deepEqual(days, [1, 3, 7, 21, 60, 120]);
  const fallBack = new Date(2026, 10, 1, 2, 3).getTime();
  const due = new Date(Q.applyAnswer(reviewing(1, fallBack, 0), true, fallBack).due);
  assert.equal(due.getDate(), 4);
  assert.equal(due.getHours(), 0);
});

test("a miss moves a word down one box, once a day; timed games don't demote mastered words", () => {
  const now = new Date(2026, 10, 6, 10).getTime();
  let s = Q.applyAnswer(reviewing(4, now, 5), false, now, { kind: "verb_memory" });
  assert.equal(s.box, 3);
  assert.equal(s.due, Q.addDays(now, 1));
  assert.equal(Q.stateOf(s), "shaky");
  s = Q.applyAnswer(s, false, now, { kind: "review" });
  assert.equal(s.box, 3, "only one step down a day");
  const mastered = reviewing(5, now, 40);
  const flagged = Q.applyAnswer(mastered, false, now, { kind: "verb_lightning_60" });
  assert.equal(flagged.box, 5);
  assert.equal(flagged.due, Q.addDays(now, 7));
  assert.equal(Q.stateOf(flagged), "mastered");
  assert.equal(Q.applyAnswer(mastered, false, now, { kind: "review" }).box, 4);
  assert.equal(Q.applyAnswer(reviewing(1, now, 0), false, now).box, 1, "never below box 1");
});

test("I already know this: straight to the 21-day review", () => {
  const now = new Date(2026, 10, 6, 10).getTime();
  const s = Q.skipKnown(Q.introduce(null, now), now);
  assert.equal(s.box, Q.SKIP_BOX);
  assert.equal(s.due, Q.addDays(now, 21));
  assert.equal(s.study.skipped, Q.startOfDay(now));
  assert.ok(!Q.isLearning(s));
});

test("old records (before daily sets) keep working", () => {
  const now = Date.now();
  const old = { seen: 1, correct: 1, streak: 1, box: 1, lastCorrect: true, lastSeen: now - 2 * DAY, lastWrong: null, due: now - DAY, saved: false };
  assert.ok(Q.isDue(old, now));
  assert.equal(Q.stateOf(old), "learning");
  assert.equal(Q.applyAnswer(old, true, now).box, 2);
});

test("ክለሳ queue: missed first, then most overdue, at most 20", () => {
  const now = Date.now();
  const stats = {};
  for (let i = 1; i <= 30; i++) stats[i] = reviewing(2, now, -(40 - i));
  stats[99] = reviewing(1, now, -1, { lastCorrect: false });
  stats[100] = Q.markSaved(null, now);
  const queue = Q.dueQueue(stats, now);
  assert.equal(queue.length, 20);
  assert.equal(queue[0], 99);
  assert.ok(Q.dueQueue(stats, now, 100).includes(100));
});

test("guest progress merges into an account without losing a save or study record", () => {
  const now = Date.now();
  const merged = Q.mergeStats({ 1: Q.markSaved(reviewing(3, now, 2)) }, { 1: { ...reviewing(2, now, 1), lastCorrect: false, lastSeen: now } });
  assert.equal(merged[1].saved, true);
  assert.equal(merged[1].lastCorrect, false);
  assert.ok(merged[1].study.intro);
  const row = Q.rowFromStat("u", "1", merged[1]);
  assert.deepEqual(Q.statFromRow(row).saved, true);
  assert.deepEqual(Q.statFromRow(row).study, merged[1].study);
  assert.ok(!("study" in Q.rowFromStat("u", "1", merged[1], { withStudy: false })));
});

test("smart mix: due words first, then new; words not due yet wait", () => {
  const now = new Date(2026, 10, 1, 12).getTime();
  const pool = Q.wordsInScope(bank, { mode: "all" }, "ti").slice(0, 60);
  const stats = {};
  // 20 words not due for a few days, 3 due since yesterday, 2 just missed (due tomorrow, but shaky).
  pool.slice(0, 20).forEach((e) => (stats[e.id] = reviewing(2, now, 3)));
  pool.slice(20, 23).forEach((e) => (stats[e.id] = reviewing(1, now, -1)));
  pool.slice(23, 25).forEach((e) => (stats[e.id] = reviewing(1, now, 1, { lastCorrect: false })));
  const picked = Q.pickWords(pool, stats, "smart", 10, seeded(3), now);
  const ids = new Set(picked.map((e) => e.id));
  assert.equal(picked.length, 10);
  for (const e of pool.slice(20, 25)) assert.ok(ids.has(e.id), "due and missed words are in");
  for (const e of pool.slice(0, 20)) assert.ok(!ids.has(e.id), "not-due words wait");
  assert.equal(picked.filter((e) => !stats[e.id]).length, 5);
  // With no new words left, not-due words fill in, soonest due first.
  const tiny = pool.slice(0, 22);
  assert.equal(Q.pickWords(tiny, stats, "smart", 22, seeded(4), now).length, 22);
});

test("meaning → ግዕዝ options always share the answer's ending", () => {
  for (const e of Q.wordsInScope(bank, { mode: "all" }, "am").slice(0, 200)) {
    const q = Q.buildQuestion(e, "am", "toGeez", bank, seeded(e.id), { near: false });
    const ends = q.options.map((o) => Q.familyOf(o));
    const same = ends.filter((f) => f === e.family).length;
    if (bank.byFamily[e.family].length >= 10) assert.equal(same, q.options.length, e.word);
  }
});
