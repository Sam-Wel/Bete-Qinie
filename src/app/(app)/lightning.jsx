import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { DifficultyPicker, FocusPicker, GameFrame, LanguagePicker, ProgressBar, StartCard } from "../../components/games/GameFrame";
import { Choices } from "../../components/games/Choices";
import { GameResults } from "../../components/games/GameResults";
import { shared } from "../../components/verbQuiz/shared";
import { useVerbGame } from "../../hooks/useVerbGame";
import { LIGHTNING_MODES, lightningMultiplier, lightningPoints, questionFor } from "../../lib/verbGames";
import { LANGUAGE_LABEL } from "../../lib/verbQuiz";
import { colors, fontFamily, spacing, typography } from "../../theme";

const RIGHT_PAUSE = 320;
const WRONG_PAUSE = 900; // long enough to see the right answer
const MODE_OPTIONS = LIGHTNING_MODES.map((s) => ({ key: s, label: `${s} seconds` }));

// Verb Lightning Round: as many ግዕዝ verbs as you can before the clock runs out.
export default function Lightning() {
  const [mode, setMode] = useState(60);
  const game = useVerbGame(`verb_lightning_${mode}`);
  const [run, setRun] = useState(null); // { queue, index, question, chosen, score, combo, best, right, asked, endsAt }
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null);
  const tick = useRef(null);
  const pause = useRef(null);

  useEffect(
    () => () => {
      clearInterval(tick.current);
      clearTimeout(pause.current);
    },
    []
  );

  const ask = (r, index) => {
    const entry = r.queue[index % r.queue.length];
    return { ...r, index, chosen: null, question: questionFor(entry, game.lang, "toMeaning", game.bank, "medium") };
  };

  const start = () => {
    const queue = game.words(300, { min: 8 });
    const endsAt = Date.now() + mode * 1000;
    setRun(ask({ queue, score: 0, combo: 0, best: 0, right: 0, asked: 0, endsAt }, 0));
    setResult(null);
    game.start();
    clearInterval(tick.current);
    tick.current = setInterval(() => setNow(Date.now()), 100);
  };

  const end = async (r) => {
    clearInterval(tick.current);
    clearTimeout(pause.current);
    const res = { ...r, isBest: false };
    setResult(res);
    setRun(null);
    const isBest = await game.finish({ score: r.score, rounds: r.asked, state: { mode, right: r.right } });
    setResult({ ...res, isBest });
  };

  const left = run ? Math.max(0, run.endsAt - now) : 0;
  useEffect(() => {
    if (run && left === 0) end(run);
  }, [left]);

  const pick = (i) => {
    if (!run || run.chosen != null) return;
    const correct = i === run.question.answerIndex;
    game.record(run.question.wordId, correct);
    const combo = correct ? run.combo + 1 : 0;
    const answered = {
      ...run,
      chosen: i,
      combo,
      best: Math.max(run.best, combo),
      score: run.score + (correct ? lightningPoints(combo) : 0),
      right: run.right + (correct ? 1 : 0),
      asked: run.asked + 1,
    };
    setRun(answered);
    pause.current = setTimeout(() => setRun((r) => (r ? ask(r, r.index + 1) : r)), correct ? RIGHT_PAUSE : WRONG_PAUSE);
  };

  let body;
  if (result) {
    body = (
      <GameResults
        title={`${mode}-second round`}
        score={result.score}
        isBest={result.isBest}
        stats={[
          { value: result.right, label: "right", tone: colors.success },
          { value: result.asked - result.right, label: "missed" },
          { value: result.best, label: "best combo" },
          { value: result.asked ? `${Math.round((result.right / result.asked) * 100)}%` : "—", label: "accuracy" },
        ]}
        missedIds={game.missedIds()}
        bank={game.bank}
        lang={game.lang}
        signedIn={game.signedIn}
        onAgain={start}
      />
    );
  } else if (run) {
    const q = run.question;
    const secs = Math.ceil(left / 1000);
    const mult = lightningMultiplier(run.combo);
    body = (
      <View style={styles.play}>
        <View style={styles.hud}>
          <Text style={[styles.clock, secs <= 5 && { color: colors.accent }]}>{secs}s</Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.score}>{run.score}</Text>
            <Text style={styles.combo}>{mult > 1 ? `×${mult} · ${run.combo} in a row` : run.combo ? `${run.combo} in a row` : " "}</Text>
          </View>
        </View>
        <ProgressBar value={left / (mode * 1000)} color={secs <= 5 ? colors.accent : colors.primary} />

        <Animated.View key={run.index} entering={ZoomIn.duration(160)} style={[shared.card, styles.prompt]}>
          <Text style={styles.ask}>What does it mean in {LANGUAGE_LABEL[game.lang]}?</Text>
          <Text style={styles.word}>{q.prompt}</Text>
        </Animated.View>

        <Choices options={q.options} answerIndex={q.answerIndex} chosen={run.chosen} onPick={pick} />
        {run.chosen != null && run.chosen === q.answerIndex ? (
          <Animated.Text entering={FadeIn.duration(120)} style={styles.plus}>
            +{lightningPoints(run.combo)}
          </Animated.Text>
        ) : (
          <Text style={styles.plus}> </Text>
        )}
      </View>
    );
  } else {
    body = (
      <StartCard
        emoji="⚡"
        lead="A ግዕዝ verb appears; tap its meaning. Go as fast as you can."
        rules={["3 in a row doubles points, 6 triples, 10 quadruples", "A miss resets the multiplier and shows the right meaning", "Separate best scores for 30, 60 and 90 seconds"]}
        best={game.best}
        onStart={start}
      >
        <LanguagePicker lang={game.lang} onChange={game.setLang} />
        <FocusPicker game={game} />
        <DifficultyPicker value={mode} onChange={setMode} options={MODE_OPTIONS} label="ROUND LENGTH" />
      </StartCard>
    );
  }

  return (
    <GameFrame title="Verb Lightning Round" game={game}>
      {body}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  play: { gap: spacing.md, maxWidth: 640, width: "100%", alignSelf: "center" },
  hud: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  clock: { fontFamily: fontFamily.latinBold, fontSize: 32, lineHeight: 36, color: colors.textPrimary },
  score: { fontFamily: fontFamily.latinBold, fontSize: 24, lineHeight: 28, color: colors.textPrimary },
  combo: { ...typography.caption, color: colors.primaryDark },
  prompt: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs },
  ask: { ...typography.label, color: colors.textMuted },
  word: { fontFamily: fontFamily.ethiopicBold, fontSize: 44, lineHeight: 60, color: colors.textPrimary },
  plus: { ...typography.bodySemiBold, color: colors.success, textAlign: "center", height: 22 },
});

