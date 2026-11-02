import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useWordProgress } from "../../context/WordProgressContext";
import { useVerbBank } from "../../hooks/useVerbBank";
import { supabase } from "../../lib/supabaseClient";
import { REVIEW_DAYS, applyAnswer, dueQueue, reviewSummary, startOfDay, stateOf } from "../../lib/verbQuiz";
import { ScreenContainer, Button } from "../../components/ui";
import { STATE_COLORS, scriptFont, shared } from "../../components/verbQuiz/shared";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

const DAY = 24 * 3600 * 1000;
const STATE_LABEL = { new: "New", learning: "Learning", shaky: "Missed last time", known: "Known" };

function whenLabel(time, now = Date.now()) {
  if (time == null) return "—";
  if (time <= now) return "today";
  const days = Math.round((startOfDay(time) - startOfDay(now)) / DAY);
  if (days <= 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  return new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Words that aren't verbs (saved from the Dictionary) aren't in the verb bank,
// so their text is looked up by id.
function useWordTexts(ids, bank) {
  const [texts, setTexts] = useState({});
  const missing = useMemo(
    () => (bank ? ids.filter((id) => !bank.byId[id] && !(id in texts)) : []),
    [ids, bank, texts]
  );
  useEffect(() => {
    if (!missing.length) return;
    let cancelled = false;
    supabase
      .from("words")
      .select("word_id, word")
      .in("word_id", missing.slice(0, 500))
      .then(({ data }) => {
        if (cancelled) return;
        const found = Object.fromEntries((data || []).map((w) => [w.word_id, w.word.trim()]));
        setTexts((current) => ({ ...current, ...Object.fromEntries(missing.map((id) => [id, found[id] ?? null])) }));
      });
    return () => {
      cancelled = true;
    };
  }, [missing]);
  return (id) => bank?.byId[id]?.word ?? texts[id] ?? null;
}

function Card({ word, onAnswer, stat }) {
  const [shown, setShown] = useState(false);
  const [translations, setTranslations] = useState(null);
  const [examples, setExamples] = useState([]);
  const [languageNames, setLanguageNames] = useState({});

  useEffect(() => {
    supabase
      .from("languages")
      .select("*")
      .then(({ data }) => setLanguageNames(Object.fromEntries((data || []).map((l) => [l.language_code, l.language_name]))));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setShown(false);
    setTranslations(null);
    setExamples([]);
    (async () => {
      const { data } = await supabase.rpc("get_translations", { search_word: word, language: "gz" });
      if (cancelled) return;
      setTranslations(data || []);
      if (data?.length) {
        const { data: sewasew } = await supabase
          .from("sewasew")
          .select("sewasew_id, sewasew_text")
          .in("word_id", [...new Set(data.map((t) => t.word_id))]);
        if (!cancelled) setExamples(sewasew || []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [word]);

  const grouped = Object.entries(
    (translations || []).reduce((acc, t) => {
      (acc[t.target_language] = acc[t.target_language] || []).push(t.translated_word);
      return acc;
    }, {})
  );

  // What each answer would do to the next review, so the choice is concrete.
  const ifRight = whenLabel(applyAnswer(stat, true).due);
  const ifWrong = whenLabel(applyAnswer(stat, false).due);

  return (
    <View style={[shared.card, styles.card]}>
      <Text style={styles.cardWord}>{word}</Text>
      {!shown ? (
        <>
          <Text style={shared.hint}>Say what it means, then check.</Text>
          <Button onPress={() => setShown(true)} style={styles.wide}>
            Show answer
          </Button>
        </>
      ) : translations == null ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <View style={styles.answer}>
            {grouped.length ? (
              grouped.map(([code, words]) => (
                <Text key={code} style={styles.answerLine}>
                  <Text style={styles.answerLang}>{languageNames[code] || code}  </Text>
                  <Text style={scriptFont(words[0])}>{words.join(", ")}</Text>
                </Text>
              ))
            ) : (
              <Text style={shared.hint}>No translations in the dictionary yet.</Text>
            )}
            {examples.slice(0, 2).map((e) => (
              <Text key={e.sewasew_id} style={styles.example}>
                {e.sewasew_text}
              </Text>
            ))}
          </View>
          <View style={styles.answerButtons}>
            <Pressable style={[styles.choice, styles.choiceWrong]} onPress={() => onAnswer(false)}>
              <Text style={[styles.choiceTitle, { color: colors.accentDark }]}>Didn't know</Text>
              <Text style={styles.choiceSub}>again {ifWrong}</Text>
            </Pressable>
            <Pressable style={[styles.choice, styles.choiceRight]} onPress={() => onAnswer(true)}>
              <Text style={[styles.choiceTitle, { color: colors.success }]}>Got it</Text>
              <Text style={styles.choiceSub}>next {ifRight}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

// ክለሳ: the daily review. Whatever is due today, from the games, ግሲ ፈተና and
// words saved by hand, as recall cards; every answer moves the same record.
export default function Review() {
  const progress = useWordProgress();
  const { bank } = useVerbBank();
  const [session, setSession] = useState(null); // { queue, index, right }
  const [done, setDone] = useState(null);

  const { stats } = progress;
  const summary = reviewSummary(stats);
  const savedIds = useMemo(
    () =>
      Object.entries(stats)
        .filter(([, s]) => s?.saved)
        .sort(([, a], [, b]) => (a.due ?? 0) - (b.due ?? 0))
        .map(([id]) => Number(id)),
    [stats]
  );
  const queueNow = useMemo(() => dueQueue(stats), [stats]);
  const textOf = useWordTexts(useMemo(() => [...new Set([...savedIds, ...queueNow])], [savedIds, queueNow]), bank);

  const start = () => {
    setDone(null);
    setSession({ queue: queueNow.filter((id) => textOf(id)), index: 0, right: 0 });
  };

  const answer = (correct) => {
    const id = session.queue[session.index];
    progress.recordAnswer(id, correct);
    const next = { ...session, index: session.index + 1, right: session.right + (correct ? 1 : 0) };
    if (next.index >= next.queue.length) {
      progress.flush();
      setSession(null);
      setDone({ total: next.queue.length, right: next.right });
    } else {
      setSession(next);
    }
  };

  if (!progress.ready || !bank) {
    return (
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (session) {
    const id = session.queue[session.index];
    return (
      <ScreenContainer scroll>
        <View style={styles.sessionTop}>
          <Text style={styles.counter}>
            {session.index + 1} of {session.queue.length}
          </Text>
          <Pressable onPress={() => setSession(null)} hitSlop={8}>
            <Text style={styles.link}>Stop</Text>
          </Pressable>
        </View>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${(session.index / session.queue.length) * 100}%` }]} />
        </View>
        <Card key={id} word={textOf(id)} stat={stats[id]} onAnswer={answer} />
      </ScreenContainer>
    );
  }

  const nextDue = Object.values(stats)
    .filter((s) => s && (s.saved || s.seen > 0) && s.due != null && s.due > Date.now())
    .reduce((min, s) => Math.min(min, s.due), Infinity);

  return (
    <ScreenContainer scroll>

      <View style={[shared.card, styles.hero]}>
        {done ? (
          <Text style={styles.doneLine}>
            Reviewed {done.total} · {done.right} got it · {done.total - done.right} back tomorrow
          </Text>
        ) : null}
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroNumber}>{summary.due}</Text>
            <Text style={styles.heroLabel}>due today</Text>
          </View>
          <View>
            <Text style={[styles.heroNumber, styles.heroSmall]}>{summary.week}</Text>
            <Text style={styles.heroLabel}>coming this week</Text>
          </View>
          <View>
            <Text style={[styles.heroNumber, styles.heroSmall]}>{summary.saved}</Text>
            <Text style={styles.heroLabel}>saved by you</Text>
          </View>
        </View>
        {summary.due ? (
          <Button onPress={start} style={styles.wide}>
            {`Review ${Math.min(summary.due, queueNow.length)}${summary.due > queueNow.length ? ` of ${summary.due}` : ""}`}
          </Button>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.caughtUp}>
              {Number.isFinite(nextDue) ? `All caught up. Next review ${whenLabel(nextDue)}.` : "Nothing to review yet."}
            </Text>
            <View style={shared.row}>
              <Button size="sm" onPress={() => router.push("/shooter")}>
                Play ቀስት
              </Button>
              <Button size="sm" variant="secondary" onPress={() => router.push("/verb-quiz")}>
                Open ግሲ ፈተና
              </Button>
            </View>
          </View>
        )}
        <Text style={shared.muted}>
          Words come here from ቀስት, ግሲ ፈተና and anything you save from the Dictionary or ግሲ. Right answers push a word
          further off ({REVIEW_DAYS.slice(1).join(", ")} days); a miss brings it back tomorrow.
          {progress.mode === "account" ? "" : " Kept on this device until you sign in."}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>SAVED BY YOU</Text>
      {savedIds.length ? (
        <View style={styles.list}>
          {savedIds.map((id) => {
            const s = stats[id];
            const state = stateOf(s);
            return (
              <View key={id} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: STATE_COLORS[state] }]} />
                <Text style={styles.rowWord}>{textOf(id) ?? "…"}</Text>
                <Text style={styles.rowState}>{STATE_LABEL[state]}</Text>
                <Text style={styles.rowDue}>{whenLabel(s.due)}</Text>
                <Pressable onPress={() => progress.unsave(id)} hitSlop={8}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={shared.hint}>Save words from the Dictionary, ግሲ or after a game, and they'll be listed here.</Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, marginBottom: spacing.xl, ...shadows.card },
  heroRow: { flexDirection: "row", gap: spacing.xl, alignItems: "flex-end" },
  heroNumber: { fontFamily: fontFamily.latinBold, fontSize: 40, lineHeight: 46, color: colors.textPrimary },
  heroSmall: { fontSize: 24, lineHeight: 30, color: colors.textSecondary },
  heroLabel: { ...typography.caption, color: colors.textMuted },
  doneLine: { ...typography.bodySemiBold, color: colors.success },
  caughtUp: { ...typography.body, color: colors.textSecondary },
  wide: { alignSelf: "stretch" },
  sectionTitle: { ...typography.label, color: colors.textMuted, letterSpacing: 1, marginBottom: spacing.sm },
  list: { gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  rowWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 17, color: colors.textPrimary, flex: 1 },
  rowState: { ...typography.caption, color: colors.textSecondary, width: 110 },
  rowDue: { ...typography.caption, color: colors.textMuted, width: 70 },
  remove: { ...typography.caption, color: colors.accent },
  sessionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  counter: { ...typography.label, color: colors.textSecondary },
  link: { ...typography.label, color: colors.textMuted, textDecorationLine: "underline" },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.borderMuted, overflow: "hidden", marginBottom: spacing.lg },
  trackFill: { height: 6, backgroundColor: colors.primary },
  card: { alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl },
  cardWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 40, lineHeight: 56, color: colors.textPrimary },
  answer: { alignSelf: "stretch", gap: spacing.xs },
  answerLine: { fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  answerLang: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.textMuted },
  example: { ...typography.caption, fontFamily: fontFamily.ethiopicRegular, color: colors.textSecondary, marginTop: spacing.xs },
  answerButtons: { flexDirection: "row", gap: spacing.md, alignSelf: "stretch" },
  choice: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1 },
  choiceWrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  choiceRight: { borderColor: colors.success, backgroundColor: colors.successLight },
  choiceTitle: { ...typography.bodySemiBold },
  choiceSub: { ...typography.caption, color: colors.textSecondary },
});
