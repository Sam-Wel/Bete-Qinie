import { ScreenContainer } from "../../components/ui";
import { ProgressView } from "../../components/progress/ProgressView";
import { BonePage } from "../../components/ui/Skeleton";
import { useWordProgress } from "../../context/WordProgressContext";
import { useGameLanguage } from "../../hooks/useGameLanguage";
import { useVerbBank } from "../../hooks/useVerbBank";
import { spacing } from "../../theme";

// እድገት: how much ግዕዝ you know, from every way of studying (ዛሬ, ክለሳ, games, quizzes).
export default function Progress() {
  const progress = useWordProgress();
  const { bank } = useVerbBank();
  const [lang] = useGameLanguage();

  if (!progress.ready || !bank) {
    return (
      <ScreenContainer scroll>
        <BonePage cards={[{ tall: true, lines: 2 }, { lines: 4 }, { lines: 4 }]} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll contentContainerStyle={{ gap: spacing.lg }}>
      <ProgressView bank={bank} stats={progress.stats} lang={lang} />
    </ScreenContainer>
  );
}
