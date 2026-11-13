// The Progress page's numbers, from the shared word records (every way of studying
// counts: ዛሬ, ክለሳ, games and quizzes). Pure functions so they can be tested.

import { addDays, inReview, isLearning, startOfDay, stateOf } from "./verbQuiz";

// How many verbs are at each stage.
export function stageCounts(bank, stats) {
  const counts = { mastered: 0, known: 0, learning: 0, shaky: 0, new: 0 };
  for (const entry of bank.words) counts[stateOf(stats[entry.id])] += 1;
  return { ...counts, total: bank.words.length };
}

// Words learned (finished in ዛሬ) in each of the last `weeks` weeks, oldest first:
// [{ start, count }]. Weeks start on the day `weeks * 7` days ago.
export function learnedPerWeek(stats, weeks = 8, now = Date.now()) {
  const today = startOfDay(now);
  const out = Array.from({ length: weeks }, (_, i) => ({ start: addDays(today, -7 * (weeks - i) + 1), count: 0 }));
  for (const s of Object.values(stats)) {
    const day = s?.study?.learned;
    if (!day) continue;
    for (let i = weeks - 1; i >= 0; i--) {
      if (day >= out[i].start) {
        if (day <= today) out[i].count += 1;
        break;
      }
    }
  }
  return out;
}

// Reviews coming due on each of the next `days` days (today first, overdue counted
// today): [{ day, count }].
export function reviewForecast(stats, days = 7, now = Date.now()) {
  const today = startOfDay(now);
  const out = Array.from({ length: days }, (_, i) => ({ day: addDays(today, i), count: 0 }));
  for (const s of Object.values(stats)) {
    if (!inReview(s) || isLearning(s)) continue;
    const i = Math.max(0, Math.round((startOfDay(s.due) - today) / (24 * 3600 * 1000)));
    if (i < days) out[i].count += 1;
  }
  return out;
}
