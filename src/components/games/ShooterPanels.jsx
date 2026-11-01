import { StyleSheet, Text, View } from "react-native";
import { Button } from "../ui";
import { LANGUAGES } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { Meanings, useSavedToReview } from "../verbQuiz/QuizPlay";
import { Chip, shared } from "../verbQuiz/shared";

function ScoreBox({ label, value }) {
  return (
    <View style={styles.scoreBox}>
      <Text style={styles.scoreValue}>{value ?? "—"}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

export function ShooterStart({ lang, onLang, available, best, last, onPlay }) {
  return (
    <View style={[shared.card, styles.card]}>
      <Text style={styles.lead}>
        A meaning appears under the bow. Shoot the ግዕዝ verb that means it before it reaches you. The wrong ones look
        alike — they end in the same letter.
      </Text>

      <View style={styles.rules}>
        <Text style={shared.hint}>• Right shot: points, and your combo multiplies them up to ×5.</Text>
        <Text style={shared.hint}>• Wrong shot: the combo resets, and that verb turns red.</Text>
        <Text style={shared.hint}>• Let the right verb past and you lose one of three crosses.</Text>
        <Text style={shared.hint}>• Every answer counts toward your ግሲ ፈተና progress.</Text>
      </View>

      <Text style={styles.sectionLabel}>MEANINGS IN</Text>
      <View style={shared.row}>
        {LANGUAGES.map((l) => (
          <Chip key={l.code} label={l.label} active={lang === l.code} onPress={() => onLang(l.code)} />
        ))}
      </View>
      <Text style={shared.muted}>{available} verbs to play with.</Text>

      <View style={styles.scores}>
        <ScoreBox label="Best" value={best} />
        <ScoreBox label="Last game" value={last} />
      </View>

      <Button onPress={onPlay} disabled={!available} style={styles.play}>
        Play
      </Button>
    </View>
  );
}

export function ShooterOver({ game, bank, isBest, onAgain, onPractise }) {
  const review = useSavedToReview();
  const missed = game.missed.map((id) => bank.byId[id]).filter(Boolean);
  const unsaved = missed.filter((e) => !review.saved(e.word)).map((e) => e.word);

  return (
    <View>
      <View style={[shared.card, styles.card, styles.overCard]}>
        <Text style={styles.kicker}>{isBest ? "New best!" : "Game over"}</Text>
        <Text style={styles.bigScore}>{game.score}</Text>
        <Text style={shared.hint}>
          {game.cleared} verb{game.cleared === 1 ? "" : "s"} shot down
          {game.bestCombo > 1 ? ` · best run ${game.bestCombo} in a row` : ""}
        </Text>
        <View style={styles.actions}>
          <Button size="sm" onPress={onAgain}>
            Play again
          </Button>
          {missed.length ? (
            <Button size="sm" variant="secondary" onPress={() => onPractise(missed.map((e) => e.id))}>
              {`Practise the ${missed.length} missed in ግሲ ፈተና`}
            </Button>
          ) : null}
        </View>
      </View>

      {missed.length ? (
        <View style={styles.missed}>
          <View style={styles.missedHeader}>
            <Text style={styles.sectionLabel}>WORDS THAT GOT AWAY</Text>
            {review.isSignedIn ? (
              <Button size="sm" variant="ghost" disabled={!unsaved.length} onPress={() => review.save(unsaved)}>
                {unsaved.length ? `Add ${unsaved.length} to ክለሳ` : "All in ክለሳ ✓"}
              </Button>
            ) : null}
          </View>
          {missed.map((entry) => (
            <View key={entry.id} style={styles.missedRow}>
              <Text style={styles.missedWord}>{entry.word}</Text>
              <Meanings entry={entry} langs={[game.lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== game.lang)]} style={{ flex: 1 }} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  lead: { ...typography.body, color: colors.textPrimary },
  rules: { gap: 4 },
  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },
  scores: { flexDirection: "row", gap: spacing.xl },
  scoreBox: { gap: 0 },
  scoreValue: { fontFamily: fontFamily.latinBold, fontSize: 26, lineHeight: 32, color: colors.textPrimary },
  scoreLabel: { ...typography.caption, color: colors.textMuted },
  play: { alignSelf: "stretch" },
  overCard: { alignItems: "center", paddingVertical: spacing.xl, marginBottom: spacing.xl },
  kicker: { ...typography.label, color: colors.primaryDark, letterSpacing: 1, textTransform: "uppercase" },
  bigScore: { fontFamily: fontFamily.latinBold, fontSize: 52, lineHeight: 60, color: colors.textPrimary },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  missed: { gap: spacing.sm },
  missedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  missedRow: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  missedWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 18, lineHeight: 26, color: colors.textPrimary, minWidth: 80 },
});
