import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button } from "../ui";
import { LANGUAGES } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { Meanings, useSavedToReview } from "../verbQuiz/QuizPlay";
import { shared } from "../verbQuiz/shared";

function Stat({ value, label, tone }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone && { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// The end of any verb game: the score and whether it's a new best, a few
// game-specific numbers, then every verb that was missed with its meanings,
// so the round ends on learning. Missed verbs can go to ክለሳ or ግሲ ፈተና.
// `progressNote` replaces the line about word progress (null hides it), for games
// that don't change study records.
export function GameResults({ title, score, isBest, stats = [], missedIds = [], bank, lang, signedIn, onAgain, children, progressNote }) {
  const review = useSavedToReview();
  const missed = missedIds.map((id) => bank.byId[id]).filter(Boolean);
  const unsaved = missed.filter((e) => !review.saved(e.id)).map((e) => e.id);
  const langs = [lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== lang)];

  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <View style={[shared.card, styles.card]}>
        <Text style={[styles.kicker, isBest && { color: colors.success }]}>{isBest ? "New best!" : title}</Text>
        <Text style={styles.score}>{score}</Text>
        {stats.length ? (
          <View style={styles.stats}>
            {stats.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </View>
        ) : null}
        {progressNote === undefined ? (
          <Text style={[shared.muted, { textAlign: "center" }]}>
            Saved to your word progress{signedIn ? "" : " on this device"}. Missed verbs come back in ክለሳ.
          </Text>
        ) : progressNote ? (
          <Text style={[shared.muted, { textAlign: "center" }]}>{progressNote}</Text>
        ) : null}
        {children}
        <View style={styles.actions}>
          <Button size="sm" onPress={onAgain}>
            Play again
          </Button>
          {missed.length ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => router.push({ pathname: "/verb-quiz", params: { words: missed.map((e) => e.id).join(",") } })}
            >
              {`Practise the ${missed.length} missed`}
            </Button>
          ) : null}
        </View>
      </View>

      {missed.length ? (
        <View style={styles.missed}>
          <View style={styles.missedHeader}>
            <Text style={styles.sectionLabel}>TO LEARN</Text>
            <Button size="sm" variant="ghost" disabled={!unsaved.length} onPress={() => review.save(unsaved)}>
              {unsaved.length ? `Add ${unsaved.length} to ክለሳ` : "All in ክለሳ ✓"}
            </Button>
          </View>
          {missed.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.word}>{entry.word}</Text>
              <Meanings entry={entry} langs={langs} style={{ flex: 1 }} />
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl, marginBottom: spacing.lg },
  kicker: { ...typography.label, color: colors.primaryDark, letterSpacing: 1, textTransform: "uppercase" },
  score: { fontFamily: fontFamily.latinBold, fontSize: 52, lineHeight: 60, color: colors.textPrimary },
  stats: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.xl, rowGap: spacing.md },
  stat: { alignItems: "center", minWidth: 70 },
  statValue: { fontFamily: fontFamily.latinBold, fontSize: 22, lineHeight: 28, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  missed: { gap: spacing.sm },
  missedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  word: { fontFamily: fontFamily.ethiopicBold, fontSize: 18, lineHeight: 26, color: colors.textPrimary, minWidth: 80 },
});
