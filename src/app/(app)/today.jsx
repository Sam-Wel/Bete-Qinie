import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer, Button, Select } from "../../components/ui";
import { LearnSession } from "../../components/today/LearnSession";
import { CleanupCard } from "../../components/today/CleanupCard";
import { ProgressBar } from "../../components/games/GameFrame";
import { Chip, STATE_COLORS, shared } from "../../components/verbQuiz/shared";
import { useToday } from "../../hooks/useToday";
import { DAILY_SIZES, BACKLOG_PAUSE, masteredCount, nextMilestone, reviewPlan, studyStreak, upcoming } from "../../lib/daily";
import { FAMILIES, LEARN_RIGHT, isLearning, startOfDay, stateOf } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

// Today's words shown before "+N more": about two rows on a phone.
const FOLDED_WORDS = 6;

const PLAY = [
  { route: "/memory-match", title: "Memory Match", line: "Easy start: pair each word with its meaning" },
  { route: "/lightning", title: "Lightning Round", line: "Quick recall against the clock" },
  { route: "/shooter", title: "ቀስት", line: "Meaning → ግዕዝ, look-alike options" },
];

function Step({ n, title, done, children }) {
  return (
    <View style={[shared.card, styles.step, done && styles.stepDone]}>
      <View style={styles.stepHead}>
        <View style={[styles.stepNumber, done && styles.stepNumberDone]}>
          <Text style={[styles.stepNumberText, done && { color: colors.onPrimary }]}>{done ? "✓" : n}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ዛሬ: one path for the day. ① clear what's due in ክለሳ, ② learn today's new
// words, ③ play games on them. Only today's words enter study, so ክለሳ grows
// by at most the daily size.
export default function Today() {
  const today = useToday();
  const { ready, error, bank, lang, plan, setPlan, info, counts, stats, progress } = today;
  const [learning, setLearning] = useState(null); // ids in the current session
  const [lastSession, setLastSession] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allWords, setAllWords] = useState(false);

  const todayIds = useMemo(
    () => (info ? info.ids.filter((id) => bank.byId[id]).sort((a, b) => a - b) : []),
    [info, bank]
  );
  const learnIds = todayIds.filter((id) => isLearning(stats[id]));

  if (error) {
    return (
      <ScreenContainer>
        <Text style={{ ...typography.body, color: colors.danger }}>{error}</Text>
      </ScreenContainer>
    );
  }
  if (!ready || !info) {
    return (
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (learning) {
    return (
      <ScreenContainer scroll>
        <LearnSession
          bank={bank}
          lang={lang}
          ids={learning}
          progress={progress}
          onDone={(tally) => {
            progress.flush();
            setLearning(null);
            setLastSession(tally);
          }}
        />
      </ScreenContainer>
    );
  }

  const due = info.due;
  const reviews = reviewPlan(stats);
  const streak = studyStreak(stats);
  const mastered = masteredCount(stats);
  const milestone = nextMilestone(mastered);
  const prevMilestone = [0, 25, 100, 250, 500, 1000, 2000].filter((m) => m <= mastered).pop();
  const ahead = upcoming(bank, stats, lang, plan, 5);
  const finished = counts.total > 0 && counts.left === 0;
  const familyItems = [{ label: "In order (ሀ first)", value: "auto" }, ...FAMILIES.map((f) => ({ label: `Words ending in ${f.label}`, value: f.id }))];

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <View style={[shared.card, styles.hero]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroNumber}>
              {counts.learned + counts.skipped}
              <Text style={styles.heroOf}> / {counts.total || plan.size}</Text>
            </Text>
            <Text style={styles.heroLabel}>{finished ? "learned today, all done 🎉" : "learned today"}</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroSmall}>{streak ? `🔥 ${streak}` : "0"}</Text>
            <Text style={styles.heroLabel}>day streak</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroSmall}>{mastered}</Text>
            <Text style={styles.heroLabel}>mastered</Text>
          </View>
        </View>
        <ProgressBar value={counts.total ? (counts.learned + counts.skipped) / counts.total : 0} />
        {lastSession ? (
          <Text style={styles.sessionLine}>
            Session: {lastSession.learned} learned{lastSession.skipped ? `, ${lastSession.skipped} you already knew` : ""} · {lastSession.right}/
            {lastSession.asked} right
          </Text>
        ) : null}
        <Pressable onPress={() => setSettingsOpen((o) => !o)} hitSlop={8}>
          <Text style={styles.link}>{settingsOpen ? "Hide settings" : `${plan.size} new words a day · change`}</Text>
        </Pressable>
        {settingsOpen ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>NEW WORDS A DAY</Text>
            <View style={shared.row}>
              {DAILY_SIZES.map((n) => (
                <Chip key={n} label={String(n)} active={plan.size === n} onPress={() => setPlan({ size: n })} />
              ))}
            </View>
            <Text style={styles.label}>LEARN FIRST</Text>
            <Select value={plan.family} onValueChange={(family) => setPlan({ family })} items={familyItems} />
            <Text style={shared.hint}>
              Changes apply now to the words you haven't started yet. Words you've started stay, and ones you don't
              finish carry over to tomorrow and count toward its number.
            </Text>
          </View>
        ) : null}
      </View>

      <CleanupCard progress={progress} />

      <Step n="1" title="ክለሳ: words due for review" done={reviews.left === 0}>
        {reviews.left ? (
          <>
            <Text style={shared.hint}>
              {reviews.later
                ? `Today: ${reviews.left} reviews · ${reviews.later} more on the coming days.`
                : `${reviews.left} due today.`}
            </Text>
            <Button style={styles.wide} onPress={() => router.push("/review")}>
              {`Review ${Math.min(reviews.left, 20)}${reviews.left > 20 ? ` of ${reviews.left}` : ""}`}
            </Button>
          </>
        ) : (
          <Text style={shared.hint}>
            {reviews.later ? `Today's reviews are done. ${reviews.later} more are waiting for the coming days.` : "Nothing due. Well kept."}
          </Text>
        )}
      </Step>

      <Step n="2" title={`Learn today's ${counts.total ? counts.total - counts.skipped : plan.size} words`} done={finished}>
        {info.paused && !counts.total ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={shared.hint}>
              New words are paused: {due} reviews are due (more than {BACKLOG_PAUSE}). Clear some ክለሳ first and new words
              come back on their own.
            </Text>
            <Button size="sm" variant="secondary" onPress={() => setPlan({ override: startOfDay(Date.now()) })}>
              Add today's words anyway
            </Button>
          </View>
        ) : !counts.total ? (
          <Text style={shared.hint}>You've studied every verb with a meaning in this language. 🎉</Text>
        ) : (
          <>
            {/* The main action first; the words fold to two rows so it stays in view. */}
            {learnIds.length ? (
              <Button style={styles.wide} onPress={() => setLearning(learnIds)}>
                {learnIds.length === counts.total ? "Start learning" : `Keep learning (${learnIds.length} left)`}
              </Button>
            ) : (
              <Text style={styles.doneLine}>All of today's words are learned. They come back tomorrow in ክለሳ.</Text>
            )}
            <View style={styles.words}>
              {(allWords ? todayIds : todayIds.slice(0, FOLDED_WORDS)).map((id) => (
                <WordChip key={id} entry={bank.byId[id]} stat={stats[id]} lang={lang} />
              ))}
              {todayIds.length > FOLDED_WORDS ? (
                <Pressable
                  onPress={() => setAllWords(!allWords)}
                  accessibilityRole="button"
                  style={({ hovered, pressed }) => [styles.moreChip, (hovered || pressed) && styles.moreChipOn]}
                >
                  <Text style={styles.moreChipText}>{allWords ? "Show fewer" : `+${todayIds.length - FOLDED_WORDS} more`}</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </Step>

      <Step n="3" title="Play with today's words">
        <Text style={shared.hint}>Games start on today's words; switch any game to Free play for anything else.</Text>
        <View style={styles.playList}>
          {PLAY.map((g) => (
            <Pressable
              key={g.route}
              onPress={() => {
                setPlan({ focus: "today" });
                router.push(g.route);
              }}
              style={({ hovered, pressed }) => [styles.playRow, (hovered || pressed) && styles.playHover]}
            >
              <Text style={/[ሀ-፿]/.test(g.title) ? styles.playTitleEthiopic : styles.playTitle}>{g.title}</Text>
              <Text style={styles.playLine}>{g.line} ›</Text>
            </Pressable>
          ))}
          {todayIds.length ? (
            <Pressable
              onPress={() => router.push({ pathname: "/verb-quiz", params: { words: todayIds.join(",") } })}
              style={({ hovered, pressed }) => [styles.playRow, (hovered || pressed) && styles.playHover]}
            >
              <Text style={styles.playTitleEthiopic}>ግሲ ፈተና</Text>
              <Text style={styles.playLine}>A quiz on just today's words ›</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push("/game")} hitSlop={8}>
            <Text style={styles.link}>All games</Text>
          </Pressable>
        </View>
      </Step>

      <View style={[shared.card, styles.goals]}>
        <Text style={styles.label}>MASTERED</Text>
        <Text style={shared.hint}>
          {!milestone
            ? `${mastered} mastered. Every milestone reached!`
            : mastered
              ? `${mastered} mastered, ${milestone - mastered} more to reach ${milestone}.`
              : `Master ${milestone} words to reach your first milestone.`}
        </Text>
        {milestone ? <ProgressBar value={(mastered - prevMilestone) / (milestone - prevMilestone)} color={colors.mastered} /> : null}
        <Pressable onPress={() => router.push("/progress")} accessibilityRole="link" hitSlop={6}>
          <Text style={styles.link}>See your progress ›</Text>
        </Pressable>
        {ahead.length ? (
          <>
            <Text style={[styles.label, { marginTop: spacing.sm }]}>COMING NEXT</Text>
            <View style={styles.words}>
              {ahead.map((e) => (
                <View key={e.id} style={[styles.wordChip, styles.wordChipAhead]}>
                  <Text style={styles.wordChipText}>{e.word}</Text>
                </View>
              ))}
              <Text style={shared.muted}>…</Text>
            </View>
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

// A word of today's set: its colour says where it is; dots count right answers.
function WordChip({ entry, stat, lang }) {
  const state = stateOf(stat);
  const learningNow = isLearning(stat);
  const right = stat?.study?.right || 0;
  const skipped = stat?.study?.skipped === startOfDay(Date.now());
  return (
    <View style={[styles.wordChip, !learningNow && styles.wordChipDone]} accessibilityLabel={`${entry.word}: ${entry.ask[lang]?.[0] ?? ""}`}>
      <Text style={styles.wordChipText}>{entry.word}</Text>
      {learningNow ? (
        <View style={styles.dots}>
          {Array.from({ length: LEARN_RIGHT }, (_, i) => (
            <View key={i} style={[styles.dot, i < right && { backgroundColor: STATE_COLORS.learning }]} />
          ))}
        </View>
      ) : (
        <Text style={styles.wordChipMark}>{skipped ? "known" : state === "shaky" ? "✓?" : "✓"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  hero: { gap: spacing.md, ...shadows.card },
  heroRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.lg },
  heroNumber: { fontFamily: fontFamily.latinBold, fontSize: 40, lineHeight: 46, color: colors.textPrimary },
  heroOf: { fontSize: 22, color: colors.textMuted },
  heroStat: { alignItems: "flex-end" },
  heroSmall: { fontFamily: fontFamily.latinBold, fontSize: 22, lineHeight: 28, color: colors.textSecondary },
  heroLabel: { ...typography.caption, color: colors.textMuted },
  sessionLine: { ...typography.bodySemiBold, color: colors.success },
  label: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },
  link: { ...typography.label, color: colors.primaryDark, textDecorationLine: "underline" },
  step: { gap: spacing.sm },
  stepDone: { opacity: 0.85 },
  stepHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepNumberText: { fontFamily: fontFamily.latinBold, fontSize: 14, color: colors.primaryDark },
  stepTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 17, lineHeight: 26, color: colors.textPrimary, flex: 1 },
  wide: { alignSelf: "stretch" },
  doneLine: { ...typography.bodySemiBold, color: colors.success },
  words: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  moreChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  moreChipOn: { backgroundColor: colors.surfaceMuted },
  moreChipText: { ...typography.label, color: colors.primaryDark },
  wordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  wordChipDone: { backgroundColor: colors.successLight, borderColor: colors.successLight },
  wordChipAhead: { backgroundColor: colors.surfaceMuted },
  wordChipText: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  wordChipMark: { ...typography.caption, color: colors.success },
  dots: { flexDirection: "row", gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderMuted },
  playList: { gap: spacing.xs },
  playRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  playHover: { borderColor: colors.primary },
  playTitle: { fontFamily: fontFamily.latinBold, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  playTitleEthiopic: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  playLine: { ...typography.caption, color: colors.textSecondary },
  goals: { gap: spacing.sm },
});
