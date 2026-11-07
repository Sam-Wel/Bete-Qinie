import { test } from "node:test";
import assert from "node:assert/strict";
import * as Q from "../src/lib/verbQuiz.js";
import * as D from "../src/lib/daily.js";
import { bank, seeded } from "./helpers.mjs";

const DAY = 864e5;
const NOW = new Date(2026, 10, 6, 10).getTime();

// Put a plan's new words into the set, as useToday does.
const fill = (stats, plan, now = NOW) => {
  const next = { ...stats };
  for (const id of plan.remove || []) next[id] = Q.resetStat();
  for (const id of plan.add) next[id] = Q.introduce(next[id], now);
  return next;
};

test("a day's set: 20 new words in teaching order, and no more that day", () => {
  const plan = D.planToday(bank, {}, "am", { size: 20 }, NOW);
  assert.equal(plan.add.length, 20);
  const order = D.teachingOrder(bank, "am").slice(0, 20).map((e) => e.id);
  assert.deepEqual(plan.add, order);
  const stats = fill({}, plan);
  assert.equal(D.planToday(bank, stats, "am", { size: 20 }, NOW).add.length, 0);
  assert.equal(D.todayProgress(stats, NOW).total, 20);
  // Learning words through the day doesn't open room for more.
  let learned = { ...stats };
  for (const id of plan.add.slice(0, 5)) {
    let s = learned[id];
    for (const kind of ["learn:toMeaning", "learn:toGeez", "learn:toGeez"]) s = Q.applyAnswer(s, true, NOW, { kind });
    learned[id] = s;
  }
  assert.equal(D.todayProgress(learned, NOW).learned, 5);
  assert.equal(D.planToday(bank, learned, "am", { size: 20 }, NOW).add.length, 0);
});

test("unfinished words carry over and count toward the next day", () => {
  const stats = fill({}, D.planToday(bank, {}, "am", { size: 20 }, NOW));
  const tomorrow = NOW + DAY;
  const plan = D.planToday(bank, stats, "am", { size: 20 }, tomorrow);
  assert.equal(plan.ids.length, 20, "yesterday's unlearned words are today's");
  assert.equal(plan.add.length, 0);
});

test("a word skipped as known makes room for one more", () => {
  const plan = D.planToday(bank, {}, "am", { size: 10 }, NOW);
  let stats = fill({}, plan);
  stats[plan.add[0]] = Q.skipKnown(stats[plan.add[0]], NOW);
  const more = D.planToday(bank, stats, "am", { size: 10 }, NOW);
  assert.equal(more.add.length, 1);
  assert.ok(!plan.add.includes(more.add[0]));
});

test("new words pause while the backlog is large, unless overridden today", () => {
  const stats = {};
  D.teachingOrder(bank, "am")
    .slice(-70)
    .forEach((e) => (stats[e.id] = { ...Q.EMPTY_STAT, seen: 2, correct: 2, box: 2, due: NOW - DAY }));
  const plan = D.planToday(bank, stats, "am", { size: 20 }, NOW);
  assert.ok(plan.paused);
  assert.equal(plan.add.length, 0);
  assert.equal(D.planToday(bank, stats, "am", { size: 20, override: Q.startOfDay(NOW) }, NOW).add.length, 20);
});

test("a chosen family is learned first", () => {
  const plan = D.planToday(bank, {}, "am", { size: 5, family: "ለ" }, NOW);
  assert.ok(plan.add.every((id) => bank.byId[id].family === "ለ"));
});

test("focus: games ask today's words, topped up as practice when there are too few", () => {
  const plan = D.planToday(bank, {}, "am", { size: 5 }, NOW);
  const stats = fill({}, plan);
  const today = D.focusWords(bank, stats, "am", "today", 50, { now: NOW, random: seeded(1) });
  assert.deepEqual(new Set(today.map((e) => e.id)), new Set(plan.add));
  const padded = D.focusWords(bank, stats, "am", "today", 50, { min: 12, now: NOW, random: seeded(2) });
  assert.equal(padded.length, 12);
  for (const id of plan.add) assert.ok(padded.some((e) => e.id === id));
  const free = D.focusWords(bank, stats, "am", "free", 30, { now: NOW, random: seeded(3) });
  assert.equal(free.length, 30);
});

test("clean-up finds only lightly seen words from before daily sets", () => {
  const stats = {
    1: { ...Q.EMPTY_STAT, seen: 1, correct: 1, box: 1, due: NOW },
    2: { ...Q.EMPTY_STAT, seen: 2, correct: 1, box: 1, due: NOW },
    3: { ...Q.EMPTY_STAT, seen: 5, correct: 5, box: 3, due: NOW },
    4: { ...Q.EMPTY_STAT, seen: 1, correct: 1, box: 1, due: NOW, saved: true },
    5: Q.introduce(null, NOW),
  };
  assert.deepEqual(D.legacyPile(stats), [1, 2]);
  assert.ok(D.isFresh(Q.resetStat()));
});

