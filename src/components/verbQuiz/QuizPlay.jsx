import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Button } from "../ui";
import { useWordProgress } from "../../context/WordProgressContext";
import { FAMILY_BY_ID, LANGUAGE_LABEL, buildQuestion } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { scriptFont, scriptFontBold, shared } from "./shared";

const AUTO_NEXT_MS = 900;
// From this width the four options sit two by two, so the feedback stays in view.
const GRID_AT = 640;

export function Meanings({ entry, langs, style }) {
  return (
    <View style={[styles.meanings, style]}>
      {langs
        .filter((code) => entry.tr[code]?.length)
        .map((code) => (
          <Text key={code} style={styles.meaningLine}>
            <Text style={styles.meaningLang}>{LANGUAGE_LABEL[code]} </Text>
            <Text style={scriptFont(entry.tr[code][0])}>{entry.tr[code].join(", ")}</Text>
          </Text>
        ))}
    </View>
  );
}

// "Save to ክለሳ" by word id, into the shared word progress (guests too, on the device).
export function useSavedToReview() {
  const { stats, save } = useWordProgress();
  return { saved: (wordId) => Boolean(stats[wordId]?.saved), save };
}

export function QuizPlay({ quiz, bank, onChange, onFirstAnswer, onFinish, onQuit }) {
  const timer = useRef(null);
  const grid = useWindowDimensions().width >= GRID_AT;
  const review = useSavedToReview();
  const { lang, alsoShow } = quiz.settings;

  const inRetry = Boolean(quiz.retry);
  const round = quiz.retry ?? quiz;
  const question = round.questions[round.index];
  const answer = round.answers[round.index];
  const entry = bank.byId[question.wordId];
  const chosen = answer?.chosen ?? null;
  const correctSoFar = quiz.answers.filter((a) => a.correct).length;
  const isLast = round.index + 1 >= round.questions.length;

  const advance = () => {
    clearTimeout(timer.current);
    if (round.index + 1 < round.questions.length) {
      const nextRound = { ...round, index: round.index + 1 };
      onChange(inRetry ? { ...quiz, retry: nextRound } : { ...quiz, ...nextRound });
      return;
    }
    const missed = quiz.answers.filter((a) => !a.correct);
    if (!inRetry && missed.length) {
      // Every miss comes back once, with fresh options, before the quiz ends.
      const questions = missed.map((a) => {
        const original = quiz.questions.find((q) => q.wordId === a.wordId);
        return buildQuestion(bank.byId[a.wordId], lang, original.dir, bank);
      });
      onChange({ ...quiz, retry: { questions, index: 0, answers: [] } });
      return;
    }
    onFinish(quiz);
  };

  const choose = (index) => {
    if (chosen != null || index >= question.options.length) return;
    const correct = index === question.answerIndex;
    const record = { wordId: question.wordId, family: question.family, chosen: index, correct };
    const nextRound = { ...round, answers: [...round.answers, record] };
    if (!inRetry) onFirstAnswer(question.wordId, correct);
    onChange(inRetry ? { ...quiz, retry: nextRound } : { ...quiz, ...nextRound });
  };

  // A right answer moves on by itself; a wrong one waits so it can be read.
  useEffect(() => {
    if (answer?.correct) timer.current = setTimeout(advance, AUTO_NEXT_MS);
    return () => clearTimeout(timer.current);
  });

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const onKey = (event) => {
      if (event.target?.tagName === "INPUT" || event.target?.tagName === "TEXTAREA") return;
      if (/^[1-4]$/.test(event.key)) choose(Number(event.key) - 1);
      else if ((event.key === "Enter" || event.key === "ArrowRight") && chosen != null) advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toGeez = question.dir === "toGeez";
  // What the wrong pick actually is: the verb that word or meaning belongs to.
  const picked = chosen != null && !answer.correct ? question.options[chosen] : null;
  const owns = (e) => (toGeez ? e.word === picked : e.tr[lang].includes(picked));
  const chosenEntry = picked
    ? bank.byFamily[question.family].find(owns) ?? bank.words.find(owns) ?? null
    : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.counter}>
          {inRetry ? "Second chance · " : ""}
          {round.index + 1} of {round.questions.length}
        </Text>
        <View style={shared.row}>
          <Text style={styles.family}>{FAMILY_BY_ID[question.family]?.label}</Text>
          <Text style={styles.score}>✓ {correctSoFar}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.trackFill,
            inRetry && { backgroundColor: colors.accent },
            { width: `${((round.index + (chosen != null ? 1 : 0)) / round.questions.length) * 100}%` },
          ]}
        />
      </View>

      {inRetry && round.index === 0 && chosen == null ? (
        <Text style={styles.retryNote}>You missed these. One more try each; this round doesn't change your score.</Text>
      ) : null}

      <Animated.View key={`${inRetry}-${round.index}`} entering={FadeIn.duration(220)} style={[shared.card, styles.promptCard]}>
        <Text style={styles.ask}>
          {toGeez ? "Which ግዕዝ verb means" : `What does it mean in ${LANGUAGE_LABEL[lang]}?`}
        </Text>
        <Text style={[toGeez ? styles.promptMeaning : styles.promptGeez, scriptFontBold(question.prompt)]}>
          {question.prompt}
        </Text>
      </Animated.View>

      <View style={[styles.options, grid && styles.optionsGrid]}>
        {question.options.map((option, index) => {
          const isAnswer = index === question.answerIndex;
          const picked = index === chosen;
          const state = chosen == null ? null : isAnswer ? "right" : picked ? "wrong" : "dim";
          return (
            <Pressable
              key={index}
              onPress={() => choose(index)}
              disabled={chosen != null}
              style={({ hovered }) => [
                styles.option,
                grid && styles.optionHalf,
                hovered && chosen == null && styles.optionHover,
                state === "right" && styles.optionRight,
                state === "wrong" && styles.optionWrong,
                state === "dim" && styles.optionDim,
              ]}
            >
              <View style={[styles.key, state === "right" && styles.keyRight, state === "wrong" && styles.keyWrong]}>
                <Text style={[styles.keyText, state && state !== "dim" && styles.keyTextOn]}>
                  {state === "right" ? "✓" : state === "wrong" ? "✕" : index + 1}
                </Text>
              </View>
              <Text style={[styles.optionText, scriptFont(option), toGeez && styles.optionGeez]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {chosen != null ? (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.feedback, answer.correct ? styles.feedbackRight : styles.feedbackWrong]}>
          <Text style={[styles.feedbackTitle, { color: answer.correct ? colors.success : colors.accentDark }]}>
            {answer.correct ? "Right" : "Not quite"}
          </Text>
          <Text style={styles.feedbackWord}>
            <Text style={scriptFontBold(entry.word)}>{entry.word}</Text>
          </Text>
          <Meanings entry={entry} langs={[lang, ...alsoShow]} />
          {chosenEntry ? (
            <View style={styles.youChose}>
              <Text style={shared.hint}>
                {toGeez ? "You chose " : "That one is "}
                <Text style={scriptFontBold(chosenEntry.word)}>{chosenEntry.word}</Text>
                {toGeez ? ", which means:" : ":"}
              </Text>
              <Meanings entry={chosenEntry} langs={[lang]} />
            </View>
          ) : null}

          <View style={styles.feedbackActions}>
            <Button variant="ghost" size="sm" disabled={review.saved(entry.id)} onPress={() => review.save([entry.id])}>
              {review.saved(entry.id) ? "In ክለሳ ✓" : "Save to ክለሳ"}
            </Button>
            <Button size="sm" onPress={advance}>
              {isLast && (inRetry || quiz.answers.every((a) => a.correct)) ? "See results" : "Next →"}
            </Button>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.bottomRow}>
        <Pressable onPress={onQuit} hitSlop={8}>
          <Text style={styles.quit}>Pause and leave</Text>
        </Pressable>
        {Platform.OS === "web" ? <Text style={shared.muted}>Keys 1–4 to answer · Enter for next</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, maxWidth: 620, width: "100%" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  counter: { ...typography.label, color: colors.textSecondary },
  family: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 13,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  score: { ...typography.label, color: colors.success },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.borderMuted, overflow: "hidden" },
  trackFill: { height: 6, backgroundColor: colors.primary, borderRadius: radii.pill },
  retryNote: { ...typography.caption, color: colors.accentDark },
  promptCard: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs },
  ask: { ...typography.label, color: colors.textMuted },
  promptGeez: { fontSize: 40, lineHeight: 56, color: colors.textPrimary, textAlign: "center" },
  promptMeaning: { fontSize: 24, lineHeight: 34, color: colors.textPrimary, textAlign: "center" },
  options: { gap: spacing.sm },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap" },
  optionHalf: { width: "49%", flexGrow: 1, flexBasis: "45%" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionHover: { borderColor: colors.primary },
  optionRight: { borderColor: colors.success, backgroundColor: colors.successLight },
  optionWrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  optionDim: { opacity: 0.55 },
  key: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  keyRight: { backgroundColor: colors.success },
  keyWrong: { backgroundColor: colors.accent },
  keyText: { ...typography.label, color: colors.textSecondary },
  keyTextOn: { color: colors.white },
  optionText: { fontSize: 17, lineHeight: 26, color: colors.textPrimary, flex: 1 },
  optionGeez: { fontSize: 20, lineHeight: 30 },
  feedback: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.xs },
  feedbackRight: { borderColor: colors.success, backgroundColor: colors.successLight },
  feedbackWrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  feedbackTitle: { ...typography.label, textTransform: "uppercase", letterSpacing: 1 },
  feedbackWord: { fontSize: 22, lineHeight: 32, color: colors.textPrimary },
  youChose: { marginTop: spacing.sm, gap: 2 },
  feedbackActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  meanings: { gap: 2 },
  meaningLine: { fontSize: 15, lineHeight: 23, color: colors.textPrimary },
  meaningLang: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.textMuted },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  quit: { ...typography.label, color: colors.textMuted, textDecorationLine: "underline" },
});
