import { ActivityIndicator } from "react-native";
import { ScreenContainer } from "../../components/ui";
import { ProgressView } from "../../components/progress/ProgressView";
import { useWordProgress } from "../../context/WordProgressContext";
import { useGameLanguage } from "../../hooks/useGameLanguage";
import { useVerbBank } from "../../hooks/useVerbBank";
import { colors, spacing } from "../../theme";

// እድገት: how much ግዕዝ you know, from every way of studying (ዛሬ, ክለሳ, games, quizzes).
export default function Progress() {
  const progress = useWordProgress();
  const { bank } = useVerbBank();
  const [lang] = useGameLanguage();

  if (!progress.ready || !bank) {
    return (
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll contentContainerStyle={{ gap: spacing.lg }}>
      <ProgressView bank={bank} stats={progress.stats} lang={lang} />
    </ScreenContainer>
  );
}
