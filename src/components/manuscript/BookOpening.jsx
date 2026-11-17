import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { CrossMenuIcon } from "../ui/CrossMenuIcon";
import { Harag } from "./Harag";
import { useLabPiece } from "../../hooks/useLab";
import { useReducedMotion } from "../../lib/motion";
import { colors, fontFamily, spacing, typography } from "../../theme";

const SEEN_KEY = "bete-qinie:opened:v1";
const LEATHER = "#5A3520";
const TOOLING = "#C99A2E";

let replay = null;
// The lab's "Play the opening now".
export function playOpening() {
  replay?.();
}

// The lab's "opening the book": on a first visit, a tooled-leather cover with its cross
// swings open onto a frontispiece (ቤተ ቅኔ in red inside a ሐረግ frame), then the page
// fades to the app. About two seconds; a tap anywhere skips it. Never with Reduce Motion.
export function BookOpening() {
  const on = useLabPiece("opening");
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    replay = () => setShow(true);
    return () => {
      replay = null;
    };
  }, []);

  useEffect(() => {
    if (!on || reduced) return;
    let seen = false;
    try {
      seen = globalThis.localStorage?.getItem(SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
    if (!seen) setShow(true);
  }, [on, reduced]);

  if (!show) return null;
  const done = () => {
    try {
      globalThis.localStorage?.setItem(SEEN_KEY, "1");
    } catch {
      // Without storage it may open again next visit; harmless.
    }
    setShow(false);
  };
  return <Opening onDone={done} />;
}

function Opening({ onDone }) {
  const open = useSharedValue(0);
  const shown = useSharedValue(1);

  useEffect(() => {
    open.value = withDelay(450, withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.cubic) }));
    shown.value = withDelay(
      2300,
      withTiming(0, { duration: 420 }, (finished) => {
        if (finished) runOnJS(onDone)();
      })
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = () => {
    shown.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  };

  const cover = useAnimatedStyle(() => ({ transform: [{ perspective: 1600 }, { rotateY: `${-108 * open.value}deg` }] }));
  const shade = useAnimatedStyle(() => ({ opacity: 0.5 * open.value }));
  const page = useAnimatedStyle(() => ({ opacity: shown.value }));

  return (
    <Animated.View style={[styles.overlay, page]} accessibilityViewIsModal accessibilityLabel="Opening ቤተ ቅኔ">
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityRole="button" accessibilityLabel="Skip the opening" />
      <View style={styles.book} pointerEvents="none">
        <View style={styles.page}>
          <Harag pattern="checker" thickness={13} />
          <View style={styles.pageMiddle}>
            <Harag vertical thickness={12} />
            <View style={styles.pageText}>
              <CrossMenuIcon size={40} color={colors.rubric} ground={colors.surface} />
              <Text style={styles.title}>ቤተ ቅኔ</Text>
              <Text style={styles.subtitle}>ግዕዝ · ቅኔ · ዜማ</Text>
            </View>
            <Harag vertical thickness={12} />
          </View>
          <Harag pattern="checker" thickness={13} />
        </View>
        <Animated.View style={[styles.cover, { transformOrigin: "left center" }, cover]}>
          <View style={styles.tooling}>
            <View style={styles.toolingInner}>
              <CrossMenuIcon size={104} color={TOOLING} ground={LEATHER} />
            </View>
          </View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.coverShade, shade]} />
        </Animated.View>
      </View>
      <Pressable onPress={skip} style={styles.skip} accessibilityRole="button" hitSlop={10}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </Animated.View>
  );
}

const BOOK_W = 280;
const BOOK_H = 380;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  book: { width: BOOK_W, height: BOOK_H },
  page: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pageMiddle: { flex: 1, flexDirection: "row", gap: spacing.sm },
  pageText: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  title: { fontFamily: fontFamily.ethiopicBold, fontSize: 46, lineHeight: 64, color: colors.rubric },
  subtitle: { ...typography.label, color: colors.textSecondary, letterSpacing: 1 },
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: LEATHER, borderRadius: 10, padding: 12 },
  tooling: { flex: 1, borderWidth: 2, borderColor: "#3B2214", borderRadius: 6, padding: 8 },
  toolingInner: { flex: 1, borderWidth: 1.5, borderColor: TOOLING, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  coverShade: { backgroundColor: "#000", borderRadius: 10 },
  skip: { position: "absolute", bottom: 40, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  skipText: { ...typography.label, color: colors.textSecondary },
});
