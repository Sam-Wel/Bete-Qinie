import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useWindowDimensions } from "../../hooks/useWindowDimensions";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Button } from "../../components/ui";
import { WordCard } from "../../components/WordCard";
import { ART } from "../../components/manuscript/art";
import { GoldLeaf } from "../../components/manuscript/GoldLeaf";
import { Harag } from "../../components/manuscript/Harag";
import { HaragProgress } from "../../components/manuscript/HaragProgress";
import { Numeral } from "../../components/manuscript/Numeral";
import { Parchment } from "../../components/manuscript/Parchment";
import { Plate } from "../../components/manuscript/Plate";
import { useIsWide } from "../../hooks/useIsWide";
import { toGeez } from "../../lib/geezNumerals";
import { useReducedMotion } from "../../lib/motion";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const CHAPTERS = [
  { n: 1, title: "ቅኔ ቤት", english: "The school" },
  { n: 2, title: "መጻሕፍት", english: "The books" },
  { n: 3, title: "ገጽ", english: "The page" },
];

const STEPS = ["Review the words that are due", "Learn today's 20 words", "Play with them"];
const SEBERE = { ti: ["ሰበረ"], am: ["ሰበረ"], en: ["break", "shatter"] };

// ናሙና: one page showing the manuscript look before any of it reaches the app: three
// scenes with real paintings (the camera moves, the figures never do), ሐረግ bands, ግዕዝ numerals, and the everyday parts (a word card, ዛሬ's steps and its
// weaving progress band). "Read as a page" (and Reduce Motion) turns it into a plain,
// still article. Not linked from any menu.
export default function Sample() {
  const wide = useIsWide();
  const reduced = useReducedMotion();
  const { height: vh } = useWindowDimensions();
  const [pageMode, setPageMode] = useState(null); // null: follow Reduce Motion
  const plain = pageMode ?? reduced;
  const [tops, setTops] = useState([0, 0, 0]);
  const [heights, setHeights] = useState([1, 1, 1]);
  const [active, setActive] = useState(0);
  const scrollRef = useRef(null);
  const scrollY = useSharedValue(0);

  const display = fontFamily.ethiopicBold;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // The chapter under the upper part of the screen, for the rail.
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
    setTops((t) => t.map((v, k) => (k === i ? y : v)));
    setHeights((h) => h.map((v, k) => (k === i ? height : v)));
  };
  const goTo = (i) => scrollRef.current?.scrollTo({ y: Math.max(0, tops[i] - 64), animated: !reduced });

  const scene = { display, plain, wide, scrollY, vh };
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
          <View style={styles.topRow}>
            {wide ? (
              // The open chapter, named at the top like a book's running head.
              <View style={styles.runningHead}>
                <Text style={[styles.runningNumeral, { fontFamily: display }]}>{toGeez(CHAPTERS[active].n)}</Text>
                <Text style={styles.runningName}>{CHAPTERS[active].english}</Text>
              </View>
            ) : (
              <Rail active={active} onGo={goTo} display={display} />
            )}
            <PageSwitch on={plain} onChange={() => setPageMode(!plain)} />
          </View>
        </View>

        <Scene
          index={0}
          chapter={CHAPTERS[0]}
          art={ART.ewostatewos}
          motion="pushin"
          priority
          onLayout={measure(0)}
          top={tops[0]}
          height={heights[0]}
          lead={
            <View>
              <Text style={[styles.opening, { fontFamily: display }, wide && styles.openingWide]}>ቤተ ቅኔ</Text>
              <Text style={styles.openingLine}>Learn ግዕዝ the way the ቅኔ ቤት teaches it.</Text>
            </View>
          }
          {...scene}
        >
          <Text style={styles.body}>
            In the church schools a teacher sits with his students, and the verbs are learned by heart, head by head (ርእስ),
            each with its ርባታ. ቤተ ቅኔ walks the same road, a few words a day.
          </Text>
        </Scene>

        <Scene index={1} chapter={CHAPTERS[1]} art={ART.luke} motion="parallax" sweep onLayout={measure(1)} top={tops[1]} height={heights[1]} {...scene}>
          <Text style={styles.body}>
            For centuries these books were copied by hand on parchment, with holy names and openings written in red and the
            chapters opened by a woven ሐረግ.
          </Text>
          <Text style={styles.body}>
            ቤተ ቅኔ's words come from two of them: <Text style={styles.rubric}>መጽሐፈ ግስ ወሰዋስው</Text> and{" "}
            <Text style={styles.rubric}>ፈለገ ግስ</Text>.
          </Text>
        </Scene>

        <Scene index={2} chapter={CHAPTERS[2]} onLayout={measure(2)} top={tops[2]} height={heights[2]} {...scene}>
          <Text style={styles.body}>
            The same book on every page of the app: a ሐረግ opens each entry, ግዕዝ headwords are written in red, and the ርባታ
            stands under an arch, like the canon tables of a Gospel book.
          </Text>
          <WordCard word="ሰበረ" meanings={SEBERE} formsOpen />
          <TodayDemo display={display} />
        </Scene>

        <View style={styles.footer}>
          <Harag pattern="checker" thickness={13} />
          <Text style={styles.footerText}>A sample only: nothing in the app changes until you choose what to keep.</Text>
        </View>
      </Animated.ScrollView>

      {wide ? (
        <Rail vertical active={active} onGo={goTo} display={display} />
      ) : null}
    </View>
  );
}

