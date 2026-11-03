import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { MAX_GUESSES, consonantBase, isFidel, rootKeyboardMarks, scoreRoot, splitFidel } from "../../lib/kal";
import { MARK_COLORS } from "./KalBoard";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const TILE = 60;

const HELP = [
  ["exact", "ሰ", "right consonant, right place"],
  ["moved", "ብ", "in the root, but in another place"],
  ["absent", "ጠ", "not in the root"],
];

export function KalRootLegend() {
  return (
    <View style={styles.legend}>
      {HELP.map(([mark, ch, text]) => (
        <View key={mark} style={styles.legendRow}>
          <View style={[styles.legendTile, { backgroundColor: MARK_COLORS[mark] }]}>
            <Text style={styles.legendTileText}>{ch}</Text>
          </View>
          <Text style={styles.legendText}>{text}</Text>
        </View>
      ))}
      <View style={styles.legendRow}>
        <View style={[styles.legendTile, styles.legendFixed]}>
          <Text style={[styles.legendTileText, { color: colors.primaryDark }]}>ለ</Text>
        </View>
        <Text style={styles.legendText}>given: the ending, or a consonant from a hint</Text>
      </View>
    </View>
  );
}

function Tile({ consonant, mark, fixed, active, size }) {
  return (
    <Animated.View
      entering={mark ? FadeIn.duration(260) : undefined}
      style={[
        styles.tile,
        { width: size, height: size },
        consonant != null && !mark && styles.tileFilled,
        fixed && !mark && styles.tileFixed,
        active && styles.tileActive,
        mark && { backgroundColor: MARK_COLORS[mark], borderColor: MARK_COLORS[mark] },
      ]}
    >
      <Text
        style={[
          styles.tileText,
          { fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.66) },
          fixed && !mark && styles.tileTextFixed,
          mark && styles.tileTextMarked,
        ]}
      >
        {consonant != null ? consonantBase(consonant) : ""}
      </Text>
    </Animated.View>
  );
}

