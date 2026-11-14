import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../ui";
import { Bars, shortDate } from "../charts/Bars";
import { FamilyGrid } from "../verbQuiz/FamilyGrid";
import { Legend, STATE_COLORS, Section, StackedBar, scriptFont, shared } from "../verbQuiz/shared";
import { studyStreak } from "../../lib/daily";
import { learnedPerWeek, reviewForecast, stageCounts } from "../../lib/progress";
import { hardestWords, isKnownState, stateOf } from "../../lib/verbQuiz";
import { colors, fontFamily, spacing, typography } from "../../theme";

const STAGES = [
  { key: "mastered", label: "Mastered" },
  { key: "known", label: "Known" },
  { key: "learning", label: "Learning" },
  { key: "shaky", label: "Missed last time" },
  { key: "new", label: "New" },
];

const weekday = (time, i) => (i === 0 ? "Today" : new Date(time).toLocaleDateString(undefined, { weekday: "short" }));

// How much ግዕዝ a learner knows, from every way of studying (ዛሬ, ክለሳ, games, quizzes).
// The learner's own እድገት page, and (readOnly, without the practice buttons) the
// admin's view of one learner.
export function ProgressView({ bank, stats, lang, readOnly = false }) {
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
    <View style={styles.page}>
      <View style={[shared.card, styles.hero]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroNumber}>
              {stages.mastered + stages.known}
              <Text style={styles.heroOf}> / {stages.total}</Text>
            </Text>
            <Text style={styles.heroLabel}>{readOnly ? "verbs known" : "verbs you know"}</Text>
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
        <Bars
          items={weeks}
          label={(w) => shortDate(w.start)}
          highlightLast
          empty={readOnly ? "No words learned in ዛሬ yet." : "Words you learn in ዛሬ will show here, week by week."}
        />
      </Section>

      <Section title="Reviews coming up">
        <Bars
          items={forecast}
          label={(d, i) => weekday(d.day, i)}
          empty={readOnly ? "No reviews this week." : "No reviews this week yet. Words come here once you've learned them."}
        />
      </Section>

      {hardest.length ? (
        <Section
          title={readOnly ? "Words missed most" : "Words you miss most"}
          right={
            readOnly ? null : (
              <Button size="sm" variant="secondary" onPress={() => practise(hardest.map((h) => h.entry.id))}>
                Practise these
              </Button>
            )
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
        <FamilyGrid bank={bank} stats={stats} mode="progress" onPress={readOnly ? () => {} : practiseFamily} />
      </Section>
    </View>
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