test("learn session: meaning first, then ግዕዝ; look-alikes after two right", () => {
  let s = Q.introduce(null, NOW);
  assert.deepEqual(D.learnStep(s), { dir: "toMeaning", near: false });
  s = Q.applyAnswer(s, true, NOW, { kind: "learn:toMeaning" });
  assert.equal(D.learnStep(s).dir, "toGeez");
  s = Q.applyAnswer(s, true, NOW, { kind: "learn:toGeez" });
  assert.equal(D.learnStep(s).near, true);
  assert.deepEqual(D.requeue([1, 2, 3, 4, 5], 1), [2, 3, 4, 1, 5]);
  assert.deepEqual(D.requeue([1], 1), [1]);
});

test("streak counts days a word was learned; milestones", () => {
  const stats = {};
  [0, 1, 2, 4].forEach((d, i) => {
    stats[i] = { ...Q.EMPTY_STAT, box: 1, study: { intro: 1, learned: Q.startOfDay(NOW - d * DAY) } };
  });
  assert.equal(D.studyStreak(stats, NOW), 3);
  assert.equal(D.nextMilestone(0), 25);
  assert.equal(D.nextMilestone(100), 250);
});

test("changing the size applies at once to words not started yet", () => {
  let stats = fill({}, D.planToday(bank, {}, "am", { size: 20 }, NOW));
  const first = D.planToday(bank, stats, "am", { size: 20 }, NOW).ids.sort((a, b) => a - b);
  // Start two words, then cut the day to 5.
  const started = D.teachingOrder(bank, "am").slice(18, 20).map((e) => e.id);
  for (const id of started) stats[id] = Q.applyAnswer(stats[id], true, NOW, { kind: "learn:toMeaning" });
  const plan = D.planToday(bank, stats, "am", { size: 5 }, NOW);
  assert.equal(plan.add.length, 0);
  assert.equal(plan.remove.length, 15);
  for (const id of started) assert.ok(!plan.remove.includes(id), "started words stay");
  stats = fill(stats, plan);
  assert.equal(D.todayProgress(stats, NOW).total, 5);
  for (const id of plan.remove) assert.ok(D.isFresh(stats[id]), "removed words are new again");
  // Settled: nothing more to change.
  const again = D.planToday(bank, stats, "am", { size: 5 }, NOW);
  assert.deepEqual([again.add, again.remove], [[], []]);
  // Back up to 20: the same words return, in order.
  stats = fill(stats, D.planToday(bank, stats, "am", { size: 20 }, NOW));
  assert.deepEqual(D.planToday(bank, stats, "am", { size: 20 }, NOW).ids.sort((a, b) => a - b), first);
});

test("changing the family swaps untouched words for that family's", () => {
  let stats = fill({}, D.planToday(bank, {}, "am", { size: 10 }, NOW));
  const plan = D.planToday(bank, stats, "am", { size: 10, family: "ለ" }, NOW);
  assert.equal(plan.add.length, 10);
  assert.equal(plan.remove.length, 10);
  stats = fill(stats, plan);
  const ids = D.planToday(bank, stats, "am", { size: 10, family: "ለ" }, NOW).ids;
  assert.ok(ids.every((id) => bank.byId[id].family === "ለ"));
  const settled = D.planToday(bank, stats, "am", { size: 10, family: "ለ" }, NOW);
  assert.deepEqual([settled.add, settled.remove], [[], []]);
});

test("paused days never remove words", () => {
  const stats = fill({}, D.planToday(bank, {}, "am", { size: 5 }, NOW));
  D.teachingOrder(bank, "am")
    .slice(-70)
    .forEach((e) => (stats[e.id] = { ...Q.EMPTY_STAT, seen: 2, correct: 2, box: 2, due: NOW - DAY }));
  const plan = D.planToday(bank, stats, "am", { size: 1 }, NOW);
  assert.deepEqual([plan.add, plan.remove], [[], []]);
});

test("a chosen family carries on to the next family when it runs out", () => {
  const order = D.teachingOrder(bank, "am", "ለ");
  const families = [...new Set(order.map((e) => e.family))];
  assert.equal(families[0], "ለ");
  assert.equal(families[1], "መ");
  assert.equal(families.at(-1), "ሀ");
});

test("next day: unfinished words stay, then the next new words of the family, never repeats", () => {
  const settings = { size: 10, family: "ለ" };
  let stats = fill({}, D.planToday(bank, {}, "am", settings, NOW));
  const day1 = D.planToday(bank, stats, "am", settings, NOW).ids;
  // Learn 6 of them; 4 are left unfinished.
  for (const id of day1.slice(0, 6)) {
    let s = stats[id];
    for (const kind of ["learn:toMeaning", "learn:toGeez", "learn:toGeez"]) s = Q.applyAnswer(s, true, NOW, { kind });
    stats[id] = s;
  }
  for (const id of day1.slice(6)) stats[id] = Q.applyAnswer(stats[id], false, NOW, { kind: "learn:toGeez" });
  const tomorrow = NOW + DAY;
  const plan = D.planToday(bank, stats, "am", settings, tomorrow);
  assert.equal(plan.add.length, 6);
  for (const id of plan.add) assert.ok(!day1.includes(id), "no word from yesterday is new again");
  assert.ok(plan.add.every((id) => bank.byId[id].family === "ለ"));
  for (const id of day1.slice(6)) assert.ok(plan.ids.includes(id), "unfinished words carry over");
});
