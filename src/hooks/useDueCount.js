import { useWordProgress } from "../context/WordProgressContext";
import { reviewSummary } from "../lib/verbQuiz";
import { todayProgress } from "../lib/daily";

// Words due in ክለሳ today, for the badges in the sidebar, tabs and More page.
export function useDueCount() {
  const { stats, ready } = useWordProgress();
  return ready ? reviewSummary(stats).due : 0;
}

// Every badge by name: "due" (ክለሳ) and "today" (ዛሬ: due reviews plus
// today's words still to learn).
export function useBadges() {
  const { stats, ready } = useWordProgress();
  if (!ready) return { due: 0, today: 0 };
  const due = reviewSummary(stats).due;
  return { due, today: due + todayProgress(stats).left };
}
