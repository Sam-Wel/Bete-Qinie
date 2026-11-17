import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useLabPiece } from "../../hooks/useLab";
import { useReducedMotion } from "../../lib/motion";
import { colors } from "../../theme";

// Pages whose title has already been written in this session.
const written = new Set();

// The lab's "ink-written titles": the first time a page opens in a session, its title is
// uncovered from the start of the line, like ink following a reed pen. A cover the colour
// of the header slides off, with a soft edge. Give it a key per page.
export function InkReveal({ id, children }) {
  const on = useLabPiece("inkTitles");
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | writing | done
  const x = useSharedValue(0);
  const fresh = on && !reduced && !written.has(id);

  useEffect(() => {
    if (!fresh || !width || phase !== "idle") return;
    written.add(id);
    setPhase("writing");
    x.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) });
    const done = setTimeout(() => setPhase("done"), 950);
    return () => clearTimeout(done);
  }, [fresh, width, phase, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cover = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (width + 30) }] }));
  if (phase === "done" || (!fresh && phase === "idle")) return children;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.wrap}>
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cover, cover]}>
        {[0.2, 0.45, 0.7, 0.9].map((o) => (
          <View key={o} style={[styles.edge, { opacity: o }]} />
        ))}
        <View style={styles.solid} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", alignSelf: "flex-start", maxWidth: "100%" },
  cover: { flexDirection: "row" },
  edge: { width: 5, backgroundColor: colors.surface },
  solid: { flex: 1, backgroundColor: colors.surface },
});
