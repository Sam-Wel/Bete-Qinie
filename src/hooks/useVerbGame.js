import { useCallback, useMemo, useRef } from "react";
import { useGameScores } from "./useGameScores";
import { useToday } from "./useToday";
import { focusWords, inFocus } from "../lib/daily";
import { setGameLanguage } from "./useGameLanguage";

// Everything a verb game needs, in one place: the dictionary's verbs, the
// shared meaning language, per-word progress (the same record ግሲ ፈተና, ቀስት,
// ቃል and ክለሳ use), today's study focus and best/last scores. A game only
// supplies its rules.
export function useVerbGame(gameType) {
  const today = useToday();
  const { bank, lang, plan, setPlan, progress } = today;
  const scores = useGameScores(gameType);
  const missed = useRef(new Set());
  const focus = plan.focus;

  // One answer about one verb: moves its study record and remembers misses
  // for the end-of-game list.
  const record = useCallback(
    (wordId, correct) => {
      progress.recordAnswer(wordId, correct, { kind: gameType });
      if (!correct) missed.current.add(wordId);
    },
    [progress, gameType]
  );

  const start = useCallback(() => {
    missed.current = new Set();
  }, []);

  // Saves the score; resolves to whether it beat the previous best.
  const finish = useCallback(
    async ({ score, rounds, state = {} }) => {
      progress.flush();
      return scores.saveScore({ score, rounds, state: { ...state, lang, focus, missed: [...missed.current] } });
    },
    [progress, scores, lang, focus]
  );

  // Verbs for a round, kept to the focus (topped up from all verbs to `min`).
  const words = useCallback(
    (count, opts = {}) => focusWords(bank, progress.stats, lang, focus, count, opts),
    [bank, progress.stats, lang, focus]
  );

  // Ids in focus, for games that order their own lists (today's words first).
  const focusIds = useMemo(() => {
    if (focus === "free" || !bank) return null;
    return new Set(bank.words.filter((e) => inFocus(progress.stats[e.id], focus)).map((e) => e.id));
  }, [bank, progress.stats, focus]);

  return {
    bank,
    error: today.error,
    ready: today.ready && scores.ready,
    loading: !today.ready,
    lang,
    setLang: setGameLanguage,
    focus,
    setFocus: (next) => setPlan({ focus: next }),
    focusIds,
    todayCounts: today.counts,
    stats: progress.stats,
    signedIn: progress.mode === "account",
    best: scores.best,
    last: scores.last,
    record,
    start,
    finish,
    words,
    missedIds: () => [...missed.current],
  };
}
