// ቀስት: the rules of the verb shooter, kept free of React so they can be
// checked on their own. A wave is one ግሲ ፈተና "meaning → ግዕዝ" question played
// out in space: the four options fall in four lanes and the learner shoots the
// verb that matches the meaning shown. Positions are fractions of the field
// height, time is in milliseconds.

import { buildQuestion, pickWords } from "./verbQuiz";

export const LANES = 4;
export const LIVES = 3;
export const BOTTOM = 0.84; // where the bow stands; the right verb crossing it costs a life
const START_Y = -0.12;
const STAGGER = 0.14; // lanes start at slightly different heights
const BASE_SPEED = 0.07; // field heights per second on the first waves
const SPEED_STEP = 0.012; // added every SPEED_EVERY waves
const SPEED_EVERY = 5;
const MAX_SPEED = 0.2;
const MAX_MULTIPLIER = 5;
const POINTS = 10;
const HIT_PAUSE = 500; // a breath after a hit before the next wave
const ESCAPE_PAUSE = 1800; // long enough to read the answer that got away

export const speedFor = (wave) => Math.min(MAX_SPEED, BASE_SPEED + Math.floor(wave / SPEED_EVERY) * SPEED_STEP);

function makeWave(game, random) {
  let { queue } = game;
  if (!queue.length) queue = pickWords(game.pool, game.stats, "smart", "all", random);
  const [entry, ...rest] = queue;
  const question = buildQuestion(entry, game.lang, "toGeez", game.bank, random);
  return {
    ...game,
    queue: rest,
    wave: {
      number: game.cleared + game.escaped + 1,
      question,
      enemies: question.options.map((text, lane) => ({ lane, text, y: START_Y - random() * STAGGER, wrongAt: null })),
      shotWrong: false,
      outcome: null, // "hit" | "escaped"
      endedAt: null,
    },
  };
}

// pool: the verbs that can be asked in `lang`; stats: ግሲ ፈተና word progress,
// so Smart mix brings the learner's weak words first.
export function newGame({ bank, pool, stats, lang, random = Math.random }) {
  return makeWave(
    {
      bank,
      pool,
      stats,
      lang,
      queue: [],
      t: 0,
      score: 0,
      combo: 0,
      bestCombo: 0,
      lives: LIVES,
      cleared: 0,
      escaped: 0,
      missed: [],
      shots: [],
      over: false,
      wave: null,
    },
    random
  );
}

const missedWith = (missed, wordId) => (missed.includes(wordId) ? missed : [...missed, wordId]);

// Fire at a lane. Returns the new game and, the first time a wave is settled,
// the answer to record for that verb ({ wordId, correct }).
export function shoot(game, lane) {
  const { wave } = game;
  const enemy = wave?.enemies[lane];
  if (game.over || !enemy || wave.outcome) return { game, answer: null };

  const shots = [...game.shots.filter((s) => game.t - s.at < 400), { lane, y: enemy.y, at: game.t }];

  if (lane === wave.question.answerIndex) {
    const combo = game.combo + 1;
    return {
      game: {
        ...game,
        shots,
        score: game.score + POINTS * Math.min(combo, MAX_MULTIPLIER),
        combo,
        bestCombo: Math.max(game.bestCombo, combo),
        cleared: game.cleared + 1,
        missed: wave.shotWrong ? missedWith(game.missed, wave.question.wordId) : game.missed,
        wave: { ...wave, outcome: "hit", endedAt: game.t },
      },
      answer: { wordId: wave.question.wordId, correct: !wave.shotWrong },
    };
  }

  if (enemy.wrongAt != null) return { game, answer: null };
  // A wrong verb stays in play (so guessing can't whittle the lanes down) but
  // flashes, and the streak is lost.
  return {
    game: {
      ...game,
      shots,
      combo: 0,
      wave: {
        ...wave,
        shotWrong: true,
        enemies: wave.enemies.map((e) => (e.lane === lane ? { ...e, wrongAt: game.t } : e)),
      },
    },
    answer: null,
  };
}

// Advance the clock. Returns the new game and the answer to record if the
// right verb got past the bow this step.
export function step(game, dt, random = Math.random) {
  if (game.over) return { game, answer: null };
  const t = game.t + dt;
  const { wave } = game;

  if (wave.outcome) {
    const pause = wave.outcome === "hit" ? HIT_PAUSE : ESCAPE_PAUSE;
    if (t - wave.endedAt < pause) return { game: { ...game, t }, answer: null };
    if (game.lives <= 0) return { game: { ...game, t, over: true }, answer: null };
    return { game: makeWave({ ...game, t }, random), answer: null };
  }

  const fall = (speedFor(wave.number - 1) * dt) / 1000;
  const enemies = wave.enemies.map((e) => ({ ...e, y: e.y + fall }));
  const target = enemies[wave.question.answerIndex];

  if (target.y >= BOTTOM) {
    return {
      game: {
        ...game,
        t,
        combo: 0,
        lives: game.lives - 1,
        escaped: game.escaped + 1,
        missed: missedWith(game.missed, wave.question.wordId),
        wave: { ...wave, enemies, outcome: "escaped", endedAt: t },
      },
      answer: { wordId: wave.question.wordId, correct: false },
    };
  }

  return { game: { ...game, t, wave: { ...wave, enemies } }, answer: null };
}

export const multiplier = (combo) => Math.min(Math.max(combo, 1), MAX_MULTIPLIER);
