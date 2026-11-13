import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, ScreenContainer } from "../../components/ui";
import { FamilyGrid } from "../../components/verbQuiz/FamilyGrid";
import { Legend, STATE_COLORS, Section, StackedBar, scriptFont, shared } from "../../components/verbQuiz/shared";
import { useWordProgress } from "../../context/WordProgressContext";
import { useGameLanguage } from "../../hooks/useGameLanguage";
import { useVerbBank } from "../../hooks/useVerbBank";
import { studyStreak } from "../../lib/daily";
import { learnedPerWeek, reviewForecast, stageCounts } from "../../lib/progress";
import { hardestWords, isKnownState, stateOf } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const STAGES = [
  { key: "mastered", label: "Mastered" },
  { key: "known", label: "Known" },
  { key: "learning", label: "Learning" },
  { key: "shaky", label: "Missed last time" },
  { key: "new", label: "New" },
];

// Simple bars on a baseline, with a label under each; the tallest bar fills the height.
// With nothing to show yet, a short line says so instead of a row of empty bars.
function Bars({ items, label, highlightLast, empty }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.some((i) => i.count)) return <Text style={styles.empty}>{empty}</Text>;
  return (
    <View style={styles.bars}>
      {items.map((item, i) => (
        <View key={i} style={styles.barCol}>
          <Text style={styles.barValue}>{item.count || ""}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { height: item.count ? `${Math.max(4, (item.count / max) * 100)}%` : 0 },
                highlightLast && i === items.length - 1 && { backgroundColor: colors.primaryDark },
              ]}
            />
          </View>
          <Text style={styles.barLabel}>{label(item, i)}</Text>
        </View>
      ))}
    </View>
  );
}

const shortDate = (time) => new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const weekday = (time, i) => (i === 0 ? "Today" : new Date(time).toLocaleDateString(undefined, { weekday: "short" }));

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

  const { stats } = progress;
  const stages = stageCounts(bank, stats);
  const streak = studyStreak(stats);
  const weeks = learnedPerWeek(stats, 8);
  const forecast = reviewForecast(stats, 7);
  const hardest = hardestWords(bank, stats, 8);

  const practise = (ids) => ids.length && router.push({ pathname: "/verb-quiz", params: { words: ids.join(",") } });
  const practiseFamily = (familyId) =>
    practise(
      (bank.byFamily[familyId] || [])
        .filter((e) => !isKnownState(stateOf(stats[e.id])))
        .slice(0, 20)
        .map((e) => e.id)
    );

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <View style={[shared.card, styles.hero]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroNumber}>
              {stages.mastered + stages.known}
              <Text style={styles.heroOf}> / {stages.total}</Text>
            </Text>
            <Text style={styles.heroLabel}>verbs you know</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.heroSide}>{`${streak} day${streak === 1 ? "" : "s"}`}</Text>
            <Text style={styles.heroLabel}>study streak</Text>
          </View>
        </View>
        <StackedBar counts={stages} total={stages.total} height={8} />
        <View style={styles.stageRow}>
          {STAGES.map((s) => (
            <View key={s.key} style={styles.stage}>
              <View style={[styles.dot, { backgroundColor: STATE_COLORS[s.key] }]} />
              <Text style={styles.stageText}>
                <Text style={styles.stageCount}>{stages[s.key]}</Text> {s.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Section title="Words learned · last 8 weeks">
        <Bars items={weeks} label={(w) => shortDate(w.start)} highlightLast empty="Words you learn in ዛሬ will show here, week by week." />
      </Section>

      <Section title="Reviews coming up">
        <Bars items={forecast} label={(d, i) => weekday(d.day, i)} empty="No reviews this week yet. Words come here once you've learned them." />
      </Section>

      {hardest.length ? (
        <Section
          title="Words you miss most"
          right={
            <Button size="sm" variant="secondary" onPress={() => practise(hardest.map((h) => h.entry.id))}>
              Practise these
            </Button>
          }
        >
          <View>
            {hardest.map(({ entry, stat, wrong }) => {
              const meaning = (entry.tr[lang]?.length ? entry.tr[lang] : entry.tr.am.length ? entry.tr.am : entry.tr.en).join(", ");
              return (
                <View key={entry.id} style={styles.hardRow}>
                  <Text style={styles.hardWord}>{entry.word}</Text>
                  <Text style={[styles.hardMeaning, scriptFont(meaning)]} numberOfLines={1}>
                    {meaning}
                  </Text>
                  <Text style={styles.hardMiss}>
                    missed {wrong}× of {stat.seen}
                  </Text>
                </View>
              );
            })}
          </View>
        </Section>
      ) : null}

      <Section title="By ending" right={<Legend />}>
        <FamilyGrid bank={bank} stats={stats} mode="progress" onPress={practiseFamily} />
      </Section>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  hero: { gap: spacing.md },
  heroRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  heroNumber: { fontFamily: fontFamily.latinBold, fontSize: 44, lineHeight: 50, color: colors.textPrimary },
  heroOf: { fontFamily: fontFamily.latinSemiBold, fontSize: 22, color: colors.textSecondary },
  heroSide: { fontFamily: fontFamily.latinBold, fontSize: 24, lineHeight: 30, color: colors.primaryDark },
  heroLabel: { ...typography.caption, color: colors.textSecondary },
  stageRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stage: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stageText: { ...typography.caption, color: colors.textSecondary },
  stageCount: { fontFamily: fontFamily.latinSemiBold, color: colors.textPrimary },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, height: 130 },
  barCol: { flex: 1, alignItems: "center", gap: 4, height: "100%" },
  barValue: { ...typography.caption, fontSize: 11, color: colors.textSecondary, height: 14 },
  barTrack: { flex: 1, width: "100%", maxWidth: 28, justifyContent: "flex-end", borderBottomWidth: 2, borderBottomColor: colors.border },
  barFill: { width: "100%", backgroundColor: colors.primary, borderTopLeftRadius: radii.sm, borderTopRightRadius: radii.sm },
  empty: { ...typography.body, color: colors.textSecondary },
  barLabel: { ...typography.caption, fontSize: 11, color: colors.textMuted },
  hardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hardWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 17, color: colors.textPrimary, width: 90 },
  hardMeaning: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  hardMiss: { ...typography.caption, color: colors.accent },
});
