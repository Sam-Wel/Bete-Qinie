import { useCallback, useRef } from "react";
import { useVerbBank } from "./useVerbBank";
import { useGameScores } from "./useGameScores";
import { useGameLanguage } from "./useGameLanguage";
import { useWordProgress } from "../context/WordProgressContext";

// Everything a verb game needs, in one place: the dictionary's verbs, the
// shared meaning language, per-word progress (the same record ግሲ ፈተና, ቀስት,
// ቃል and ክለሳ use) and best/last scores. A game only supplies its rules.
export function useVerbGame(gameType) {
  const { bank, loading, error } = useVerbBank();
  const [lang, setLang] = useGameLanguage();
  const progress = useWordProgress();
  const scores = useGameScores(gameType);
  const missed = useRef(new Set());

  // One answer about one verb: moves its review schedule and remembers misses
  // for the end-of-game list.
  const record = useCallback(
    (wordId, correct) => {
      progress.recordAnswer(wordId, correct);
      if (!correct) missed.current.add(wordId);
    },
    [progress]
  );

  const start = useCallback(() => {
    missed.current = new Set();
  }, []);

  // Saves the score; resolves to whether it beat the previous best.
  const finish = useCallback(
    async ({ score, rounds, state = {} }) => {
      progress.flush();
      return scores.saveScore({ score, rounds, state: { ...state, lang, missed: [...missed.current] } });
    },
    [progress, scores, lang]
  );

  return {
    bank,
    error,
    ready: Boolean(bank) && progress.ready && scores.ready,
    loading,
    lang,
    setLang,
    stats: progress.stats,
    signedIn: progress.mode === "account",
    best: scores.best,
    last: scores.last,
    record,
    start,
    finish,
    missedIds: () => [...missed.current],
  };
}