function Scene({ chapter, art, motion, priority, sweep, onLayout, top, height, display, plain, wide, scrollY, vh, lead, children }) {
  // The camera, never the figures: a slow push-in, or the painting drifting against the text.
  const camera = useAnimatedStyle(() => {
    if (plain) return { transform: [{ translateY: 0 }, { scale: 1 }] };
    const p = interpolate(scrollY.value + vh / 2 - top, [0, height], [0, 1], Extrapolation.CLAMP);
    return motion === "pushin"
      ? { transform: [{ translateY: 0 }, { scale: 1 + 0.08 * p }] }
      : { transform: [{ translateY: interpolate(p, [0, 1], [48, -48]) }, { scale: 1 }] };
  }, [plain, top, height, vh, motion]);

  const twoColumns = wide && !plain && art;
  return (
    <View onLayout={onLayout} style={[styles.scene, wide && !plain && { minHeight: vh * 0.82 }]}>
      <View style={styles.sceneHead}>
        <Numeral n={chapter.n} label={`Chapter ${chapter.n}`} style={[styles.sceneNumeral, { fontFamily: display }]} />
        <Text style={[styles.sceneTitle, { fontFamily: display }]}>{chapter.title}</Text>
        <Text style={styles.sceneEnglish}>{chapter.english}</Text>
      </View>
      <Harag pattern="braid" thickness={14} />
      {lead && !twoColumns ? lead : null}
      <View style={[styles.sceneBody, twoColumns && styles.sceneBodyWide]}>
        {art ? (
          <Animated.View style={[styles.plate, twoColumns && styles.plateWide, plain && styles.platePlain, camera]}>
            <Plate art={art} priority={priority} sweep={sweep && !plain} sizes="(min-width: 900px) 440px, 86vw" />
          </Animated.View>
        ) : null}
        <View style={[styles.sceneText, twoColumns && styles.sceneTextWide]}>
          {lead && twoColumns ? lead : null}
          {children}
        </View>
      </View>
    </View>
  );
}

