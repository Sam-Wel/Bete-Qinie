import { StyleSheet, Text, View } from "react-native";
import { Button, EmptyState } from "../ui";
import { LANGUAGE_LABEL, hardestWords, overview } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { AccuracyChart } from "./AccuracyChart";
import { FamilyGrid } from "./FamilyGrid";
import { Legend, Section, percent, scriptFont, shared } from "./shared";

const CHART_RUNS = 30;

function Stat({ value, label, accent }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: colors.primaryDark }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function QuizProgress({ bank, stats, runs, lang, onPractiseFamily, onPractiseWords }) {
  const o = overview(bank, stats, runs);
  const recent = runs.slice(-CHART_RUNS);
  const hardest = hardestWords(bank, stats);

  if (!runs.length && !Object.keys(stats).length) {
    return (
      <EmptyState
        icon="stats-chart-outline"
        message="No quizzes yet. Take one from Practice and your progress will show up here."
      />
    );
  }

  return (
    <View>
      <View style={[shared.card, styles.stats]}>
        <Stat value={o.streak ? `${o.streak} day${o.streak === 1 ? "" : "s"}` : "—"} label="Streak" accent />
        <Stat value={o.quizzes} label="Quizzes" />
        <Stat value={o.questions} label="Answers" />
        <Stat value={percent(o.accuracy)} label="First-try accuracy" />
        <Stat value={`${o.seen} / ${o.total}`} label="Words seen" />
        <Stat value={o.known} label="Words known" />
      </View>

      {recent.length ? (
        <Section title={`Accuracy · last ${recent.length} quiz${recent.length === 1 ? "" : "zes"}`}>
          <AccuracyChart runs={recent} />
          <View style={styles.history}>
            {[...runs].reverse().slice(0, 5).map((run, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyDate}>
                  {new Date(run.at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </Text>
                <Text style={styles.historyScore}>
                  {run.correct} / {run.total}
                </Text>
                <Text style={styles.historyPct}>{percent(run.total ? run.correct / run.total : null)}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="By group" right={<Legend />}>
        <FamilyGrid bank={bank} stats={stats} mode="progress" onPress={onPractiseFamily} />
        <Text style={shared.muted}>
          Tiles show words known out of the group, with first-try accuracy underneath. Tap one to practise it. Known
          means right three times in a row.
        </Text>
      </Section>

      {hardest.length ? (
        <Section
          title="Hardest words"
          right={
            <Button size="sm" variant="secondary" onPress={() => onPractiseWords(hardest.map((h) => h.entry.id))}>
              Practise these
            </Button>
          }
        >
          <View style={styles.hardList}>
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
          <Text style={shared.muted}>Meanings in {LANGUAGE_LABEL[lang]} where the dictionary has them.</Text>
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.lg, marginBottom: spacing.xl },
  stat: { minWidth: 110, flexGrow: 1, flexBasis: "30%", gap: 2 },
  statValue: { fontFamily: fontFamily.latinBold, fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textMuted },
  history: { marginTop: spacing.sm },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyDate: { ...typography.body, color: colors.textSecondary, flex: 1 },
  historyScore: { ...typography.bodySemiBold, color: colors.textPrimary, width: 80 },
  historyPct: { ...typography.body, color: colors.textSecondary, width: 50, textAlign: "right" },
  hardList: { gap: 2 },
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
