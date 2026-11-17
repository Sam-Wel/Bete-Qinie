import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../../lib/motion";

const LEAF = ["#E8C766", "#D4AF37", "#C99A2E", "#F2DB8B", "#B8860B"];
const PETAL = ["#A23B26", "#D9A13B", "#C9543B"];

// Flakes of gold leaf, with a few petals, drifting down over whatever it is placed in
// (absolutely, on top), turning as they fall. Each flake fades out, so nothing keeps
// moving. Nothing with Reduce Motion on. Mount it (or change its key) to play it.
export function GoldLeaf({ count = 26, fall = 260 }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const petal = i % 6 === 5;
        return {
          petal,
          x: 0.04 + Math.random() * 0.92,
          sway: 10 + Math.random() * 22,
          turns: 1 + Math.random() * 2,
          delay: Math.random() * 380,
          duration: 1600 + Math.random() * 1000,
          spin: (Math.random() - 0.5) * 540,
          color: petal ? PETAL[i % PETAL.length] : LEAF[i % LEAF.length],
          w: petal ? 7 + Math.random() * 3 : 5 + Math.random() * 6,
          h: petal ? 11 + Math.random() * 4 : 4 + Math.random() * 5,
        };
      }),
    [count]
  );
  if (reduced) return null;
  return (
    <View pointerEvents="none" style={styles.layer} aria-hidden accessible={false}>
      {pieces.map((p, i) => (
        <Flake key={i} {...p} fall={fall} />
      ))}
    </View>
  );
}

function Flake({ petal, x, sway, turns, delay, duration, spin, color, w, h, fall }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.sin) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => {
    const phase = t.value * turns * Math.PI * 2;
    return {
      opacity: t.value < 0.7 ? 1 : 1 - (t.value - 0.7) / 0.3,
      transform: [
        { translateX: Math.sin(phase) * sway },
        { translateY: fall * t.value },
        { rotate: `${spin * t.value}deg` },
        // Leaf flutters edge-on and back as it turns in the air.
        { scaleX: petal ? 1 : 0.25 + 0.75 * Math.abs(Math.cos(phase)) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.flake,
        { left: `${x * 100}%`, width: w, height: h, backgroundColor: color, borderRadius: petal ? w : 1 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, overflow: "visible", zIndex: 10 },
  flake: { position: "absolute", top: -6 },
});
