// ቀስት: the rules of the verb shooter, kept free of React so they can be
// checked on their own. A wave is one ግሲ ፈተና "meaning → ግዕዝ" question played
// out in space: the four options fall in four lanes and the learner shoots the
// verb that matches the meaning shown. Positions are fractions of the field
// height, time is in milliseconds.

import { buildQuestion, pickWords } from "./verbQuiz";

export const LANES = 4;
export const LIVES = 3;
export const BOTTOM = 0.84; // where the bow stands; the right verb crossing it costs a life
export const COUNTDOWN = 2400; // 3, 2, 1 before the first wave moves
export const LEVEL_EVERY = 5; // waves per level; each level falls faster
const START_Y = -0.12;
const STAGGER = 0.14; // lanes start at slightly different heights
const BASE_SPEED = 0.07; // field heights per second on level 1
const SPEED_STEP = 0.012;
const MAX_SPEED = 0.2;
const MAX_MULTIPLIER = 5;
const POINTS = 10;
const EARLY_BONUS = 10; // extra points for a hit right at the top, falling to 0 at the bow
const LURCH = 0.05; // a wrong shot drags every verb this much closer
const STREAK_REWARD = 10; // hits in a row that earn a cross back
const STREAK_BONUS = 50; // ...or these points when no cross is missing
const HIT_PAUSE = 500; // a breath after a hit before the next wave
const ESCAPE_PAUSE = 1800; // long enough to read the answer that got away
const EVENT_LIFE = 1500; // how long a score pop or banner stays on screen

export const levelOf = (wave) => Math.floor((wave - 1) / LEVEL_EVERY) + 1;
export const speedFor = (wave) => Math.min(MAX_SPEED, BASE_SPEED + (levelOf(wave) - 1) * SPEED_STEP);
export const multiplier = (combo) => Math.min(Math.max(combo, 1), MAX_MULTIPLIER);

// Ranks follow the stages of traditional church-school learning; the best
// score so far decides which one a player holds.
export const RANKS = [
  { min: 0, title: "ፊደል ቆጣሪ" },
  { min: 150, title: "ዳዊት ደጋሚ" },
  { min: 400, title: "ዜማ ተማሪ" },
  { min: 800, title: "ቅኔ ተማሪ" },
  { min: 1500, title: "መምህር" },
  { min: 3000, title: "ሊቅ" },
];

export function rankFor(score) {
  const index = RANKS.reduce((found, rank, i) => (score >= rank.min ? i : found), 0);
  return { ...RANKS[index], index, next: RANKS[index + 1] ?? null };
}

const withEvent = (game, event) => ({
  ...game,
  events: [...game.events.filter((e) => game.t - e.at < EVENT_LIFE), { ...event, at: game.t }],
});

function makeWave(game, random) {
  let { queue } = game;
  if (!queue.length) queue = pickWords(game.pool, game.stats, "smart", "all", random);
  const [entry, ...rest] = queue;
  const question = buildQuestion(entry, game.lang, "toGeez", game.bank, random);
  const number = game.cleared + game.escaped + 1;
  const next = {
    ...game,
    queue: rest,
    wave: {
      number,
      question,
      enemies: question.options.map((text, lane) => ({ lane, text, y: START_Y - random() * STAGGER, wrongAt: null })),
      shotWrong: false,
      outcome: null, // "hit" | "escaped"
      endedAt: null,
    },
  };
  return number > 1 && levelOf(number) > levelOf(number - 1) ? withEvent(next, { type: "level", level: levelOf(number) }) : next;
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
      t: -COUNTDOWN,
      score: 0,
      combo: 0,
      bestCombo: 0,
      lives: LIVES,
      cleared: 0,
      escaped: 0,
      firstTry: 0,
      practised: [],
      missed: [],
      shots: [],
      events: [],
      over: false,
      wave: null,
    },
    random
  );
}

const addOnce = (list, id) => (list.includes(id) ? list : [...list, id]);

