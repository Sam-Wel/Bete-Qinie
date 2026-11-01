import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/lib/shooter.js";
import { wordsInScope } from "../src/lib/verbQuiz.js";
import { bank, seeded } from "./helpers.mjs";

const fresh = () =>
  G.step(G.newGame({ bank, pool: wordsInScope(bank, { mode: "all" }, "am"), stats: {}, lang: "am", random: seeded(1) }), G.COUNTDOWN).game;

test("each wave has four different verbs and the right one is the answer", () => {
  let g = fresh();
  for (let i = 0; i < 40; i++) {
    const w = g.wave;
    assert.equal(new Set(w.enemies.map((e) => e.text)).size, 4);
    assert.equal(w.enemies[w.question.answerIndex].text, bank.byId[w.question.wordId].word);
    g = G.step(G.shoot(g, w.question.answerIndex).game, 600).game;
  }
  assert.equal(g.cleared, 40);
});

test("a wrong shot pulls verbs closer and breaks the run; an escape costs a life", () => {
  let g = fresh();
  const wrong = (g.wave.question.answerIndex + 1) % 4;
  const before = g.wave.enemies.map((e) => e.y);
  g = G.shoot(g, wrong).game;
  assert.equal(g.combo, 0);
  g.wave.enemies.forEach((e, i) => assert.ok(Math.abs(e.y - before[i] - 0.05) < 1e-9));
  let answer = null;
  while (!answer) ({ game: g, answer } = G.step(g, 50));
  assert.equal(answer.correct, false);
  assert.equal(g.lives, 2);
});

test("ranks follow the best score", () => {
  assert.equal(G.rankFor(0).title, "ፊደል ቆጣሪ");
  assert.equal(G.rankFor(450).title, "ዜማ ተማሪ");
  assert.equal(G.rankFor(99999).next, null);
});
