import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer, Icon } from "../../components/ui";
import { CrossMenuIcon } from "../../components/ui/CrossMenuIcon";
import { useGameScores } from "../../hooks/useGameScores";
import { useBadges } from "../../hooks/useDueCount";
import { useWordProgress } from "../../context/WordProgressContext";
import { todayProgress } from "../../lib/daily";
import { useKalHistory } from "../../hooks/useKalHistory";
import { useLexicon } from "../../hooks/useLexicon";
import { dateKey, stats as kalStats } from "../../lib/kal";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

// Game art sits on the same dark tile in both themes, like the games themselves.
const ART_BG = "#17110a";
const ART_GOLD = "#e0a52a";

const ARCADE = [
  { route: "/shooter", type: "verb_shooter", title: "ቀስት", line: "Shoot the right verb in time" },
  { route: "/lightning", type: "verb_lightning_60", title: "Lightning Round", line: "Beat the clock, build combos", icon: "zap" },
  { route: "/boss-battle", type: "verb_boss", title: "Boss Battle", line: "Four bosses, rising difficulty", icon: "swords" },
];

const CALM = [
  { route: "/memory-match", type: "verb_memory", title: "Memory Match", line: "Pair each verb with its meaning", icon: "layers" },
  { route: "/guess-action", type: "verb_guess_action", title: "Guess the Action", line: "See it, name the verb", icon: "eye" },
  { route: "/unscramble", type: "verb_unscramble", title: "Unscramble", line: "Put the letters back in order", icon: "shuffle" },
  { route: "/verb-sort", type: "verb_sort", title: "Sorting", line: "Group verbs by what they mean", icon: "folders" },
];

// Needs the book's verb list (a lexicon release) in the database; hidden until then.
const HEADS = { route: "/heads", type: "verb_heads", title: "ርእስ", line: "Which head (ርእስ) does the verb follow?", icon: "network" };

function Art({ game, size = 52 }) {
  return (
    <View style={[styles.art, { width: size, height: size }]}>
      {game.icon ? (
        <Icon name={game.icon} size={size * 0.48} color={ART_GOLD} strokeWidth={2} />
      ) : (
        <CrossMenuIcon size={size * 0.62} color={ART_GOLD} ground={ART_BG} />
      )}
    </View>
  );
}

function GameTile({ game, basis }) {
  const scores = useGameScores(game.type);
  const best = scores.ready && scores.best != null ? `Best ${scores.best}` : null;
  return (
    <Pressable
      onPress={() => router.push(game.route)}
      accessibilityRole="link"
      style={({ hovered, pressed }) => [styles.tile, { flexBasis: basis }, (hovered || pressed) && styles.tileHover]}
    >
      <Art game={game} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={/[ሀ-፿]/.test(game.title) ? styles.tileTitleEthiopic : styles.tileTitle} numberOfLines={1}>
          {game.title}
        </Text>
        <Text style={styles.tileLine} numberOfLines={2}>
          {game.line}
        </Text>
        {best ? <Text style={styles.best}>{best}</Text> : null}
      </View>
    </Pressable>
  );
}

