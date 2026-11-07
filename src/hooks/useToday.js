import { useEffect, useMemo } from "react";
import { useWordProgress } from "../context/WordProgressContext";
import { useVerbBank } from "./useVerbBank";
import { useGameLanguage } from "./useGameLanguage";
import { useStudyPlan } from "./useStudyPlan";
import { planToday, todayProgress } from "../lib/daily";
import { introduce, resetStat } from "../lib/verbQuiz";

// Today's set, kept in line with the settings: when the day begins, a word is
// skipped as known, or the size or family changes, untouched words are added
// or sent back to new so the set matches at once.
// Used by ዛሬ and by every game, so a game focused on today's words has them.
export function useToday() {
  const progress = useWordProgress();
  const { bank, error } = useVerbBank();
  const [lang] = useGameLanguage();
  const [plan, setPlan] = useStudyPlan();
  const ready = progress.ready && Boolean(bank) && Boolean(plan.loaded);

  const info = useMemo(
    () => (ready ? planToday(bank, progress.stats, lang, plan) : null),
    [ready, bank, progress.stats, lang, plan]
  );

  const changeKey = info ? `${info.add.join(",")}|${info.remove.join(",")}` : "";
  useEffect(() => {
    if (!info || (!info.add.length && !info.remove.length)) return;
    progress.updateWords((stats) => ({
      ...Object.fromEntries(info.remove.map((id) => [id, resetStat()])),
      ...Object.fromEntries(info.add.map((id) => [id, introduce(stats[id])])),
    }));
    // changeKey: only when the words to add or remove change.
  }, [changeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => todayProgress(progress.stats), [progress.stats]);

  return { ready, error, bank, lang, plan, setPlan, info, counts, stats: progress.stats, progress };
}