// ፩ ፪ ፫: across the top on phones, down the left edge on wide screens.
function Rail({ vertical = false, active, onGo, display }) {
  return (
    <View style={vertical ? styles.railVertical : styles.railRow}>
      {CHAPTERS.map((c, i) => (
        <Pressable
          key={c.n}
          onPress={() => onGo(i)}
          accessibilityRole="link"
          accessibilityLabel={`Chapter ${c.n}: ${c.english}`}
          accessibilityState={{ selected: active === i }}
          hitSlop={6}
          style={({ hovered }) => [styles.railItem, hovered && styles.railHover]}
        >
          <Text style={[styles.railNumeral, { fontFamily: display }, active === i && styles.railOn]}>{toGeez(c.n)}</Text>
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

// ዛሬ's steps in ግዕዝ numerals, and its progress as a ሐረግ that weaves itself.
function TodayDemo({ display }) {
  const total = 20;
  const [learned, setLearned] = useState(17);
  const [burst, setBurst] = useState(0);
  const learn = () => {
    const next = Math.min(total, learned + 1);
    setLearned(next);
    if (next === total) setBurst((b) => b + 1);
  };
  return (
    <View style={styles.today}>
      <View style={styles.todayHead}>
        <Text style={[styles.todayTitle, { fontFamily: display }]}>ዛሬ</Text>
        <Text style={styles.todayEnglish}>Today</Text>
      </View>
      {STEPS.map((step, i) => (
        <View key={step} style={styles.step}>
          <View style={styles.stepNumber}>
            <Numeral n={i + 1} label={`Step ${i + 1}`} style={[styles.stepNumeral, { fontFamily: display }]} />
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
      <View style={styles.progress}>
        <HaragProgress value={learned} total={total} />
        <Text style={styles.progressText}>
          {learned === total ? "All 20 learned today." : `${learned} of ${total} learned today`}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button onPress={learn} disabled={learned >= total}>
          Learn a word
        </Button>
        <Button variant="ghost" onPress={() => setLearned(17)}>
          Start again
        </Button>
      </View>
      {burst && learned === total ? <GoldLeaf key={burst} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  margin: { position: "absolute", top: 0, bottom: 0 },
  content: { width: "100%", maxWidth: 1080, alignSelf: "center", paddingHorizontal: spacing.lg, paddingBottom: 96 },
  contentWide: { paddingHorizontal: 96 },
  contentPlain: { maxWidth: 720 },
  topBar: {
    backgroundColor: colors.background,
    paddingTop: spacing.sm,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.rubric,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },

  scene: { paddingTop: spacing.xxl + 8, gap: spacing.md },
  sceneHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.md, flexWrap: "wrap" },
  sceneNumeral: { fontSize: 26, lineHeight: 40, color: colors.rubric },
  sceneTitle: { fontSize: 34, lineHeight: 48, color: colors.textPrimary },
  sceneEnglish: { ...typography.label, color: colors.textSecondary, letterSpacing: 1.5, textTransform: "uppercase" },
  sceneBody: { gap: spacing.xl, paddingTop: spacing.md },
  sceneBodyWide: { flexDirection: "row", alignItems: "center", gap: 56 },
  plate: { width: "86%", maxWidth: 440, alignSelf: "center" },
  plateWide: { width: "44%", alignSelf: "center" },
  platePlain: { maxWidth: 360 },
  sceneText: { gap: spacing.md },
  sceneTextWide: { flex: 1 },

  opening: { fontSize: 54, lineHeight: 74, color: colors.rubric },
  openingWide: { fontSize: 72, lineHeight: 96 },
  openingLine: { ...typography.bodySemiBold, fontSize: 20, lineHeight: 28, color: colors.textPrimary },
  body: { ...typography.body, fontSize: 17, lineHeight: 27, color: colors.textPrimary, maxWidth: 560 },
  rubric: { color: colors.rubric, fontFamily: fontFamily.ethiopicBold },

  railRow: { flexDirection: "row", gap: spacing.sm },
  railVertical: { position: "absolute", left: 40, top: "38%", gap: spacing.md },
  railItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  railHover: { backgroundColor: colors.surfaceMuted },
  railNumeral: { fontSize: 22, lineHeight: 32, color: colors.textSecondary },
  railOn: { color: colors.rubric },
  runningHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  runningNumeral: { fontSize: 20, lineHeight: 28, color: colors.rubric },
  runningName: { ...typography.label, color: colors.textSecondary, letterSpacing: 1.2, textTransform: "uppercase" },

  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  switchText: { ...typography.label, color: colors.textSecondary },
  switchTrack: { width: 38, height: 22, borderRadius: 11, backgroundColor: colors.border, padding: 3 },
  switchTrackOn: { backgroundColor: colors.rubric },
  switchKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.surface },
  switchKnobOn: { transform: [{ translateX: 16 }] },

  today: {
    gap: spacing.md,
    padding: spacing.lg + 4,
    borderRadius: radii.lg + 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  todayHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  todayTitle: { fontSize: 30, lineHeight: 42, color: colors.rubric },
  todayEnglish: { ...typography.label, color: colors.textSecondary },
  step: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumeral: { fontSize: 17, lineHeight: 24, color: colors.primaryDark },
  stepText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  progress: { gap: spacing.sm, paddingTop: spacing.sm },
  progressText: { ...typography.label, color: colors.textSecondary },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },

  footer: { paddingTop: 64, gap: spacing.md, alignItems: "stretch" },
  footerText: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
});
