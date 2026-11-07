import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { CrossMenuIcon } from "../../components/ui/CrossMenuIcon";
import { DifficultyPicker, FocusPicker, GameFrame, LanguagePicker, StartCard } from "../../components/games/GameFrame";
import { GameResults } from "../../components/games/GameResults";
import { scriptFont, scriptFontBold } from "../../components/verbQuiz/shared";
import { useVerbGame } from "../../hooks/useVerbGame";
import { MEMORY_PAIRS, closeMisses, flipCard, memoryDeck, memoryDone, memoryScore, newMemory } from "../../lib/verbGames";
import { colors, radii, spacing, typography } from "../../theme";

const MISS_MS = 850;
const GAP = 8;

function Card({ card, up, matched, size, onPress }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withTiming(up ? 1 : 0, { duration: 260 });
  }, [up]);
  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${interpolate(turn.value, [0, 1], [0, 180])}deg` }],
  }));
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${interpolate(turn.value, [0, 1], [180, 360])}deg` }],
  }));
  const geez = card.side === "geez";
  const long = [...card.text].length;
  const fontSize = geez ? Math.min(28, size / Math.max(3, long) * 1.3) : Math.max(12, Math.min(18, (size * 2.2) / Math.max(4, long)));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={up ? card.text : "Hidden card"}
      style={{ width: size, height: size * 1.15 }}
    >
      <Animated.View style={[styles.face, styles.back, back]}>
        <CrossMenuIcon size={size * 0.42} color="#e0a52a" ground="#17110a" />
      </Animated.View>
      <Animated.View style={[styles.face, geez ? styles.frontGeez : styles.frontMeaning, matched && styles.matched, front]}>
        <Text
          numberOfLines={3}
          style={[geez ? scriptFontBold(card.text) : scriptFont(card.text), styles.cardText, { fontSize, lineHeight: fontSize * 1.3 }]}
        >
          {card.text}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// Verb Memory Match: turn cards two at a time to pair each ግዕዝ verb with its meaning.
export default function MemoryMatch() {
  const game = useVerbGame("verb_memory");
  const [difficulty, setDifficulty] = useState("easy");
  const [memory, setMemory] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState(null);
  const [width, setWidth] = useState(0);
  const timer = useRef(null);
  const started = useRef(false);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = () => {
    const entries = game.words(60, { min: MEMORY_PAIRS[difficulty] + 4 });
    setMemory(newMemory(memoryDeck(entries, game.lang, MEMORY_PAIRS[difficulty])));
    setSeconds(0);
    setResult(null);
    started.current = false;
    clearInterval(timer.current);
    game.start();
  };

  const finishRound = async (state, secs) => {
    clearInterval(timer.current);
    const pairs = state.cards.length / 2;
    const { score, accuracy } = memoryScore({ pairs, moves: state.moves, seconds: secs });
    setResult({ score, accuracy, moves: state.moves, seconds: secs, pairs, isBest: false });
    const isBest = await game.finish({ score, rounds: pairs, state: { difficulty, moves: state.moves, seconds: secs } });
    setResult((r) => r && { ...r, isBest });
  };

  const tap = (index) => {
    if (!memory) return;
    if (!started.current) {
      started.current = true;
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    const { state, event, pair } = flipCard(memory, index);
    if (!event) return;
    setMemory(state);
    if (event === "match") {
      game.record(pair, !state.missed.has(pair));
      if (memoryDone(state)) finishRound(state, seconds);
    }
    if (event === "miss") setTimeout(() => setMemory((s) => s && closeMisses(s)), MISS_MS);
  };

  const pairs = memory ? memory.cards.length / 2 : 0;
  const columns = width < 520 ? 4 : pairs >= 12 ? 6 : 4;
  const size = width ? Math.min(132, Math.floor((width - GAP * (columns - 1)) / columns)) : 0;

  let body;
  if (result) {
    body = (
      <GameResults
        title="All matched"
        score={result.score}
        isBest={result.isBest}
        stats={[
          { value: result.pairs, label: "pairs" },
          { value: result.moves, label: "moves" },
          { value: `${Math.round(result.accuracy * 100)}%`, label: "accuracy", tone: colors.success },
          { value: `${result.seconds}s`, label: "time" },
        ]}
        missedIds={game.missedIds()}
        bank={game.bank}
        lang={game.lang}
        signedIn={game.signedIn}
        onAgain={start}
      />
    );
  } else if (memory) {
    body = (
      <View>
        <View style={styles.hud}>
          <Text style={styles.hudText}>
            {memory.matched.size} / {pairs} pairs
          </Text>
          <Text style={styles.hudText}>
            {memory.moves} moves · {seconds}s
          </Text>
        </View>
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.grid, size ? { width: columns * size + (columns - 1) * GAP, alignSelf: "center" } : null]}>
          {size
            ? memory.cards.map((card, i) => (
                <Card
                  key={card.key}
                  card={card}
                  size={size}
                  up={memory.open.includes(i) || memory.matched.has(card.pair)}
                  matched={memory.matched.has(card.pair)}
                  onPress={() => tap(i)}
                />
              ))
            : null}
        </View>
        </View>
        <Text style={styles.footer}>Pair each ግዕዝ verb (gold) with its meaning (white). Fewer moves score more.</Text>
      </View>
    );
  } else {
    body = (
      <StartCard
        emoji="🃏"
        lead="Turn two cards at a time. Pair every ግዕዝ verb with its meaning."
        rules={["Easy 4 pairs · Medium 8 · Hard 12", "Fewer moves and less time score more", "Verbs you've missed before come up first"]}
        best={game.best}
        onStart={start}
      >
        <LanguagePicker lang={game.lang} onChange={game.setLang} />
        <FocusPicker game={game} />
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      </StartCard>
    );
  }

  return (
    <GameFrame title="Verb Memory Match" game={game}>
      {body}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  hudText: { ...typography.label, color: colors.textSecondary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, justifyContent: "center" },
  face: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
    padding: 6,
  },
  back: { backgroundColor: "#17110a", borderWidth: 2, borderColor: "#3a2c17" },
  frontGeez: { backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: colors.primary },
  frontMeaning: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  matched: { borderColor: colors.success, backgroundColor: colors.successLight },
  cardText: { color: colors.textPrimary, textAlign: "center" },
  footer: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.md },
});
