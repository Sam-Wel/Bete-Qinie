import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer, Icon } from "../../components/ui";
import { CrossMenuIcon } from "../../components/ui/CrossMenuIcon";
import { useGameScores } from "../../hooks/useGameScores";
import { useWordProgress } from "../../context/WordProgressContext";
import { reviewSummary } from "../../lib/verbQuiz";
import { useKalHistory } from "../../hooks/useKalHistory";
import { dateKey, stats as kalStats } from "../../lib/kal";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

function GameCard({ title, subtitle, art, meta, soon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={soon}
      style={({ hovered }) => [styles.card, hovered && !soon && styles.cardHover, soon && styles.cardSoon]}
    >
      <View style={styles.art}>{art}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {soon ? <Text style={styles.soon}>coming soon</Text> : null}
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {soon ? null : <Icon name="chevron-forward" size={20} color={colors.primary} />}
    </Pressable>
  );
}

// ጨዋታዎች: small games that all play on the dictionary's Ge'ez verbs, and all
// count toward the same word progress as ግሲ ፈተና.
export default function Games() {
  const shooter = useGameScores("verb_shooter");
  const { stats, ready } = useWordProgress();
  const kal = useKalHistory();
  const due = ready ? reviewSummary(stats).due : 0;

  return (
    <ScreenContainer scroll>
      <Text style={styles.lead}>
        Games on the Ge'ez verbs of the dictionary. Every answer counts toward your ግሲ ፈተና progress, so playing is
        studying.
      </Text>

      {due ? (
        <Pressable onPress={() => router.push("/review")} style={styles.due}>
          <Text style={styles.dueText}>
            {due} word{due === 1 ? "" : "s"} due for review in ክለሳ ›
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.list}>
        <GameCard
          title="ቀስት"
          subtitle="Shoot the verb that means what's under the bow, before it reaches you."
          meta={shooter.ready && shooter.best != null ? `Your best: ${shooter.best}` : "Arcade · meanings in ትግርኛ, አማርኛ or English"}
          art={<CrossMenuIcon size={44} color="#e0a52a" ground="#17110a" />}
          onPress={() => router.push("/shooter")}
        />
        <GameCard
          title="ቃል"
          subtitle="A daily three-letter verb to guess, with hints that know the fidel: right letter, wrong vowel order."
          meta={
            kal.ready
              ? kal.history.some((h) => h.date === dateKey())
                ? `Today's done · streak ${kalStats(kal.history).current}`
                : kalStats(kal.history).current
                  ? `Keep your ${kalStats(kal.history).current}-day streak going`
                  : "New puzzle every day"
              : null
          }
          art={<Text style={styles.artLetters}>ቃል</Text>}
          onPress={() => router.push("/kal")}
        />
        {[
          ["Verb Memory Match", "Turn cards to pair each ግዕዝ verb with its meaning.", "🃏", "/memory-match"],
          ["Guess the Action", "See an action, pick the ግዕዝ verb for it.", "🎭", "/guess-action"],
          ["Unscramble the Verb", "Put a verb's shuffled letters back in order.", "🔀", "/unscramble"],
          ["Verb Lightning Round", "Meanings against the clock, with combo multipliers.", "⚡", "/lightning"],
          ["Verb Sorting Challenge", "Sort verbs into groups: movement, speech, feelings and more.", "🗂️", "/verb-sort"],
          ["Verb Boss Battle", "Answer to strike four bosses in turn; miss and they strike back.", "🐉", "/boss-battle"],
        ].map(([title, subtitle, emoji, route]) => (
          <GameCard
            key={route}
            title={title}
            subtitle={subtitle}
            art={<Text style={styles.artEmoji}>{emoji}</Text>}
            onPress={() => router.push(route)}
          />
        ))}
        <GameCard
          title="ግሲ ፈተና"
          subtitle="The quiz behind it all: pick groups, review your misses, see what you know."
          art={<Icon name="quiz-outline" size={30} color="#e0a52a" />}
          onPress={() => router.push("/verb-quiz")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lead: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  list: { gap: spacing.md },
  due: {
    alignSelf: "flex-start",
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
  },
  dueText: { ...typography.label, color: colors.primaryDark },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  cardHover: { borderColor: colors.primary, ...shadows.raised },
  cardSoon: { opacity: 0.6 },
  art: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: "#17110a",
    alignItems: "center",
    justifyContent: "center",
  },
  artEmoji: { fontSize: 30 },
  artLetters: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, color: "#e0a52a" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, lineHeight: 28, color: colors.textPrimary },
  soon: {
    ...typography.caption,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  meta: { ...typography.label, color: colors.primary, marginTop: 2 },
});
