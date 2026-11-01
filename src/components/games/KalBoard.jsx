import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  MAX_GUESSES,
  WORD_LENGTH,
  consonantBase,
  isFidel,
  keyboardMarks,
  letters,
  ordersOf,
  scoreGuess,
  splitFidel,
} from "../../lib/kal";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

export const MARK_COLORS = {
  exact: "#4a7a3a",
  order: "#C0850C",
  moved: "#4f6aa3",
  absent: "#8a8174",
};

const MARK_HELP = [
  ["exact", "ሰ", "right letter, right place"],
  ["order", "ሱ", "right consonant here, other vowel (ሰ ⇄ ሱ)"],
  ["moved", "ብ", "this consonant is elsewhere in the word"],
  ["absent", "ጠ", "not in the word"],
];

function Tile({ ch, mark, active, size }) {
  const filled = Boolean(ch);
  return (
    <Animated.View
      entering={mark ? FadeIn.duration(260) : undefined}
      style={[
        styles.tile,
        { width: size, height: size },
        filled && !mark && styles.tileFilled,
        active && styles.tileActive,
        mark && {
          backgroundColor: MARK_COLORS[mark],
          borderColor: MARK_COLORS[mark],
        },
      ]}
    >
      <Text
        style={[styles.tileText, { fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.66) }, mark && styles.tileTextMarked]}
      >
        {ch || ""}
      </Text>
    </Animated.View>
  );
}

