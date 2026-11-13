import { useWordProgress } from "../context/WordProgressContext";
import { reviewPlan, todayProgress } from "../lib/daily";

// ክለሳ reviews still to do today (today's share when there is a backlog), for the badges.
export function useDueCount() {
  const { stats, ready } = useWordProgress();
  return ready ? reviewPlan(stats).left : 0;
}

// Every badge by name: "due" (ክለሳ) and "today" (ዛሬ: due reviews plus
// today's words still to learn).
export function useBadges() {
  const { stats, ready } = useWordProgress();
  if (!ready) return { due: 0, today: 0 };
  const due = reviewPlan(stats).left;
  return { due, today: due + todayProgress(stats).left };
}
