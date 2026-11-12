import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { Button } from "../../components/ui";
import { DifficultyPicker, FocusPicker, GameFrame, LanguagePicker, ProgressBar, StartCard } from "../../components/games/GameFrame";
import { Choices } from "../../components/games/Choices";
import { GameResults } from "../../components/games/GameResults";
import { Meanings } from "../../components/verbQuiz/QuizPlay";
import { shared } from "../../components/verbQuiz/shared";
import { useLexicon } from "../../hooks/useLexicon";
import { useVerbGame } from "../../hooks/useVerbGame";
import {
  HEAD_DIFFICULTIES,
  bookGloss,
  headItems,
  headPattern,
  headQuestion,
  isRightHead,
  linkToBank,
  pickBalanced,
} from "../../lib/lexicon";
import { LANGUAGES } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const ROUND = 10;
const BONUS = { easy: 0, medium: 25, hard: 50 };

// One head's pattern: ቀተለ · ይቀትል · ይቅትል · ቀቲል, each with its ርባታ name.
function Pattern({ lexicon, head }) {
  const slots = headPattern(lexicon, head);
  if (!slots.length) return null;
  return (
    <View style={styles.pattern}>
      {slots.map((s) => (
        <View key={s.slot} style={styles.patternCell}>
          <Text style={styles.patternForm}>{s.forms.join(" · ")}</Text>
          <Text style={styles.patternName}>{s.name}</Text>
        </View>
      ))}
    </View>
  );
}

