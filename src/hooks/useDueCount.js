import { useWordProgress } from "../context/WordProgressContext";
import { reviewSummary } from "../lib/verbQuiz";

// Words due in ክለሳ today, for the badges in the sidebar, tabs and More page.
export function useDueCount() {
  const { stats, ready } = useWordProgress();
  return ready ? reviewSummary(stats).due : 0;
}