// Guess the root: three consonants. `fixed` squares ({ position: consonant })
// are filled in for the player. With `choices` (one list per square) each
// square offers only those consonants (Easy); otherwise the whole keyboard.
export function KalRootBoard({ target, guesses, fixed = {}, consonants, choices, done, onSubmit, check }) {
  const open = useMemo(() => [0, 1, 2].filter((i) => fixed[i] == null), [fixed]);
  const [typed, setTyped] = useState([]); // consonants for the open squares, in order
  const [message, setMessage] = useState(null);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const wide = screenW >= 760;
  const reserved = done ? 330 : 440;
  const tile = wide ? TILE : Math.max(34, Math.min(TILE, Math.floor((screenH - reserved - 30) / MAX_GUESSES)));
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const marks = useMemo(() => rootKeyboardMarks(guesses, target), [guesses, target]);
  const activePos = open[typed.length];

  useEffect(() => setTyped([]), [target, open.join()]);

  const current = [0, 1, 2].map((i) => (fixed[i] != null ? fixed[i] : typed[open.indexOf(i)]));

  const flash = (text) => {
    setMessage(text);
    shake.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    setTimeout(() => setMessage(null), 1600);
  };

  const add = (c) => !done && setTyped((t) => (t.length < open.length ? [...t, c] : t));
  const back = () => !done && setTyped((t) => t.slice(0, -1));
  const submit = () => {
    if (done) return;
    if (current.some((c) => c == null)) return flash("Fill every square.");
    const problem = check(current);
    if (problem) return flash(problem);
    setTyped([]);
    onSubmit(current);
  };

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") submit();
      else if (event.key === "Backspace") back();
      else if ([...event.key].length === 1 && isFidel(event.key)) {
        const c = splitFidel(event.key).consonant;
        if (choices && activePos != null && !choices[activePos]?.includes(c)) return;
        add(c);
      } else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length) {
      const scored = scoreRoot(guesses[r], target);
      return guesses[r].map((c, i) => ({ consonant: c, mark: scored[i] }));
    }
    if (r === guesses.length && !done) {
      return current.map((c, i) => ({ consonant: c, fixed: fixed[i] != null, active: i === activePos }));
    }
    return [0, 1, 2].map((i) => ({ consonant: !done && fixed[i] != null ? fixed[i] : null, fixed: !done && fixed[i] != null }));
  });

  const keys = choices ? (activePos != null ? choices[activePos] || [] : []) : consonants;
  const ready = current.every((c) => c != null);

  return (
    <View style={[styles.wrap, wide && !done && styles.wrapWide]}>
      <View style={styles.boardCol}>
        <View style={styles.board}>
          {rows.map((row, r) => (
            <Animated.View key={r} style={[styles.row, r === guesses.length && shakeStyle]}>
              {row.map((cell, i) => (
                <Tile key={`${r}-${i}-${cell.mark || ""}`} size={tile} {...cell} />
              ))}
            </Animated.View>
          ))}
        </View>
        <View style={styles.messageSlot}>{message ? <Text style={styles.message}>{message}</Text> : null}</View>
      </View>

      {done ? null : (
        <View style={[styles.keyboard, wide && styles.keyboardWide]}>
          <Text style={styles.keyboardHint}>
            {choices
              ? activePos != null
                ? `Square ${activePos + 1}: pick one of these consonants.`
                : "Press Guess to check your root."
              : "Tap the root's consonants. Vowels don't matter."}
          </Text>
          <View style={[styles.keys, choices && styles.keysEasy, !wide && styles.keysCompact]}>
            {keys.map((c) => {
              const mark = marks[c];
              return (
                <Pressable
                  key={c}
                  onPress={() => add(c)}
                  accessibilityLabel={consonantBase(c)}
                  style={({ hovered }) => [
                    choices ? styles.keyEasy : wide ? styles.key : styles.keyCompact,
                    hovered && styles.keyHover,
                    mark && { backgroundColor: MARK_COLORS[mark], borderColor: MARK_COLORS[mark] },
                  ]}
                >
                  <Text style={[choices ? styles.keyTextEasy : wide ? styles.keyText : styles.keyTextCompact, mark && styles.keyTextMarked]}>
                    {consonantBase(c)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Pressable onPress={back} style={({ hovered }) => [styles.action, hovered && styles.keyHover]}>
              <Text style={styles.actionText}>⌫ Delete</Text>
            </Pressable>
            <Pressable onPress={submit} style={({ hovered }) => [styles.action, ready && styles.enterReady, hovered && styles.enterHover]}>
              <Text style={[styles.actionText, ready && styles.enterText]}>Guess ↵</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const keyBase = {
  borderRadius: radii.sm,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.surface,
  alignItems: "center",
  justifyContent: "center",
};

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.sm },
  wrapWide: { flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: spacing.xl },
  boardCol: { alignItems: "center", gap: spacing.sm },
  board: { gap: 6 },
  row: { flexDirection: "row", gap: 6 },
  tile: {
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tileFilled: { borderColor: colors.borderInk },
  tileFixed: { borderColor: colors.primary, borderStyle: "dashed", backgroundColor: colors.primaryLight },
  tileActive: { borderColor: colors.primary },
  tileText: { fontFamily: fontFamily.ethiopicBold, color: colors.textPrimary },
  tileTextFixed: { color: colors.primaryDark },
  tileTextMarked: { color: "#fff" },
  messageSlot: { height: 26, justifyContent: "center" },
  message: {
    ...typography.label,
    color: colors.white,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  keyboard: { alignSelf: "stretch", gap: spacing.sm, alignItems: "center" },
  keyboardWide: { alignSelf: "auto", flex: 1, maxWidth: 470, paddingTop: spacing.sm },
  keyboardHint: { ...typography.caption, color: colors.textMuted, minHeight: 24, textAlign: "center" },
  keys: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 5, maxWidth: 520 },
  keysCompact: { gap: 4, maxWidth: 350 },
  keysEasy: { gap: spacing.sm, maxWidth: 400 },
  key: { ...keyBase, width: 40, height: 44 },
  keyCompact: { ...keyBase, width: 31, height: 36 },
  keyEasy: { ...keyBase, width: 56, height: 56, borderRadius: radii.md, borderWidth: 1.5 },
  keyHover: { borderColor: colors.primary },
  keyText: { fontFamily: fontFamily.ethiopicBold, fontSize: 19, lineHeight: 26, color: colors.textPrimary },
  keyTextCompact: { fontFamily: fontFamily.ethiopicBold, fontSize: 17, lineHeight: 23, color: colors.textPrimary },
  keyTextEasy: { fontFamily: fontFamily.ethiopicBold, fontSize: 26, lineHeight: 34, color: colors.textPrimary },
  keyTextMarked: { color: "#fff" },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { ...keyBase, paddingHorizontal: spacing.lg, height: 44 },
  actionText: { ...typography.label, color: colors.textPrimary },
  enterReady: { backgroundColor: colors.primary, borderColor: colors.primary },
  enterHover: { borderColor: colors.primaryDark },
  enterText: { color: colors.onPrimary },
  legend: { gap: 6, alignSelf: "stretch" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legendTile: { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  legendFixed: { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary },
  legendTileText: { fontFamily: fontFamily.ethiopicBold, fontSize: 14, color: "#fff" },
  legendText: { ...typography.caption, color: colors.textSecondary },
});

