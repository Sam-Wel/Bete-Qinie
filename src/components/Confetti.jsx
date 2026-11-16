import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../lib/motion";

const COLORS = ["#e0a52a", "#7fb069", "#C9543B", "#f2c14e", "#8F5F08", "#d9c49a"];

// A short shower of confetti over whatever it is placed in (absolutely, on top).
// Nothing with Reduce Motion on.
export function Confetti({ count = 28, fall = 240 }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: 0.05 + Math.random() * 0.9,
        drift: (Math.random() - 0.5) * 120,
        rise: 20 + Math.random() * 50,
        delay: Math.random() * 200,
        duration: 1100 + Math.random() * 700,
        spin: (Math.random() - 0.5) * 900,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 4,
        h: 9 + Math.random() * 6,
      })),
    [count]
  );
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} fall={fall} />
      ))}
    </View>
  );
}

function Piece({ x, drift, rise, delay, duration, spin, color, w, h, fall }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => {
    // Up a little first, then down, drifting sideways and fading at the end.
    const y = -rise * Math.sin(Math.PI * Math.min(t.value * 2, 1)) + fall * t.value * t.value;
    return {
      opacity: t.value < 0.75 ? 1 : 1 - (t.value - 0.75) / 0.25,
      transform: [{ translateX: drift * t.value }, { translateY: y }, { rotate: `${spin * t.value}deg` }],
    };
  });
  return <Animated.View style={[styles.piece, { left: `${x * 100}%`, width: w, height: h, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, overflow: "visible", zIndex: 10 },
  piece: { position: "absolute", top: 18, borderRadius: 2 },
});