// ርእስ: a verb as the book prints it; pick the head verb (አርእስት) whose ርባታ it
// follows. The heads come from the book's printed class marks (a lexicon "core"
// release). Practice only: answers don't change ዛሬ or ክለሳ, only the best score.
export default function Heads() {
  const game = useVerbGame("verb_heads");
  const { lexicon, release, available, loading } = useLexicon();
  const [difficulty, setDifficulty] = useState("easy");
  const [round, setRound] = useState(null); // { questions, index, chosen, right, streak, best, score, missed }
  const [result, setResult] = useState(null);

  const links = useMemo(() => (lexicon && game.bank ? linkToBank(lexicon, game.bank) : {}), [lexicon, game.bank]);
  const items = useMemo(() => (lexicon ? headItems(lexicon, links) : []), [lexicon, links]);
  const langs = [game.lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== game.lang)];

  const start = () => {
    const picked = pickBalanced(items, Math.min(ROUND, items.length), Math.random, game.focusIds);
    setRound({
      questions: picked.map((item) => headQuestion(item, difficulty)),
      index: 0,
      chosen: null,
      right: 0,
      streak: 0,
      best: 0,
      score: 0,
      missed: [],
    });
    setResult(null);
    game.start();
  };

  const answer = (i) => {
    const r = round;
    if (!r || r.chosen != null) return;
    const q = r.questions[r.index];
    const correct = isRightHead(q, i);
    const streak = correct ? r.streak + 1 : 0;
    const points = correct ? 100 + Math.min(streak - 1, 4) * 20 + BONUS[difficulty] : 0;
    setRound({
      ...r,
      chosen: i,
      right: r.right + (correct ? 1 : 0),
      streak,
      best: Math.max(r.best, streak),
      score: r.score + points,
      missed: correct ? r.missed : [...r.missed, q.item],
    });
  };

  const next = async () => {
    if (round.index + 1 < round.questions.length) {
      setRound({ ...round, index: round.index + 1, chosen: null });
      return;
    }
    const res = { ...round, isBest: false };
    setResult(res);
    setRound(null);
    const isBest = await game.finish({
      score: round.score,
      rounds: round.questions.length,
      state: { difficulty, right: round.right, release: release?.tag },
    });
    setResult({ ...res, isBest });
  };

  let body;
  if (loading) {
    body = <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
  } else if (result) {
    body = (
      <GameResults
        title="Round complete"
        score={result.score}
        isBest={result.isBest}
        stats={[
          { value: `${result.right}/${result.questions.length}`, label: "right", tone: colors.success },
          { value: result.best, label: "best streak" },
        ]}
        bank={game.bank}
        lang={game.lang}
        signedIn={game.signedIn}
        onAgain={start}
        progressNote="Practice only: ርእስ doesn't change ዛሬ or ክለሳ."
      >
        {result.missed.length ? (
          <View style={styles.missed}>
            <Text style={styles.missedTitle}>TO LOOK AT AGAIN</Text>
            {result.missed.map((item) => (
              <Text key={item.key} style={styles.missedLine}>
                <Text style={styles.missedForm}>{item.form}</Text>
                {"  →  "}
                <Text style={styles.missedHead}>{item.answers.join(" / ")}</Text>
                {item.mark ? <Text style={styles.mark}>{`  (${item.mark})`}</Text> : null}
              </Text>
            ))}
          </View>
        ) : null}
      </GameResults>
    );
  } else if (round) {
    const q = round.questions[round.index];
    const { item } = q;
    const answered = round.chosen != null;
    const correct = answered && isRightHead(q, round.chosen);
    const shown = correct ? round.chosen : q.answerIndex; // a spelling read two ways accepts either
    const gloss = item.entry ? null : bookGloss(item.word, game.lang === "ti" ? "ti" : "am");
    body = (
      <View style={styles.play}>
        <View style={styles.hud}>
          <Text style={styles.hudText}>
            {round.index + 1} of {round.questions.length} · score {round.score}
          </Text>
          <Text style={styles.hudText}>{HEAD_DIFFICULTIES.find((d) => d.key === difficulty)?.label}</Text>
        </View>
        <ProgressBar value={(round.index + (answered ? 1 : 0)) / round.questions.length} />

        <Animated.View key={round.index} entering={ZoomIn.duration(220)} style={[shared.card, styles.prompt]}>
          <Text style={styles.word}>{item.form}</Text>
          {item.entry ? (
            <Meanings entry={item.entry} langs={[game.lang]} style={styles.meaning} />
          ) : gloss ? (
            <Text style={styles.gloss}>{gloss}</Text>
          ) : null}
          <Text style={styles.ask}>Which head (ርእስ) does it follow?</Text>
        </Animated.View>

        <Choices options={q.options} answerIndex={shown} chosen={round.chosen} onPick={answer} geez />

        {answered ? (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.feedback, correct ? styles.feedbackRight : styles.feedbackWrong]}>
            <Text style={[styles.feedbackTitle, { color: correct ? colors.success : colors.accentDark }]}>
              {correct ? (round.streak > 1 ? `Right · ${round.streak} in a row` : "Right") : "Not quite"}
            </Text>
            <Text style={styles.feedbackWord}>
              {item.form} → {item.answers.join(" / ")}
              {item.mark ? <Text style={styles.mark}>{`   ${item.mark}`}</Text> : null}
            </Text>
            {item.answers.length > 1 ? (
              <Text style={shared.hint}>The book prints this spelling under both heads: it is read either way.</Text>
            ) : null}
            {item.answers.map((head) => (
              <Pattern key={head} lexicon={lexicon} head={head} />
            ))}
            {item.entry ? <Meanings entry={item.entry} langs={langs} /> : null}
            <Button size="sm" onPress={next} style={styles.next}>
              {round.index + 1 < round.questions.length ? "Next →" : "See results"}
            </Button>
          </Animated.View>
        ) : null}
      </View>
    );
  } else {
    const ready = available && items.length >= 4;
    body = (
      <StartCard
        emoji="📜"
        lead="See a verb as the book prints it, and pick the head (ርእስ) whose ርባታ it follows."
        rules={[
          "Easy: four heads · Medium: always with the look-alike (ቀተለ/ቀደሰ, ተንበለ/ማህረከ) · Hard: all eight",
          "After each answer: the book's mark and the head's pattern (ቀተለ · ይቀትል · ይቅትል · ቀቲል)",
          "Practice only: ዛሬ and ክለሳ are not changed",
          ready ? `${items.length} verbs from መጽሐፈ ግስ ወሰዋስው · ${release.tag}` : null,
        ].filter(Boolean)}
        best={game.best}
        onStart={start}
        disabled={!ready}
        note={ready ? null : "The book's verb list isn't loaded in the app yet."}
      >
        <LanguagePicker lang={game.lang} onChange={game.setLang} />
        <FocusPicker game={game} />
        <DifficultyPicker value={difficulty} onChange={setDifficulty} options={HEAD_DIFFICULTIES} />
        <Text style={shared.hint}>{HEAD_DIFFICULTIES.find((d) => d.key === difficulty)?.hint}</Text>
      </StartCard>
    );
  }

  return (
    <GameFrame title="ርእስ" game={game}>
      {body}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  play: { gap: spacing.md, maxWidth: 640, width: "100%", alignSelf: "center" },
  hud: { flexDirection: "row", justifyContent: "space-between" },
  hudText: { ...typography.label, color: colors.textSecondary },
  prompt: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs },
  word: { fontFamily: fontFamily.ethiopicBold, fontSize: 40, lineHeight: 56, color: colors.textPrimary },
  meaning: { alignItems: "center" },
  gloss: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 24, color: colors.textSecondary },
  ask: { ...typography.label, color: colors.textSecondary, marginTop: spacing.xs },
  feedback: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  feedbackRight: { borderColor: colors.success, backgroundColor: colors.successLight },
  feedbackWrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  feedbackTitle: { ...typography.label, textTransform: "uppercase", letterSpacing: 1 },
  feedbackWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 32, color: colors.textPrimary },
  mark: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.accentDark },
  pattern: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  patternCell: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  patternForm: { fontFamily: fontFamily.ethiopicBold, fontSize: 17, lineHeight: 26, color: colors.textPrimary },
  patternName: { fontFamily: fontFamily.ethiopicRegular, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  next: { alignSelf: "flex-end", marginTop: spacing.xs },
  missed: { gap: 4, marginTop: spacing.sm, alignSelf: "stretch" },
  missedTitle: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.textSecondary },
  missedLine: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 26, color: colors.textPrimary },
  missedForm: { fontFamily: fontFamily.ethiopicBold },
  missedHead: { fontFamily: fontFamily.ethiopicBold, color: colors.primaryDark },
});
