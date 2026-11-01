import { StyleSheet, Text, View } from "react-native";
import { Button } from "../ui";
import { FAMILIES } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { Meanings, useSavedToReview } from "./QuizPlay";
import { Section, percent, scriptFont, scriptFontBold, shared } from "./shared";

const duration = (ms) => {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

export function QuizResults({ run, quiz, bank, onRetryMissed, onNewQuiz, onProgress }) {
  const review = useSavedToReview();
  const { lang, alsoShow } = quiz.settings;
  const accuracy = run.total ? run.correct / run.total : 0;
  const fixed = quiz.retry ? quiz.retry.answers.filter((a) => a.correct).length : 0;
  const missedIds = run.missed.filter((id) => bank.byId[id]);
  const unsaved = missedIds.filter((id) => !review.saved(id));

  const verdict =
    accuracy === 1 ? "Perfect round." : accuracy >= 0.8 ? "Strong work." : accuracy >= 0.5 ? "Getting there." : "Keep at it.";

  return (
    <View>
      <View style={[shared.card, styles.hero]}>
        <Text style={styles.verdict}>{verdict}</Text>
        <Text style={styles.big}>
          {run.correct}
          <Text style={styles.bigOf}> / {run.total}</Text>
        </Text>
        <Text style={shared.hint}>
          {percent(accuracy)} right on the first try · {duration(run.durationMs)}
          {quiz.retry ? ` · ${fixed} of ${quiz.retry.questions.length} fixed on the second try` : ""}
        </Text>
        <View style={styles.actions}>
          {run.missed.length ? (
            <Button size="sm" onPress={onRetryMissed}>
              {`Practise the ${run.missed.length} missed`}
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onPress={onNewQuiz}>
            New quiz
          </Button>
          <Button size="sm" variant="ghost" onPress={onProgress}>
            See my progress
          </Button>
        </View>
        {missedIds.length ? (
          <Button size="sm" variant="ghost" disabled={!unsaved.length} onPress={() => review.save(unsaved)}>
            {unsaved.length ? `Add ${unsaved.length} missed to ክለሳ` : "Missed words are in ክለሳ ✓"}
          </Button>
        ) : null}
      </View>

      <Section title="By group">
        <View style={styles.groups}>
          {FAMILIES.filter((f) => run.families[f.id]).map((f) => {
            const { n, c } = run.families[f.id];
            return (
              <View key={f.id} style={styles.group}>
                <Text style={styles.groupLetter}>{f.label}</Text>
                <Text style={styles.groupScore}>
                  {c}/{n}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>

      <Section title="Every question">
        <View style={styles.list}>
          {quiz.questions.map((q, i) => {
            const a = quiz.answers[i];
            if (!a) return null;
            const entry = bank.byId[q.wordId];
            const second = quiz.retry?.answers.find((r) => r.wordId === q.wordId);
            return (
              <View key={i} style={[styles.item, !a.correct && styles.itemMissed]}>
                <Text style={[styles.mark, { color: a.correct ? colors.success : colors.accent }]}>
                  {a.correct ? "✓" : "✕"}
                </Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.itemWord}>
                    <Text style={scriptFontBold(entry.word)}>{entry.word}</Text>
                  </Text>
                  <Meanings entry={entry} langs={[lang, ...alsoShow]} />
                  {!a.correct ? (
                    <Text style={shared.hint}>
                      You answered <Text style={[scriptFont(q.options[a.chosen]), { color: colors.accentDark }]}>{q.options[a.chosen]}</Text>
                      {second ? (second.correct ? " · right on the second try" : " · missed again") : ""}
                    </Text>
                  ) : null}
                </View>
                <Button size="sm" variant="ghost" disabled={review.saved(entry.id)} onPress={() => review.save([entry.id])}>
                  {review.saved(entry.id) ? "✓" : "＋ ክለሳ"}
                </Button>
              </View>
            );
          })}
        </View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl, paddingVertical: spacing.xl },
  verdict: { ...typography.label, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 },
  big: { fontFamily: fontFamily.latinBold, fontSize: 48, lineHeight: 56, color: colors.textPrimary },
  bigOf: { fontSize: 24, color: colors.textMuted },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  groups: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  group: {
    alignItems: "center",
    minWidth: 64,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  groupLetter: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, color: colors.textPrimary },
  groupScore: { ...typography.caption, color: colors.textSecondary },
  list: { gap: spacing.sm },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  itemMissed: { borderColor: colors.accentLight },
  mark: { ...typography.bodySemiBold, width: 16 },
  itemWord: { fontSize: 18, lineHeight: 26, color: colors.textPrimary },
});
