import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { Button } from "../../components/ui";
import { DifficultyPicker, GameFrame, LanguagePicker, ProgressBar, StartCard } from "../../components/games/GameFrame";
import { Choices } from "../../components/games/Choices";
import { GameResults } from "../../components/games/GameResults";
import { Meanings } from "../../components/verbQuiz/QuizPlay";
import { shared } from "../../components/verbQuiz/shared";
import { useVerbGame } from "../../hooks/useVerbGame";
import { ACTION_SECONDS, actionQuestion, illustratedVerbs } from "../../lib/verbGames";
import { LANGUAGES, freshFirst } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const ROUND = 10;

// Guess the Action: a picture of an action and four ግዕዝ verbs; pick the one it shows.
export default function GuessAction() {
  const game = useVerbGame("verb_guess_action");
  const [difficulty, setDifficulty] = useState("easy");
  const [round, setRound] = useState(null); // { questions, index, chosen, right, streak, best, score }
  const [left, setLeft] = useState(null);
  const [result, setResult] = useState(null);
  const timer = useRef(null);

  const illustrated = game.ready ? illustratedVerbs(game.bank, game.lang) : [];
  const limit = ACTION_SECONDS[difficulty];

  useEffect(() => () => clearInterval(timer.current), []);

  const startTimer = () => {
    clearInterval(timer.current);
    if (!limit) return setLeft(null);
    setLeft(limit);
    timer.current = setInterval(() => setLeft((s) => (s == null ? s : s - 1)), 1000);
  };

  // A question left unanswered counts as a miss.
  useEffect(() => {
    if (left === 0 && round && round.chosen == null) answer(-1);
  }, [left]);

  const start = () => {
    // Verbs due for review first, then ones not seen yet, then the rest.
    const targets = freshFirst(illustrated, game.stats, (x) => x.entry.id).slice(0, Math.min(ROUND, illustrated.length));
    setRound({
      questions: targets.map((t) => actionQuestion(t, illustrated, difficulty)),
      index: 0,
      chosen: null,
      right: 0,
      streak: 0,
      best: 0,
      score: 0,
    });
    setResult(null);
    game.start();
    startTimer();
  };

  const answer = (i) => {
    clearInterval(timer.current);
    const r = round;
    if (!r || r.chosen != null) return;
    const q = r.questions[r.index];
    const correct = i === q.answerIndex;
    game.record(q.target.entry.id, correct);
    const streak = correct ? r.streak + 1 : 0;
    const points = correct ? 100 + (left ?? 0) * 5 + Math.min(streak - 1, 4) * 10 : 0;
    setRound({ ...r, chosen: i, right: r.right + (correct ? 1 : 0), streak, best: Math.max(r.best, streak), score: r.score + points });
  };

  const next = async () => {
    if (round.index + 1 < round.questions.length) {
      setRound({ ...round, index: round.index + 1, chosen: null });
      startTimer();
      return;
    }
    const res = { ...round, isBest: false };
    setResult(res);
    setRound(null);
    const isBest = await game.finish({ score: round.score, rounds: round.questions.length, state: { difficulty, right: round.right } });
    setResult({ ...res, isBest });
  };

  let body;
  if (result) {
    body = (
      <GameResults
        title="Round complete"
        score={result.score}
        isBest={result.isBest}
        stats={[
          { value: `${result.right}/${result.questions.length}`, label: "right", tone: colors.success },
          { value: result.best, label: "best streak" },
        ]}
        missedIds={game.missedIds()}
        bank={game.bank}
        lang={game.lang}
        signedIn={game.signedIn}
        onAgain={start}
      />
    );
  } else if (round) {
    const q = round.questions[round.index];
    const entry = q.target.entry;
    const correct = round.chosen === q.answerIndex;
    body = (
      <View style={styles.play}>
        <View style={styles.hud}>
          <Text style={styles.hudText}>
            {round.index + 1} of {round.questions.length} · score {round.score}
          </Text>
          {limit ? <Text style={[styles.hudText, left <= 3 && round.chosen == null && { color: colors.accent }]}>{left}s</Text> : null}
        </View>
        <ProgressBar value={(round.index + (round.chosen != null ? 1 : 0)) / round.questions.length} />

        <Animated.View key={round.index} entering={ZoomIn.duration(220)} style={[shared.card, styles.picture]}>
          <Text style={styles.emoji} accessibilityLabel={`Picture of the action ${q.target.meta.concept}`}>
            {q.target.meta.picture}
          </Text>
          <Text style={styles.ask}>Which ግዕዝ verb is this?</Text>
        </Animated.View>

        <Choices
          options={q.options.map((o) => o.entry.word)}
          answerIndex={q.answerIndex}
          chosen={round.chosen}
          onPick={answer}
          geez
        />

        {round.chosen != null ? (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.feedback, correct ? styles.feedbackRight : styles.feedbackWrong]}>
            <Text style={[styles.feedbackTitle, { color: correct ? colors.success : colors.accentDark }]}>
              {correct ? (round.streak > 1 ? `Right · ${round.streak} in a row` : "Right") : round.chosen === -1 ? "Time's up" : "Not quite"}
            </Text>
            <Text style={styles.feedbackWord}>
              {q.target.meta.picture} {entry.word}
            </Text>
            <Meanings entry={entry} langs={[game.lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== game.lang)]} />
            <Button size="sm" onPress={next} style={styles.next}>
              {round.index + 1 < round.questions.length ? "Next →" : "See results"}
            </Button>
          </Animated.View>
        ) : null}
      </View>
    );
  } else {
    body = (
      <StartCard
        emoji="🎭"
        lead="See an action, pick the ግዕዝ verb for it."
        rules={[
          `Easy: no clock · Medium: ${ACTION_SECONDS.medium}s · Hard: ${ACTION_SECONDS.hard}s and look-alike actions`,
          "Quick answers and streaks score more",
          `${illustrated.length} verbs have pictures so far`,
        ]}
        best={game.best}
        onStart={start}
        disabled={illustrated.length < 4}
        note={illustrated.length < 4 ? "Not enough pictured verbs have a meaning in this language yet." : null}
      >
        <LanguagePicker lang={game.lang} onChange={game.setLang} />
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      </StartCard>
    );
  }

  return (
    <GameFrame title="Guess the Action" game={game}>
      {body}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  play: { gap: spacing.md, maxWidth: 640, width: "100%", alignSelf: "center" },
  hud: { flexDirection: "row", justifyContent: "space-between" },
  hudText: { ...typography.label, color: colors.textSecondary },
  picture: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs, backgroundColor: "#17110a", borderColor: "#3a2c17" },
  emoji: { fontSize: 88, lineHeight: 110 },
  ask: { ...typography.label, color: "#c9b48a" },
  feedback: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.xs },
  feedbackRight: { borderColor: colors.success, backgroundColor: colors.successLight },
  feedbackWrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  feedbackTitle: { ...typography.label, textTransform: "uppercase", letterSpacing: 1 },
  feedbackWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 32, color: colors.textPrimary },
  next: { alignSelf: "flex-end", marginTop: spacing.sm },
});
