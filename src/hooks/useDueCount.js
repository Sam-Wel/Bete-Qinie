import { useWordProgress } from "../context/WordProgressContext";
import { reviewPlan, todayProgress } from "../lib/daily";
import { useNow } from "../lib/appResume";

// ክለሳ reviews still to do today (today's share when there is a backlog), for the badges.
export function useDueCount() {
  const { stats, ready } = useWordProgress();
  const now = useNow(); // recount when the day changes or the app comes back
  return ready ? reviewPlan(stats, now).left : 0;
}

// Every badge by name: "due" (ክለሳ) and "today" (ዛሬ: due reviews plus
// today's words still to learn).
export function useBadges() {
  const { stats, ready } = useWordProgress();
  const now = useNow(); // recount when the day changes or the app comes back
  if (!ready) return { due: 0, today: 0 };
  const due = reviewPlan(stats, now).left;
  return { due, today: due + todayProgress(stats, now).left };
}