export function KalLegend() {
  return (
    <View style={styles.legend}>
      {MARK_HELP.map(([mark, ch, text]) => (
        <View key={mark} style={styles.legendRow}>
          <View
            style={[styles.legendTile, { backgroundColor: MARK_COLORS[mark] }]}
          >
            <Text style={styles.legendTileText}>{ch}</Text>
          </View>
          <Text style={styles.legendText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

// The six rows of guesses, the row being typed, and a fidel keyboard: tap a
// consonant, then the vowel order you want. A Ge'ez keyboard on a computer
// works too.
export function KalBoard({
  target,
  guesses,
  allowedConsonants,
  done,
  onSubmit,
  check,
}) {
  const [current, setCurrent] = useState([]);
  const [open, setOpen] = useState(null); // consonant whose orders are showing
  const [message, setMessage] = useState(null);
  // Wide screens put the keyboard beside the board; narrow ones shrink the
  // tiles and keys so board and keyboard both fit on one screen.
  const { width: screenW, height: screenH } = useWindowDimensions();
  const wide = screenW >= 760;
  const reserved = done ? 330 : 420; // top bar, header, hint and (while playing) the keyboard
  const tile = wide ? TILE : Math.max(34, Math.min(TILE, Math.floor((screenH - reserved - 30) / MAX_GUESSES)));
  const keySize = wide ? styles.key : styles.keyCompact;
  const c = wide ? {} : compact; // tighter spacing on phones
  const keyText = wide ? styles.keyText : styles.keyTextCompact;
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const marks = useMemo(
    () => keyboardMarks(guesses, target),
    [guesses, target],
  );

  useEffect(() => {
    setCurrent([]);
    setOpen(null);
  }, [target]);

  const flash = (text) => {
    setMessage(text);
    shake.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
    setTimeout(() => setMessage(null), 1600);
  };

  const add = (ch) => {
    if (done) return;
    setCurrent((c) => (c.length < WORD_LENGTH ? [...c, ch] : c));
    setOpen(null);
  };
  const back = () => !done && setCurrent((c) => c.slice(0, -1));
  const submit = () => {
    if (done) return;
    const guess = current.join("");
    const problem = check(guess);
    if (problem) return flash(problem);
    setCurrent([]);
    onSubmit(guess);
  };

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") submit();
      else if (event.key === "Backspace") back();
      else if (event.key === "Escape") setOpen(null);
      else if ([...event.key].length === 1 && isFidel(event.key))
        add(event.key);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length) {
      const scored = scoreGuess(guesses[r], target);
      return letters(guesses[r]).map((ch, i) => ({ ch, mark: scored[i] }));
    }
    if (r === guesses.length && !done) {
      return Array.from({ length: WORD_LENGTH }, (_, i) => ({
        ch: current[i],
        active: i === current.length,
      }));
    }
    return Array.from({ length: WORD_LENGTH }, () => ({}));
  });

  return (
    <View style={[styles.wrap, wide && !done && styles.wrapWide]}>
      <View style={styles.boardCol}>
        <View style={styles.board}>
          {rows.map((row, r) => (
            <Animated.View
              key={r}
              style={[styles.row, r === guesses.length && shakeStyle]}
            >
              {row.map((cell, i) => (
                <Tile
                  size={tile}
                  key={`${r}-${i}-${cell.mark || ""}`}
                  ch={cell.ch}
                  mark={cell.mark}
                  active={cell.active}
                />
              ))}
            </Animated.View>
          ))}
        </View>

        <View style={[styles.messageSlot, c.messageSlot]}>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>

      {done ? null : (
        <View style={[styles.keyboard, wide && styles.keyboardWide]}>
          {open != null ? (
            <View style={[styles.orders, c.orders]}>
              {ordersOf(open).map((ch) => (
                <Pressable
                  key={ch}
                  onPress={() => add(ch)}
                  style={({ hovered }) => [
                    styles.orderKey,
                    c.orderKey,
                    hovered && styles.keyHover,
                  ]}
                >
                  <Text style={styles.orderText}>{ch}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setOpen(null)}
                style={styles.orderClose}
              >
                <Text style={styles.orderCloseText}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.keyboardHint, c.keyboardHint]}>
              Tap a consonant, then pick its form.
            </Text>
          )}

          <View style={[styles.keys, c.keys]}>
            {allowedConsonants.map((consonant) => {
              const mark = marks[consonant];
              return (
                <Pressable
                  key={consonant}
                  onPress={() => setOpen(open === consonant ? null : consonant)}
                  style={({ hovered }) => [
                    keySize,
                    hovered && styles.keyHover,
                    open === consonant && styles.keyOpen,
                    mark && {
                      backgroundColor: MARK_COLORS[mark],
                      borderColor: MARK_COLORS[mark],
                    },
                  ]}
                >
                  <Text style={[keyText, mark && styles.keyTextMarked]}>
                    {consonantBase(consonant)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={back}
              style={({ hovered }) => [
                styles.action,
                c.action,
                hovered && styles.keyHover,
              ]}
            >
              <Text style={styles.actionText}>⌫ Delete</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              style={({ hovered }) => [
                styles.action,
                c.action,
                styles.enter,
                current.length === WORD_LENGTH && styles.enterReady,
                hovered && styles.enterHover,
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  current.length === WORD_LENGTH && styles.enterText,
                ]}
              >
                Guess ↵
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// The consonants the keyboard offers: every one used by an allowed guess.
export function consonantsOf(words) {
  const set = new Set();
  for (const w of words)
    for (const ch of letters(w)) set.add(splitFidel(ch).consonant);
  return [...set].sort((a, b) => a - b);
}

const TILE = 60;

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.sm },
  wrapWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: spacing.xl,
  },
  boardCol: { alignItems: "center", gap: spacing.sm },
  keyboardWide: {
    alignSelf: "auto",
    flex: 1,
    maxWidth: 470,
    paddingTop: spacing.sm,
  },
  board: { gap: 6 },
  row: { flexDirection: "row", gap: 6 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tileFilled: { borderColor: colors.borderInk },
  tileActive: { borderColor: colors.primary },
  tileText: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 30,
    lineHeight: 40,
    color: colors.textPrimary,
  },
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
  keyboardHint: {
    ...typography.caption,
    color: colors.textMuted,
    height: 44,
    lineHeight: 44,
  },
  orders: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
  },
  orderKey: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 22,
    lineHeight: 30,
    color: colors.primaryDark,
  },
  orderClose: {
    width: 32,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  orderCloseText: { ...typography.label, color: colors.textMuted },
  keys: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
    maxWidth: 520,
  },
  key: {
    width: 40,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  keyHover: { borderColor: colors.primary },
  keyOpen: { borderColor: colors.primary, borderWidth: 2 },
  keyCompact: {
    width: 31,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  keyTextCompact: { fontFamily: fontFamily.ethiopicBold, fontSize: 17, lineHeight: 23, color: colors.textPrimary },
  keyText: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 19,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  keyTextMarked: { color: "#fff" },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { ...typography.label, color: colors.textPrimary },
  enter: { backgroundColor: colors.surfaceMuted },
  enterReady: { backgroundColor: colors.primary, borderColor: colors.primary },
  enterHover: { borderColor: colors.primaryDark },
  enterText: { color: colors.onPrimary },
  legend: { gap: 6, alignSelf: "stretch" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legendTile: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  legendTileText: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 14,
    color: "#fff",
  },
  legendText: { ...typography.caption, color: colors.textSecondary },
});

// Phone sizes: three rows of keys, the vowel forms on one line.
const compact = StyleSheet.create({
  orders: { gap: 4, minHeight: 38, flexWrap: "nowrap" },
  orderKey: { width: 38, height: 38 },
  orderClose: { width: 24, height: 38 },
  keys: { gap: 4, maxWidth: 350 },
  keyboardHint: { height: 38, lineHeight: 38 },
  messageSlot: { height: 22 },
  action: { height: 38 },
});
