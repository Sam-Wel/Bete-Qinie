import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Harag } from "./Harag";
import { Numeral } from "./Numeral";
import { Parchment } from "./Parchment";
import { Plate } from "./Plate";
import { useIsWide } from "../../hooks/useIsWide";
import { useWindowDimensions } from "../../hooks/useWindowDimensions";
import { toGeez } from "../../lib/geezNumerals";
import { useReducedMotion } from "../../lib/motion";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

// A page told in chapters, like a manuscript. Each chapter opens with its ግዕዝ numeral,
// its title and a ሐረግ, with a painting beside the text, never under it. The camera
// moves as you scroll (a slow push-in, or the painting drifting against the text); the
// figures never do. The chapters are listed ፩ ፪ ፫ … down the left edge on wide screens,
// with the open one named at the top like a running head, and across the top on
// phones. "Read as a page", on by itself with Reduce Motion, makes it a plain, still
// article.
//
// chapters: [{ key, title, english, art?, motion?: "pushin" | "parallax", sweep?, lead?, body }]
// footer: shown after the last chapter (the colophon).
export function Story({ chapters, footer }) {
  const wide = useIsWide();
  const reduced = useReducedMotion();
  const { height: vh } = useWindowDimensions();
  const [pageMode, setPageMode] = useState(null); // null: follow Reduce Motion
  const plain = pageMode ?? reduced;
  // Where each chapter starts: the first one's top plus the heights before it. (On the
  // web a view reports its size changing but not its position moving, so a chapter that
  // grows, as when the ርባታ table loads, would leave the later ones' measured tops stale.)
  const [firstTop, setFirstTop] = useState(0);
  const [heights, setHeights] = useState(() => chapters.map(() => 0));
  const tops = heights.map((_, i) => (heights[0] ? firstTop + heights.slice(0, i).reduce((a, b) => a + b, 0) : 0));
  const [active, setActive] = useState(0);
  const scrollRef = useRef(null);
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // The chapter under the upper part of the screen, for the rail and the running head.
  useAnimatedReaction(
    () => {
      const line = scrollY.value + vh * 0.4;
      let index = 0;
      for (let i = 0; i < tops.length; i += 1) if (tops[i] && line >= tops[i]) index = i;
      return index;
    },
    (index, previous) => {
      if (index !== previous) runOnJS(setActive)(index);
    },
    [tops, vh]
  );

  const measure = (i) => (e) => {
    const { y, height } = e.nativeEvent.layout;
    if (i === 0) setFirstTop(y);
    setHeights((h) => (h[i] === height ? h : h.map((v, k) => (k === i ? height : v))));
  };
  const goTo = (i) => scrollRef.current?.scrollTo({ y: Math.max(0, tops[i] - 64), animated: !reduced });
  const open = chapters[active] ?? chapters[0];

  return (
    <View style={styles.root}>
      <Parchment ruled={wide && !plain} />
      {wide && !plain ? (
        <>
          <Harag vertical pattern="braid" thickness={14} style={[styles.margin, { left: 14 }]} />
          <Harag vertical pattern="braid" thickness={14} style={[styles.margin, { right: 14 }]} />
        </>
      ) : null}

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0]}
        contentContainerStyle={[styles.content, wide && styles.contentWide, plain && styles.contentPlain]}
      >
        <View style={styles.topBar}>
          {wide ? (
            <View style={styles.runningHead}>
              <Text style={styles.runningNumeral}>{toGeez(active + 1)}</Text>
              <Text style={styles.runningName}>{open.english}</Text>
            </View>
          ) : (
            <Rail chapters={chapters} active={active} onGo={goTo} />
          )}
          <PageSwitch on={plain} onChange={() => setPageMode(!plain)} />
        </View>

        {chapters.map((c, i) => (
          <Chapter
            key={c.key}
            n={i + 1}
            chapter={c}
            first={i === 0}
            onLayout={measure(i)}
            top={tops[i]}
            height={heights[i] || 1}
            plain={plain}
            wide={wide}
            scrollY={scrollY}
            vh={vh}
          />
        ))}

        {footer}
      </Animated.ScrollView>

      {wide ? <Rail vertical chapters={chapters} active={active} onGo={goTo} /> : null}
    </View>
  );
}

