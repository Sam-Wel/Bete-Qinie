import { StyleSheet, Text, View } from "react-native";
import { Button } from "../ui";
import { LANGUAGES } from "../../lib/verbQuiz";
import { rankFor } from "../../lib/shooter";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { Meanings, useSavedToReview } from "../verbQuiz/QuizPlay";
import { Chip, shared } from "../verbQuiz/shared";

function Stat({ value, label, tone }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tone && { color: tone }]}>{value ?? "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// The rank a best score earns, and how far it is to the next one.
function RankCard({ best, rankedUp }) {
  const rank = rankFor(best ?? 0);
  const span = rank.next ? rank.next.min - rank.min : 1;
  const into = rank.next ? (best ?? 0) - rank.min : 1;
  return (
    <View style={styles.rank}>
      <View style={styles.rankRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rankKicker}>{rankedUp ? "NEW RANK" : "YOUR RANK"}</Text>
          <Text style={styles.rankTitle}>{rank.title}</Text>
        </View>
        <Text style={styles.rankStep}>{rank.index + 1} / 6</Text>
      </View>
      <View style={styles.rankTrack}>
        <View style={[styles.rankFill, { width: `${Math.min(100, (into / span) * 100)}%` }]} />
      </View>
      <Text style={styles.rankHint}>
        {rank.next
          ? `${rank.next.min - (best ?? 0)} more points on your best to reach ${rank.next.title}`
          : "The highest rank. Keep your best climbing."}
      </Text>
    </View>
  );
}

export function ShooterStart({ lang, onLang, available, best, last, onPlay }) {
  return (
    <View style={[shared.card, styles.card]}>
      <Text style={styles.lead}>
        Shoot the ግዕዝ verb that means the word under the bow before it gets past. The wrong ones end in the same
        letter, so they look alike.
      </Text>

      <View style={styles.rules}>
        <Text style={shared.hint}>• Hit it early for more points; hits in a row multiply them, up to ×5.</Text>
        <Text style={shared.hint}>• A wrong shot pulls every verb closer and breaks your run.</Text>
        <Text style={shared.hint}>• Three crosses. Ten hits in a row wins a lost one back.</Text>
      </View>

      <RankCard best={best} />

      <View style={styles.statsRow}>
        <Stat label="Best" value={best} />
        <Stat label="Last game" value={last} />
      </View>

      <Text style={styles.sectionLabel}>MEANINGS IN</Text>
      <View style={shared.row}>
        {LANGUAGES.map((l) => (
          <Chip key={l.code} label={l.label} active={lang === l.code} onPress={() => onLang(l.code)} />
        ))}
      </View>
      <Text style={shared.muted}>{available} verbs to play with. Your weakest come first.</Text>

      <Button onPress={onPlay} disabled={!available} style={styles.play}>
        Play
      </Button>
    </View>
  );
}

export function ShooterOver({ game, bank, isBest, previousBest, nowKnown, signedIn, onAgain, onPractise }) {
  const review = useSavedToReview();
  const missed = game.missed.map((id) => bank.byId[id]).filter(Boolean);
  const unsaved = missed.filter((e) => !review.saved(e.id)).map((e) => e.id);
  const best = Math.max(previousBest ?? 0, game.score);
  const rankedUp = rankFor(best).index > rankFor(previousBest ?? 0).index;

  return (
    <View>
      <View style={[shared.card, styles.card, styles.overCard]}>
        <Text style={styles.kicker}>{isBest ? "New best!" : "Game over"}</Text>
        <Text style={styles.bigScore}>{game.score}</Text>
        <View style={styles.statsRow}>
          <Stat label="verbs practised" value={game.practised.length} />
          <Stat label="right first time" value={game.firstTry} tone={colors.success} />
          <Stat label="now known" value={nowKnown} tone={colors.primaryDark} />
          <Stat label="best run" value={game.bestCombo} />
        </View>
        <Text style={[shared.muted, { textAlign: "center" }]}>
          Saved to your ግሲ ፈተና progress{signedIn ? "" : " on this device"}.
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

      <View style={{ marginBottom: spacing.xl }}>
        <RankCard best={best} rankedUp={rankedUp} />
      </View>

      {missed.length ? (
        <View style={styles.missed}>
          <View style={styles.missedHeader}>
            <Text style={styles.sectionLabel}>WORDS THAT GOT AWAY</Text>
            <Button size="sm" variant="ghost" disabled={!unsaved.length} onPress={() => review.save(unsaved)}>
              {unsaved.length ? `Add ${unsaved.length} to ክለሳ` : "All in ክለሳ ✓"}
            </Button>
          </View>
          {missed.map((entry) => (
            <View key={entry.id} style={styles.missedRow}>
              <Text style={styles.missedWord}>{entry.word}</Text>
              <Meanings
                entry={entry}
                langs={[game.lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== game.lang)]}
                style={{ flex: 1 }}
              />
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
  statsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.xl, rowGap: spacing.md },
  stat: { alignItems: "center", minWidth: 70 },
  statValue: { fontFamily: fontFamily.latinBold, fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textMuted },
  rank: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: "#17110a" },
  rankRow: { flexDirection: "row", alignItems: "flex-end" },
  rankKicker: { fontFamily: fontFamily.latinSemiBold, fontSize: 11, letterSpacing: 1, color: "#c9b48a" },
  rankTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 30, color: "#e0a52a" },
  rankStep: { fontFamily: fontFamily.latinSemiBold, fontSize: 13, color: "#c9b48a" },
  rankTrack: { height: 6, borderRadius: radii.pill, backgroundColor: "#3a2c17", overflow: "hidden" },
  rankFill: { height: 6, borderRadius: radii.pill, backgroundColor: "#e0a52a" },
  rankHint: { ...typography.caption, color: "#c9b48a" },
  play: { alignSelf: "stretch" },
  overCard: { alignItems: "center", paddingVertical: spacing.xl, marginBottom: spacing.lg },
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
