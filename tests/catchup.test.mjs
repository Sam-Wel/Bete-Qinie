import test from "node:test";
import assert from "node:assert/strict";
import { bank } from "./helpers.mjs";
import { REVIEW_DAYS, addDays, applyAnswer, boxForGap, introduce, startOfDay } from "../src/lib/verbQuiz.js";
import { CATCHUP_MIN, isStale, planToday, reviewPlan } from "../src/lib/daily.js";

const NOW = new Date(2026, 10, 13, 10).getTime();
const DAY = 24 * 3600 * 1000;
const reviewing = (box, lastSeenDaysAgo, dueDaysAgo = 0) => ({
  seen: 4, correct: 4, streak: 2, box,
  lastCorrect: true, lastSeen: NOW - lastSeenDaysAgo * DAY, lastWrong: null,
  due: addDays(NOW, -dueDaysAgo), saved: false, study: { intro: 1, learned: 1 },
});

test("a word remembered after a gap jumps to the wait that matches it", () => {
  assert.equal(boxForGap(1), 0);
  assert.equal(boxForGap(10), 4); // 21 days
  assert.equal(REVIEW_DAYS[boxForGap(10)] >= 10, true);
  const after = applyAnswer(reviewing(1, 10, 9), true, NOW);
  assert.equal(after.box, 4);
  assert.equal(after.due, addDays(NOW, 21));
});

test("on time, a right answer still moves one box", () => {
  const after = applyAnswer(reviewing(2, 1), true, NOW);
  assert.equal(after.box, 3);
});

test("Easy moves two boxes; a miss still moves one back", () => {
  assert.equal(applyAnswer(reviewing(1, 1), true, NOW, { easy: true }).box, 3);
  assert.equal(applyAnswer(reviewing(3, 10, 5), false, NOW).box, 2);
});

test("words carried over two days without a right answer go back to new", () => {
  const today = startOfDay(NOW);
  const stale = { ...introduce({}, addDays(NOW, -2)), seen: 2 };
  const started = { ...introduce({}, addDays(NOW, -2)), seen: 2, study: { intro: addDays(today, -2), right: 1, kinds: ["learn:toMeaning"] } };
  const fresh = introduce({}, addDays(NOW, -1));
  assert.equal(isStale(stale, NOW), true);
  assert.equal(isStale(started, NOW), false);
  assert.equal(isStale(fresh, NOW), false);

  const [a, b] = bank.words;
  const plan = planToday(bank, { [a.id]: stale, [b.id]: started }, "ti", { size: 20 }, NOW);
  assert.ok(plan.remove.includes(a.id));
  assert.ok(!plan.remove.includes(b.id));
  assert.ok(!plan.ids.includes(a.id));
});

test("a backlog is spread: a day's share, not everything at once", () => {
  const stats = {};
  for (let i = 0; i < 161; i++) stats[i] = reviewing(1, 5, 3);
  const plan = reviewPlan(stats, NOW);
  assert.equal(plan.due, 161);
  assert.equal(plan.left, Math.max(CATCHUP_MIN, Math.ceil(161 / 5)));
  assert.equal(plan.left + plan.later, 161);

  const small = {};
  for (let i = 0; i < 12; i++) small[i] = reviewing(1, 2, 1);
  assert.deepEqual(reviewPlan(small, NOW).left, 12);
});