// Fire at a lane. Returns the new game and, the first time a wave is settled,
// the answer to record for that verb ({ wordId, correct }).
export function shoot(game, lane) {
  const { wave } = game;
  const enemy = wave?.enemies[lane];
  if (game.over || game.t < 0 || !enemy || wave.outcome || enemy.wrongAt != null) return { game, answer: null };

  const shots = [...game.shots.filter((s) => game.t - s.at < 400), { lane, y: enemy.y, at: game.t }];

  if (lane === wave.question.answerIndex) {
    const combo = game.combo + 1;
    const early = Math.round(EARLY_BONUS * (1 - Math.min(1, Math.max(0, enemy.y) / BOTTOM)));
    const points = (POINTS + early) * multiplier(combo);
    const wordId = wave.question.wordId;
    let next = {
      ...game,
      shots,
      score: game.score + points,
      combo,
      bestCombo: Math.max(game.bestCombo, combo),
      cleared: game.cleared + 1,
      firstTry: game.firstTry + (wave.shotWrong ? 0 : 1),
      practised: addOnce(game.practised, wordId),
      missed: wave.shotWrong ? addOnce(game.missed, wordId) : game.missed,
      wave: { ...wave, outcome: "hit", endedAt: game.t },
    };
    next = withEvent(next, { type: "hit", points, lane, y: enemy.y });
    if (combo % STREAK_REWARD === 0) {
      next =
        next.lives < LIVES
          ? withEvent({ ...next, lives: next.lives + 1 }, { type: "life" })
          : withEvent({ ...next, score: next.score + STREAK_BONUS }, { type: "streak", points: STREAK_BONUS });
    }
    return { game: next, answer: { wordId, correct: !wave.shotWrong } };
  }

  // A wrong verb stays in play (so guessing can't whittle the lanes down),
  // turns red, costs the streak, and drags every verb closer to the bow.
  return {
    game: withEvent(
      {
        ...game,
        shots,
        combo: 0,
        wave: {
          ...wave,
          shotWrong: true,
          enemies: wave.enemies.map((e) => ({ ...e, y: e.y + LURCH, wrongAt: e.lane === lane ? game.t : e.wrongAt })),
        },
      },
      { type: "wrong", lane }
    ),
    answer: null,
  };
}

// Advance the clock. Returns the new game and the answer to record if the
// right verb got past the bow this step.
export function step(game, dt, random = Math.random) {
  if (game.over) return { game, answer: null };
  const t = game.t + dt;
  if (t < 0) return { game: { ...game, t }, answer: null }; // still counting down
  const { wave } = game;

  if (wave.outcome) {
    const pause = wave.outcome === "hit" ? HIT_PAUSE : ESCAPE_PAUSE;
    if (t - wave.endedAt < pause) return { game: { ...game, t }, answer: null };
    if (game.lives <= 0) return { game: { ...game, t, over: true }, answer: null };
    return { game: makeWave({ ...game, t }, random), answer: null };
  }

  const fall = (speedFor(wave.number) * Math.min(dt, t)) / 1000;
  const enemies = wave.enemies.map((e) => ({ ...e, y: e.y + fall }));
  const target = enemies[wave.question.answerIndex];

  if (target.y >= BOTTOM) {
    const wordId = wave.question.wordId;
    return {
      game: withEvent(
        {
          ...game,
          t,
          combo: 0,
          lives: game.lives - 1,
          escaped: game.escaped + 1,
          practised: addOnce(game.practised, wordId),
          missed: addOnce(game.missed, wordId),
          wave: { ...wave, enemies, outcome: "escaped", endedAt: t },
        },
        { type: "escape" }
      ),
      answer: { wordId, correct: false },
    };
  }

  return { game: { ...game, t, wave: { ...wave, enemies } }, answer: null };
}

// Visible events (score pops, banners) at time t.
export const liveEvents = (game) => game.events.filter((e) => game.t - e.at < EVENT_LIFE);
export const EVENT_MS = EVENT_LIFE;
