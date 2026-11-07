import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../ui";
import { shared } from "../verbQuiz/shared";
import { legacyPile } from "../../lib/daily";
import { resetStat } from "../../lib/verbQuiz";
import { useStudyPlan } from "../../hooks/useStudyPlan";
import { colors, spacing, typography } from "../../theme";

// The one-time clean-up: words that only flashed past in games before daily
// sets existed (seen once or twice, never past the first box) go back to new,
// so ክለሳ holds only what was really studied. They return through daily sets.
export function CleanupCard({ progress }) {
  const [plan, setPlan] = useStudyPlan();
  const pile = useMemo(() => legacyPile(progress.stats), [progress.stats]);
  if (!plan.loaded || plan.keptPile || !pile.length) return null;

  return (
    <View style={[shared.card, styles.card]}>
      <Text style={styles.title}>Clear the pile in ክለሳ?</Text>
      <Text style={shared.hint}>
        {pile.length} {pile.length === 1 ? "word was" : "words were"} put into ክለሳ after you saw {pile.length === 1 ? "it" : "them"} only
        once or twice in a game. Move them back to new: they'll come back a few at a time in your daily words, and
        ክለሳ keeps only the words you've really studied.
      </Text>
      <View style={shared.row}>
        <Button size="sm" onPress={() => progress.updateWords(() => Object.fromEntries(pile.map((id) => [id, resetStat()])))}>
          {`Move ${pile.length} back to new`}
        </Button>
        <Button size="sm" variant="secondary" onPress={() => setPlan({ keptPile: true })}>
          Keep them in ክለሳ
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, borderColor: colors.primary },
  title: { ...typography.bodySemiBold, color: colors.textPrimary },
});