function KalPreview() {
  const marks = ["#7f9a5c", ART_GOLD, "#3a2c17", "#3a2c17", "#7f9a5c", ART_GOLD, "#7f9a5c", "#7f9a5c", "#7f9a5c"];
  return (
    <View style={[styles.art, styles.kalArt]}>
      {marks.map((c, i) => (
        <View key={i} style={[styles.kalCell, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

function Section({ label, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

// ጨዋታዎች: small games on the dictionary's Ge'ez verbs. Every answer counts
// toward the same word progress as ግሲ ፈተና and ክለሳ.
export default function Games() {
  const kal = useKalHistory();
  const { available: lexiconReady } = useLexicon();
  const calm = lexiconReady ? [...CALM, HEADS] : CALM;
  const badges = useBadges();
  const { stats } = useWordProgress();
  const today = todayProgress(stats);
  const kalDone = kal.ready && kal.history.some((h) => h.date === dateKey());
  const streak = kal.ready ? kalStats(kal.history).current : 0;
  const kalLine = kalDone
    ? `Today's done · ${streak}-day streak`
    : streak
      ? `Keep your ${streak}-day streak going`
      : "Guess today's three-letter verb";

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <View style={styles.topRow}>
        <Pressable
          onPress={() => router.push("/kal")}
          accessibilityRole="link"
          style={({ hovered, pressed }) => [styles.feature, (hovered || pressed) && styles.tileHover]}
        >
          <KalPreview />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.eyebrow}>TODAY'S PUZZLE</Text>
            <Text style={styles.featureTitle}>ቃል</Text>
            <Text style={styles.tileLine}>{kalLine}</Text>
          </View>
          <View style={styles.play}>
            <Text style={styles.playText}>{kalDone ? "Open" : "Play"}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/today")}
          accessibilityRole="link"
          style={({ hovered, pressed }) => [styles.side, (hovered || pressed) && styles.tileHover]}
        >
          <Text style={styles.eyebrow}>ዛሬ · TODAY'S WORDS</Text>
          <Text style={styles.dueCount}>
            {today.learned + today.skipped}/{today.total}
          </Text>
          <Text style={styles.tileLine}>
            {badges.due ? `${badges.due} due in ክለሳ · ` : ""}
            {today.total && !today.left ? "All learned ›" : "Learn them, then play ›"}
          </Text>
        </Pressable>
      </View>

      <Section label="ARCADE · FAST">
        {ARCADE.map((g) => (
          <GameTile key={g.route} game={g} basis={200} />
        ))}
      </Section>

      <Section label="CALM · NO TIMER">
        {calm.map((g) => (
          <GameTile key={g.route} game={g} basis={300} />
        ))}
      </Section>
    </ScreenContainer>
  );
}

const card = {
  borderRadius: radii.lg + 2,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  ...shadows.card,
};

const styles = StyleSheet.create({
  page: { gap: spacing.xl },
  topRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  feature: {
    ...card,
    flexGrow: 2,
    flexBasis: 360,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg + 2,
    borderColor: colors.primary,
  },
  side: { ...card, flexGrow: 1, flexBasis: 200, padding: spacing.lg + 2, gap: 2, justifyContent: "center" },
  tileHover: { borderColor: colors.primary, ...shadows.raised },
  eyebrow: { fontFamily: fontFamily.ethiopicBold, fontSize: 12, letterSpacing: 1, color: colors.primaryDark },
  featureTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 24, lineHeight: 32, color: colors.textPrimary },
  dueCount: { fontFamily: fontFamily.latinBold, fontSize: 32, lineHeight: 38, color: colors.textPrimary },
  play: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: radii.md, backgroundColor: colors.primary },
  playText: { ...typography.label, color: colors.onPrimary },
  section: { gap: spacing.sm + 2 },
  sectionLabel: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.textSecondary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: {
    ...card,
    flexGrow: 1,
    flexBasis: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md + 2,
    padding: spacing.lg,
  },
  art: { borderRadius: radii.lg, backgroundColor: ART_BG, alignItems: "center", justifyContent: "center" },
  kalArt: { width: 72, height: 72, flexDirection: "row", flexWrap: "wrap", gap: 4, padding: 10, alignContent: "center" },
  kalCell: { width: 14, height: 14, borderRadius: 4 },
  tileTitle: { fontFamily: fontFamily.latinBold, fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  tileTitleEthiopic: { fontFamily: fontFamily.ethiopicBold, fontSize: 18, lineHeight: 26, color: colors.textPrimary },
  tileLine: { ...typography.caption, color: colors.textSecondary },
  best: { ...typography.caption, fontFamily: fontFamily.latinSemiBold, color: colors.primaryDark, marginTop: 2 },
});
