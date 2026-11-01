import { useMemo, useRef, useState } from "react";
import { Animated as RNAnimated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { DifficultyPicker, GameFrame, LanguagePicker, ProgressBar, StartCard } from "../../components/games/GameFrame";
import { GameResults } from "../../components/games/GameResults";
import { scriptFont, shared } from "../../components/verbQuiz/shared";
import { useVerbGame } from "../../hooks/useVerbGame";
import { fitsBin, meaningOf, sortingRound } from "../../lib/verbGames";
import { categoryLabel } from "../../lib/verbMeta";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

const TAP_SLOP = 6;

// A verb card: tap to pick it up, or drag it straight onto a category.
function VerbCard({ card, lang, selected, flash, onTap, onDrop }) {
  const pos = useRef(new RNAnimated.ValueXY()).current;
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: RNAnimated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
        onPanResponderRelease: (event, g) => {
          const moved = Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP;
          RNAnimated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
          if (!moved) onTap();
          else onDrop(g.moveX, g.moveY);
        },
        onPanResponderTerminate: () => RNAnimated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(),
      }),
    [onTap, onDrop]
  );
  const meaning = meaningOf(card.entry, lang);
  return (
    <RNAnimated.View
      {...responder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={`${card.entry.word}, ${meaning}`}
      style={[
        styles.card,
        selected && styles.cardSelected,
        flash && styles.cardWrong,
        { transform: pos.getTranslateTransform(), zIndex: selected ? 2 : 1 },
      ]}
    >
      <Text style={styles.cardWord}>{card.entry.word}</Text>
      <Text style={[styles.cardMeaning, scriptFont(meaning)]} numberOfLines={2}>
        {meaning}
      </Text>
    </RNAnimated.View>
  );
}

