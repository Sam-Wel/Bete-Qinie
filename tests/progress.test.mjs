import test from "node:test";
import assert from "node:assert/strict";
import { bank } from "./helpers.mjs";
import { addDays, bestByFamily, startOfDay } from "../src/lib/verbQuiz.js";
import { learnedPerWeek, reviewForecast, stageCounts } from "../src/lib/progress.js";
import { HELP } from "../src/lib/help.js";
import { NAV_GROUPS } from "../src/lib/navigation.js";

const NOW = new Date(2026, 10, 13, 10).getTime();
const today = startOfDay(NOW);

test("best score per family counts only quizzes with enough questions from it", () => {
  const runs = [
    { at: 1, families: { ሀ: { n: 10, c: 6 }, ለ: { n: 3, c: 3 } } },
    { at: 2, families: { ሀ: { n: 8, c: 8 } } },
  ];
  const best = bestByFamily(runs);
  assert.equal(best.ሀ.score, 1);
  assert.equal(best.ለ, undefined);
});

test("stages add up to every verb", () => {
  const [a, b] = bank.words;
  const s = stageCounts(bank, { [a.id]: { seen: 5, correct: 5, box: 5, lastCorrect: true }, [b.id]: { seen: 2, correct: 1, box: 1, lastCorrect: false } });
  assert.equal(s.mastered, 1);
  assert.equal(s.shaky, 1);
  assert.equal(s.mastered + s.known + s.learning + s.shaky + s.new, s.total);
});

test("words learned are counted in the right week", () => {
  const stats = { 1: { study: { learned: today } }, 2: { study: { learned: addDays(today, -8) } }, 3: { study: { learned: addDays(today, -100) } } };
  const weeks = learnedPerWeek(stats, 8, NOW);
  assert.equal(weeks.length, 8);
  assert.equal(weeks[7].count, 1);
  assert.equal(weeks[6].count, 1);
  assert.equal(weeks.reduce((a, w) => a + w.count, 0), 2);
});

test("the review forecast puts overdue words today", () => {
  const due = (d) => ({ seen: 3, correct: 3, box: 2, lastCorrect: true, due: addDays(today, d) });
  const f = reviewForecast({ 1: due(-3), 2: due(0), 3: due(2), 4: due(30) }, 7, NOW);
  assert.deepEqual(f.map((d) => d.count), [2, 0, 1, 0, 0, 0, 0]);
});

test("every section in the menu has a guide", () => {
  for (const item of NAV_GROUPS.flatMap((g) => g.items)) assert.ok(HELP[item.route], `no guide for ${item.route}`);
});