function Chapter({ n, chapter, first, onLayout, top, height, plain, wide, scrollY, vh }) {
  const { title, english, art, motion = "parallax", sweep = false, lead, body } = chapter;
  // The camera, never the figures.
  const camera = useAnimatedStyle(() => {
    if (plain) return { transform: [{ translateY: 0 }, { scale: 1 }] };
    const p = interpolate(scrollY.value + vh / 2 - top, [0, height], [0, 1], Extrapolation.CLAMP);
    return motion === "pushin"
      ? { transform: [{ translateY: 0 }, { scale: 1 + 0.08 * p }] }
      : { transform: [{ translateY: interpolate(p, [0, 1], [44, -44]) }, { scale: 1 }] };
  }, [plain, top, height, vh, motion]);

  const twoColumns = wide && !plain && art;
  return (
    <View onLayout={onLayout} style={[styles.chapter, wide && !plain && art && { minHeight: vh * 0.8 }]}>
      <View style={styles.head}>
        <Numeral n={n} label={`Chapter ${n}`} style={styles.numeral} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.english}>{english}</Text>
      </View>
      <Harag pattern="braid" thickness={14} />
      {lead && !twoColumns ? lead : null}
      <View style={[styles.body, twoColumns && styles.bodyWide]}>
        {art ? (
          <Animated.View style={[styles.plate, twoColumns && styles.plateWide, plain && styles.platePlain, camera]}>
            <Plate art={art} priority={first} sweep={sweep && !plain} sizes="(min-width: 900px) 440px, 86vw" />
          </Animated.View>
        ) : null}
        <View style={[styles.text, twoColumns && styles.textWide]}>
          {lead && twoColumns ? lead : null}
          {body}
        </View>
      </View>
    </View>
  );
}

// ፩ ፪ ፫ …: across the top on phones, down the left edge on wide screens.
function Rail({ vertical = false, chapters, active, onGo }) {
  return (
    <View style={vertical ? styles.railVertical : styles.railRow}>
      {chapters.map((c, i) => (
        <Pressable
          key={c.key}
          onPress={() => onGo(i)}
          accessibilityRole="link"
          accessibilityLabel={`Chapter ${i + 1}: ${c.english}`}
          accessibilityState={{ selected: active === i }}
          hitSlop={4}
          style={({ hovered }) => [styles.railItem, hovered && styles.railHover]}
        >
          <Text style={[styles.railNumeral, active === i && styles.railOn]}>{toGeez(i + 1)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PageSwitch({ on, onChange }) {
  return (
    <Pressable onPress={onChange} accessibilityRole="switch" accessibilityState={{ checked: on }} hitSlop={6} style={styles.switchRow}>
      <Text style={styles.switchText}>Read as a page</Text>
      <View style={[styles.switchTrack, on && styles.switchTrackOn]}>
        <View style={[styles.switchKnob, on && styles.switchKnobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  margin: { position: "absolute", top: 0, bottom: 0 },
  content: { width: "100%", maxWidth: 1080, alignSelf: "center", paddingHorizontal: spacing.lg, paddingBottom: 96 },
  contentWide: { paddingHorizontal: 96 },
  contentPlain: { maxWidth: 720 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.rubric,
  },
  runningHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  runningNumeral: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, lineHeight: 28, color: colors.rubric },
  runningName: { ...typography.label, color: colors.textSecondary, letterSpacing: 1.2, textTransform: "uppercase" },

  chapter: { paddingTop: spacing.xxl + 8, gap: spacing.md },
  head: { flexDirection: "row", alignItems: "baseline", gap: spacing.md, flexWrap: "wrap" },
  numeral: { fontFamily: fontFamily.ethiopicBold, fontSize: 26, lineHeight: 40, color: colors.rubric },
  title: { fontFamily: fontFamily.ethiopicBold, fontSize: 32, lineHeight: 46, color: colors.textPrimary },
  english: { ...typography.label, color: colors.textSecondary, letterSpacing: 1.5, textTransform: "uppercase" },
  body: { gap: spacing.xl, paddingTop: spacing.md },
  bodyWide: { flexDirection: "row", alignItems: "center", gap: 56 },
  plate: { width: "86%", maxWidth: 440, alignSelf: "center" },
  plateWide: { width: "44%", alignSelf: "center" },
  platePlain: { maxWidth: 360 },
  text: { gap: spacing.md },
  textWide: { flex: 1 },

  railRow: { flexDirection: "row", flexWrap: "wrap", gap: 2, flexShrink: 1 },
  railVertical: { position: "absolute", left: 40, top: "30%", gap: spacing.sm },
  railItem: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: radii.sm },
  railHover: { backgroundColor: colors.surfaceMuted },
  railNumeral: { fontFamily: fontFamily.ethiopicBold, fontSize: 19, lineHeight: 28, color: colors.textSecondary },
  railOn: { color: colors.rubric },

  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  switchText: { ...typography.label, color: colors.textSecondary },
  switchTrack: { width: 38, height: 22, borderRadius: 11, backgroundColor: colors.border, padding: 3 },
  switchTrackOn: { backgroundColor: colors.rubric },
  switchKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.surface },
  switchKnobOn: { transform: [{ translateX: 16 }] },
});
