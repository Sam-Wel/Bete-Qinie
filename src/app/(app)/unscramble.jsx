import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from "react-native-reanimated";
import { Button } from "../../components/ui";
import { DifficultyPicker, FocusPicker, GameFrame, LanguagePicker, ProgressBar, StartCard } from "../../components/games/GameFrame";
import { GameResults } from "../../components/games/GameResults";
import { Meanings } from "../../components/verbQuiz/QuizPlay";
import { scriptFont, shared } from "../../components/verbQuiz/shared";
import { useVerbGame } from "../../hooks/useVerbGame";
import { graphemes, hintTile, isUnscrambled, scramble, unscramblePoints, unscrambleWords } from "../../lib/verbGames";
import { LANGUAGES, LANGUAGE_LABEL } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const ROUND = 8;
const TILE = 54;

function newWord(entry) {
  return { entry, tiles: scramble(entry.word), placed: [], hints: 0, misses: 0, solved: false, revealed: false };
}

// Unscramble the Verb: the meaning is shown; put the shuffled letters of the ግዕዝ verb back in order.
export default function Unscramble() {
  const game = useVerbGame("verb_unscramble");
  const [difficulty, setDifficulty] = useState("easy");
  const [round, setRound] = useState(null); // { words, index, current, score, streak, best, solved }
  const [result, setResult] = useState(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const pool = game.ready ? unscrambleWords(game.bank, game.lang, difficulty) : [];

  const start = () => {
    const words = game.words(ROUND, { pool, min: 5 });
    setRound({ words, index: 0, current: newWord(words[0]), score: 0, streak: 0, best: 0, solved: 0 });
    setResult(null);
    game.start();
  };

  const update = (patch) => setRound((r) => ({ ...r, current: { ...r.current, ...patch } }));

  // Put letters in place; the word is checked as soon as every slot is filled.
  const settle = (r, placed) => {
    const w = r.current;
    if (placed.length < w.tiles.length) return setRound({ ...r, current: { ...w, placed } });
    if (isUnscrambled(placed.map((p) => p.ch), w.entry.word)) {
      const clean = !w.hints && !w.misses;
      game.record(w.entry.id, clean);
      const streak = clean ? r.streak + 1 : 0;
      const points = unscramblePoints({ letters: w.tiles.length, hints: w.hints, streak });
      return setRound({
        ...r,
        current: { ...w, placed, solved: true },
        score: r.score + points,
        streak,
        best: Math.max(r.best, streak),
        solved: r.solved + 1,
      });
    }
    shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }));
    setRound({ ...r, current: { ...w, placed, misses: w.misses + 1 }, streak: 0 });
  };

  const place = (tile) => {
    const w = round.current;
    if (w.solved || w.revealed || w.placed.some((p) => p.id === tile.id)) return;
    settle(round, [...w.placed, tile]);
  };

  const unplace = (i) => update({ placed: round.current.placed.filter((_, k) => k !== i) });
  const undo = () => update({ placed: round.current.placed.slice(0, -1) });
  const reset = () => update({ placed: [] });

  const hint = () => {
    const w = round.current;
    const letters = graphemes(w.entry.word);
    // Keep only the correct start, then add the next right letter.
    let keep = 0;
    while (keep < w.placed.length && w.placed[keep].ch === letters[keep]) keep++;
    const placed = w.placed.slice(0, keep);
    const id = hintTile(w.entry.word, placed, w.tiles);
    if (id == null) return;
    settle({ ...round, current: { ...w, hints: w.hints + 1 } }, [...placed, w.tiles.find((t) => t.id === id)]);
  };

  const reveal = () => {
    game.record(round.current.entry.id, false);
    const placed = graphemes(round.current.entry.word).map((ch, i) => ({ id: `r${i}`, ch }));
    setRound({ ...round, streak: 0, current: { ...round.current, revealed: true, placed } });
  };

  const next = async () => {
    if (round.index + 1 < round.words.length) {
      const index = round.index + 1;
      setRound({ ...round, index, current: newWord(round.words[index]) });
      return;
    }
    const res = { ...round, isBest: false };
    setResult(res);
    setRound(null);
    const isBest = await game.finish({ score: round.score, rounds: round.words.length, state: { difficulty, solved: round.solved } });
    setResult({ ...res, isBest });
  };

  // Typing on a Ge'ez keyboard places the matching tile; Backspace undoes.
  useEffect(() => {
    if (Platform.OS !== "web" || !round) return undefined;
    const onKey = (event) => {
      const w = round.current;
      if (event.key === "Backspace") return undo();
      if (event.key === "Enter" && (w.solved || w.revealed)) return next();
      const tile = w.tiles.find((t) => t.ch === event.key && !w.placed.some((p) => p.id === t.id));
      if (tile) place(tile);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let body;
  if (result) {
    body = (
      <GameResults
        title="Round complete"
        score={result.score}
        isBest={result.isBest}
        stats={[
          { value: `${result.solved}/${result.words.length}`, label: "solved", tone: colors.success },
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
    const w = round.current;
    const done = w.solved || w.revealed;
    const meaning = w.entry.ask[game.lang].slice(0, 3).join(" · ");
    const n = w.tiles.length;
    body = (
      <View style={styles.play}>
        <View style={styles.hud}>
          <Text style={styles.hudText}>
            {round.index + 1} of {round.words.length} · score {round.score}
          </Text>
          <Text style={styles.hudText}>{round.streak > 1 ? `🔥 ${round.streak} in a row` : ""}</Text>
        </View>
        <ProgressBar value={(round.index + (done ? 1 : 0)) / round.words.length} />

        <Animated.View key={round.index} entering={FadeIn.duration(220)} style={[shared.card, styles.prompt]}>
          <Text style={styles.promptLang}>{LANGUAGE_LABEL[game.lang]} · {n} letters</Text>
          <Text style={[styles.meaning, scriptFont(meaning)]}>{meaning}</Text>
        </Animated.View>

        <Animated.View style={[styles.slots, shakeStyle]}>
          {Array.from({ length: n }, (_, i) => {
            const tile = w.placed[i];
            return (
              <Pressable
                key={i}
                onPress={() => tile && !done && unplace(i)}
                accessibilityLabel={tile ? `Remove ${tile.ch}` : `Empty slot ${i + 1}`}
                style={[styles.slot, tile && styles.slotFilled, w.solved && styles.slotSolved, w.revealed && styles.slotRevealed]}
              >
                {tile ? (
                  <Animated.Text entering={ZoomIn.duration(140)} style={[styles.tileText, (w.solved || w.revealed) && { color: "#fff" }]}>
                    {tile.ch}
                  </Animated.Text>
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>

        {!done ? (
          <View style={styles.tiles}>
            {w.tiles.map((tile) => {
              const used = w.placed.some((p) => p.id === tile.id);
              return (
                <Pressable
                  key={tile.id}
                  onPress={() => place(tile)}
                  disabled={used}
                  accessibilityLabel={`Letter ${tile.ch}`}
                  style={({ hovered }) => [styles.tile, hovered && !used && styles.tileHover, used && styles.tileUsed]}
                >
                  <Text style={[styles.tileText, used && { opacity: 0 }]}>{tile.ch}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!done ? (
          <View style={styles.tools}>
            <Button size="sm" variant="secondary" onPress={undo} disabled={!w.placed.length}>
              Undo
            </Button>
            <Button size="sm" variant="secondary" onPress={reset} disabled={!w.placed.length}>
              Reset
            </Button>
            <Button size="sm" variant="ghost" onPress={hint}>
              Hint (−15)
            </Button>
            <Button size="sm" variant="ghost" onPress={reveal}>
              Show answer
            </Button>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.feedback, w.solved ? styles.feedbackRight : styles.feedbackWrong]}>
            <Text style={[styles.feedbackTitle, { color: w.solved ? colors.success : colors.accentDark }]}>
              {w.solved ? (w.hints ? "Solved with a hint" : w.misses ? "Solved" : "Perfect") : "The answer"}
            </Text>
            <Text style={styles.feedbackWord}>{w.entry.word}</Text>
            <Meanings entry={w.entry} langs={[game.lang, ...LANGUAGES.map((l) => l.code).filter((c) => c !== game.lang)]} />
            <Button size="sm" onPress={next} style={styles.next}>
              {round.index + 1 < round.words.length ? "Next →" : "See results"}
            </Button>
          </Animated.View>
        )}
        {Platform.OS === "web" && !done ? <Text style={styles.footer}>Tap letters in order, or type them · Backspace undoes</Text> : null}
      </View>
    );
  } else {
    body = (
      <StartCard
        emoji="🔀"
        lead="Read the meaning, then put the ግዕዝ verb's letters back in order."
        rules={["Easy: 3 letters · Medium: 4 · Hard: 5 or more", "Hints cost points; clean solves build a streak", `${pool.length} verbs at this level`]}
        best={game.best}
        onStart={start}
        disabled={pool.length < 1}
      >
        <LanguagePicker lang={game.lang} onChange={game.setLang} />
        <FocusPicker game={game} />
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      </StartCard>
    );
  }

  return (
    <GameFrame title="Unscramble the Verb" game={game}>
      {body}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  play: { gap: spacing.md, maxWidth: 640, width: "100%", alignSelf: "center" },
  hud: { flexDirection: "row", justifyContent: "space-between" },
  hudText: { ...typography.label, color: colors.textSecondary },
  prompt: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.lg },
  promptLang: { fontFamily: fontFamily.ethiopicRegular, fontSize: 12, color: colors.textMuted },
  meaning: { fontSize: 24, lineHeight: 34, color: colors.textPrimary, textAlign: "center" },
  slots: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  slot: {
    width: TILE,
    height: TILE + 6,
    borderRadius: radii.md,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderInk,
    alignItems: "center",
    justifyContent: "center",
  },
  slotFilled: { borderStyle: "solid", borderColor: colors.primary, backgroundColor: colors.primaryLight },
  slotSolved: { borderColor: colors.success, backgroundColor: colors.success },
  slotRevealed: { borderColor: colors.accent, backgroundColor: colors.accent },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
  tile: {
    width: TILE,
    height: TILE + 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tileHover: { borderColor: colors.primary },
  tileUsed: { backgroundColor: colors.surfaceMuted, borderStyle: "dashed" },
  tileText: { fontFamily: fontFamily.ethiopicBold, fontSize: 28, lineHeight: 38, color: colors.textPrimary },
  tools: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  feedback: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.xs },
  feedbackRight: { borderColor: colors.success, backgroundColor: colors.successLight },
  feedbackWrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  feedbackTitle: { ...typography.label, textTransform: "uppercase", letterSpacing: 1 },
  feedbackWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 24, lineHeight: 34, color: colors.textPrimary },
  next: { alignSelf: "flex-end", marginTop: spacing.sm },
  footer: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
});
