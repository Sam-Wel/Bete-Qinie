import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../ui";
import { Choices } from "../games/Choices";
import { ProgressBar } from "../games/GameFrame";
import { scriptFont, shared } from "../verbQuiz/shared";
import { LANGUAGES, LANGUAGE_LABEL, LEARN_RIGHT, buildQuestion, isLearning, skipKnown } from "../../lib/verbQuiz";
import { learnStep, requeue } from "../../lib/daily";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

// ዛሬ's learn session: meet each new word, then answer about it until it is
// learned (right LEARN_RIGHT times, both directions). A word is never asked
// straight after it was shown: MEET_GAP other cards come between. Easy
// questions first, look-alikes later. "I already know this" asks one hard
// question instead.
const MEET_GAP = 3;
export function LearnSession({ bank, lang, ids, progress, onDone }) {
  const [queue, setQueue] = useState(ids);
  const [met, setMet] = useState(() => new Set(ids.filter((id) => progress.stats[id]?.seen > 0)));
  const [card, setCard] = useState(null); // { id, mode: "meet" | "ask" | "check", question, chosen }
  const [tally, setTally] = useState({ right: 0, asked: 0, learned: 0, skipped: 0 });
  const startCount = ids.length;

  // The next card is drawn once per turn (not on every render, which would
  // reshuffle the question while the learner reads it).
  const upNext = useMemo(() => {
    const id = queue[0];
    if (id == null) return null;
    if (!met.has(id)) return { id, mode: "meet" };
    const { dir, near } = learnStep(progress.stats[id]);
    return { id, mode: "ask", question: buildQuestion(bank.byId[id], lang, dir, bank, Math.random, { near }), chosen: null };
  }, [queue, met]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = card ?? upNext;

  const advance = (nextQueue, learned = 0) => {
    const t = { ...tally, learned: tally.learned + learned };
    setTally(t);
    setQueue(nextQueue);
    setCard(null);
    if (!nextQueue.length) onDone(t);
  };

  if (!current) return null;
  const entry = bank.byId[current.id];
  const stat = progress.stats[current.id];
  const done = startCount - queue.length;

  const header = (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.top}>
        <Text style={styles.counter}>
          {current.mode === "meet"
            ? `New word · ${done} of ${startCount} learned`
            : `${done} of ${startCount} learned · ${LEARN_RIGHT - Math.min(LEARN_RIGHT, stat?.study?.right || 0)} more right for this one`}
        </Text>
        <Pressable onPress={() => onDone(tally)} hitSlop={8}>
          <Text style={styles.link}>Stop</Text>
        </Pressable>
      </View>
      <ProgressBar value={startCount ? done / startCount : 0} />
    </View>
  );

  if (current.mode === "meet") {
    return (
      <View style={styles.wrap}>
        {header}
        <View style={[shared.card, styles.card]}>
          <Text style={styles.eyebrow}>NEW WORD</Text>
          <Text style={styles.word}>{entry.word}</Text>
          <Meanings entry={entry} lang={lang} />
          <Button
            style={styles.wide}
            onPress={() => {
              // A few other cards come first, so the quiz asks for recall, not the screen just read.
              setMet((m) => new Set(m).add(current.id));
              setQueue((q) => requeue(q, current.id, MEET_GAP));
              setCard(null);
            }}
          >
            Got it
          </Button>
          <Pressable
            onPress={() =>
              setCard({ id: current.id, mode: "check", chosen: null, question: buildQuestion(entry, lang, "toGeez", bank, Math.random, { near: true }) })
            }
            hitSlop={8}
          >
            <Text style={styles.link}>I already know this</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const q = current.question;
  const answered = current.chosen != null;
  const right = answered && current.chosen === q.answerIndex;

  const pick = (i) => {
    if (answered) return;
    const correct = i === q.answerIndex;
    setCard({ ...current, chosen: i });
    if (current.mode === "check") {
      if (correct) progress.updateWords((all) => ({ [current.id]: skipKnown(all[current.id]) }));
      setTally((t) => ({ ...t, skipped: t.skipped + (correct ? 1 : 0) }));
      return;
    }
    progress.recordAnswer(current.id, correct, { kind: `learn:${q.dir}` });
    setTally((t) => ({ ...t, asked: t.asked + 1, right: t.right + (correct ? 1 : 0) }));
  };

  const goOn = () => {
    const after = progress.stats[current.id];
    if (current.mode === "check") {
      if (right) return advance(queue.filter((x) => x !== current.id));
      setMet((m) => new Set(m).add(current.id)); // not known after all: learn it, after a few other cards
      setQueue((q) => requeue(q, current.id, MEET_GAP));
      return setCard(null);
    }
    if (!isLearning(after)) return advance(queue.filter((x) => x !== current.id), 1);
    advance(requeue(queue, current.id));
  };

  return (
    <View style={styles.wrap}>
      {header}
      <View style={[shared.card, styles.card]}>
        <Text style={styles.eyebrow}>
          {current.mode === "check" ? "PROVE IT: WHICH VERB MEANS" : q.dir === "toGeez" ? `WHICH VERB MEANS (${LANGUAGE_LABEL[lang]})` : "WHAT DOES IT MEAN?"}
        </Text>
        <Text style={q.dir === "toGeez" ? [styles.prompt, scriptFont(q.prompt)] : styles.word}>{q.prompt}</Text>
        <View style={styles.wide}>
          <Choices options={q.options} answerIndex={q.answerIndex} chosen={current.chosen} onPick={pick} geez={q.dir === "toGeez"} />
        </View>
        {answered ? (
          <View style={[styles.feedback, { gap: spacing.sm }]}>
            <Text style={[styles.verdict, { color: right ? colors.success : colors.accentDark }]}>
              {current.mode === "check"
                ? right
                  ? "You know it. It moves straight to a 3-week review, and a new word takes its place."
                  : "Not quite, so let's learn it."
                : right
                  ? isLearning(progress.stats[current.id])
                    ? "Right."
                    : "Learned! It comes back tomorrow in ክለሳ."
                  : "Not this time. It will come back in a moment."}
            </Text>
            <Text style={styles.answerWord}>{entry.word}</Text>
            <Meanings entry={entry} lang={lang} />
            <Button style={styles.wide} onPress={goOn}>
              Next
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Meanings({ entry, lang }) {
  const order = useMemo(() => [lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== lang)], [lang]);
  return (
    <View style={styles.meanings}>
      {order
        .filter((code) => entry.tr[code]?.length)
        .map((code) => (
          <Text key={code} style={styles.meaningLine}>
            <Text style={styles.meaningLang}>{LANGUAGE_LABEL[code]}  </Text>
            <Text style={scriptFont(entry.tr[code][0])}>{entry.tr[code].slice(0, 4).join(", ")}</Text>
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  counter: { ...typography.label, color: colors.textSecondary, flex: 1 },
  link: { ...typography.label, color: colors.textMuted, textDecorationLine: "underline" },
  card: { alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl },
  eyebrow: { fontFamily: fontFamily.ethiopicBold, fontSize: 12, letterSpacing: 1, color: colors.primaryDark, textAlign: "center" },
  word: { fontFamily: fontFamily.ethiopicBold, fontSize: 40, lineHeight: 56, color: colors.textPrimary },
  prompt: { fontSize: 22, lineHeight: 32, color: colors.textPrimary, textAlign: "center" },
  wide: { alignSelf: "stretch" },
  feedback: { alignSelf: "stretch", alignItems: "center" },
  verdict: { ...typography.bodySemiBold, textAlign: "center" },
  answerWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 24, lineHeight: 34, color: colors.textPrimary },
  meanings: { alignSelf: "stretch", gap: spacing.xs, paddingHorizontal: spacing.sm },
  meaningLine: { fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  meaningLang: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.textMuted },
});