// Verb Sorting Challenge: put each ግዕዝ verb in the group its meaning belongs to.
export default function VerbSort() {
  const game = useVerbGame("verb_sort");
  const [difficulty, setDifficulty] = useState("easy");
  const [round, setRound] = useState(null); // { bins, cards, placed: {id: bin}, tries: {id: n}, selected, flash }
  const [result, setResult] = useState(null);
  const binRects = useRef({});
  const binViews = useRef({});

  const start = () => {
    const { bins, cards } = sortingRound(game.bank, game.lang, difficulty);
    setRound({ bins, cards, placed: {}, tries: {}, selected: null, flash: null });
    setResult(null);
    game.start();
  };

  const measureBins = () =>
    Object.entries(binViews.current).forEach(([bin, view]) =>
      view?.measureInWindow((x, y, w, h) => (binRects.current[bin] = { x, y, w, h }))
    );

  const finishRound = async (r) => {
    const first = r.cards.filter((c) => r.tries[c.entry.id] === 1).length;
    const score = first * 100 + (r.cards.length - first) * 40;
    const res = { ...r, score, first, isBest: false };
    setResult(res);
    setRound(null);
    const isBest = await game.finish({ score, rounds: r.cards.length, state: { difficulty, first } });
    setResult({ ...res, isBest });
  };

  const placeIn = (card, bin) => {
    const r = round;
    if (!r || r.placed[card.entry.id]) return;
    const tries = { ...r.tries, [card.entry.id]: (r.tries[card.entry.id] || 0) + 1 };
    const firstTry = tries[card.entry.id] === 1;
    if (fitsBin(card, bin)) {
      if (firstTry) game.record(card.entry.id, true);
      const next = { ...r, tries, placed: { ...r.placed, [card.entry.id]: bin }, selected: null, flash: null };
      setRound(next);
      if (Object.keys(next.placed).length === next.cards.length) finishRound(next);
    } else {
      if (firstTry) game.record(card.entry.id, false);
      setRound({ ...r, tries, selected: null, flash: card.entry.id });
      setTimeout(() => setRound((cur) => (cur && cur.flash === card.entry.id ? { ...cur, flash: null } : cur)), 600);
    }
  };

  const dropAt = (card, x, y) => {
    const hit = Object.entries(binRects.current).find(([, b]) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (hit) placeIn(card, hit[0]);
  };

  let body;
  if (result) {
    body = (
      <GameResults
        title="Sorted"
        score={result.score}
        isBest={result.isBest}
        stats={[
          { value: `${result.first}/${result.cards.length}`, label: "right first time", tone: colors.success },
          { value: result.bins.length, label: "groups" },
        ]}
        missedIds={game.missedIds()}
        bank={game.bank}
        lang={game.lang}
        signedIn={game.signedIn}
        onAgain={start}
      >
        <View style={styles.review}>
          {result.cards.map((c) => (
            <View key={c.entry.id} style={styles.reviewRow}>
              <Text style={styles.reviewMark}>{result.tries[c.entry.id] === 1 ? "✓" : "↻"}</Text>
              <Text style={styles.reviewWord}>{c.entry.word}</Text>
              <Text style={[styles.reviewMeaning, scriptFont(meaningOf(c.entry, game.lang))]} numberOfLines={1}>
                {meaningOf(c.entry, game.lang)}
              </Text>
              <Text style={styles.reviewBins} numberOfLines={2}>
                {c.meta.categories.map((k) => categoryLabel(k, game.lang)).join(" · ")}
              </Text>
            </View>
          ))}
        </View>
      </GameResults>
    );
  } else if (round) {
    const waiting = round.cards.filter((c) => !round.placed[c.entry.id]);
    const selected = round.cards.find((c) => c.entry.id === round.selected);
    body = (
      <View style={styles.play} onLayout={measureBins}>
        <View style={styles.hud}>
          <Text style={styles.hudText}>
            {round.cards.length - waiting.length} of {round.cards.length} sorted
          </Text>
          <Text style={styles.hudText}>{selected ? "Now tap a group" : "Drag a verb to its group, or tap it then a group"}</Text>
        </View>
        <ProgressBar value={(round.cards.length - waiting.length) / round.cards.length} />

        <View style={styles.tray}>
          {waiting.map((card) => (
            <VerbCard
              key={card.entry.id}
              card={card}
              lang={game.lang}
              selected={round.selected === card.entry.id}
              flash={round.flash === card.entry.id}
              onTap={() => setRound((r) => ({ ...r, selected: r.selected === card.entry.id ? null : card.entry.id }))}
              onDrop={(x, y) => {
                measureBins();
                dropAt(card, x, y);
              }}
            />
          ))}
        </View>

        <View style={styles.bins}>
          {round.bins.map((bin) => {
            const inside = round.cards.filter((c) => round.placed[c.entry.id] === bin);
            return (
              <Pressable
                key={bin}
                ref={(v) => (binViews.current[bin] = v)}
                onLayout={measureBins}
                onPress={() => selected && placeIn(selected, bin)}
                accessibilityRole="button"
                accessibilityLabel={`Group ${categoryLabel(bin, game.lang)}`}
                style={({ hovered }) => [styles.bin, selected && styles.binReady, hovered && selected && styles.binHover]}
              >
                <Text style={[styles.binTitle, scriptFont(categoryLabel(bin, game.lang))]}>{categoryLabel(bin, game.lang)}</Text>
                {game.lang !== "en" ? <Text style={styles.binSub}>{categoryLabel(bin, "en")}</Text> : null}
                <View style={styles.binCards}>
                  {inside.map((c) => (
                    <Text key={c.entry.id} style={styles.binWord}>
                      {c.entry.word}
                    </Text>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  } else {
    body = (
      <StartCard
        emoji="🗂️"
        lead="Sort each ግዕዝ verb into the group its meaning belongs to: movement, speech, feelings and more."
        rules={["Easy: 2 groups · Medium: 3 · Hard: 4", "Drag a card onto a group, or tap the card then the group", "Some verbs fit more than one group; any fitting group counts"]}
        best={game.best}
        onStart={start}
      >
        <LanguagePicker lang={game.lang} onChange={game.setLang} />
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      </StartCard>
    );
  }

  return (
    <GameFrame title="Verb Sorting Challenge" game={game}>
      {body}
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  play: { gap: spacing.md },
  hud: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  hudText: { ...typography.label, color: colors.textSecondary },
  tray: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", minHeight: 80 },
  card: {
    width: 150,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: "center",
    ...shadows.card,
    cursor: "grab",
  },
  cardSelected: { borderColor: colors.primaryDark, backgroundColor: colors.primaryLight, ...shadows.raised },
  cardWrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  cardWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 30, color: colors.textPrimary },
  cardMeaning: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: "center" },
  bins: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  bin: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 130,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderInk,
    backgroundColor: colors.surfaceMuted,
    gap: 2,
  },
  binReady: { borderColor: colors.primary },
  binHover: { backgroundColor: colors.primaryLight },
  binTitle: { fontSize: 16, lineHeight: 22, color: colors.textPrimary, fontFamily: fontFamily.ethiopicBold },
  binSub: { ...typography.caption, color: colors.textMuted },
  binCards: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  binWord: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 15,
    color: colors.success,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  review: { alignSelf: "stretch", gap: 4, marginTop: spacing.sm },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  reviewMark: { ...typography.label, width: 16, color: colors.success },
  reviewWord: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, color: colors.textPrimary, minWidth: 64 },
  reviewMeaning: { fontSize: 14, color: colors.textSecondary, flex: 1, minWidth: 100 },
  reviewBins: { ...typography.caption, color: colors.primaryDark, maxWidth: 220 },
});
