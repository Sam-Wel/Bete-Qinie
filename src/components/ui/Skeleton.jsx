import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { colors, radii, spacing } from "../../theme";

// Grey shapes where content is about to appear, gently pulsing, so a page keeps its
// shape while it loads instead of showing a lone spinner and then jumping.
export function Bone({ width = "100%", height = 14, radius = 6, style }) {
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[styles.bone, { width, height, borderRadius: radius }, animated, style]} />;
}

// A card-shaped placeholder: a title bar and some lines.
export function BoneCard({ lines = 2, tall = false, children }) {
  return (
    <View style={styles.card} accessibilityLabel="Loading">
      {children ?? (
        <>
          <Bone width={tall ? 120 : "45%"} height={tall ? 44 : 18} />
          {Array.from({ length: lines }, (_, i) => (
            <Bone key={i} width={i === lines - 1 ? "60%" : "100%"} />
          ))}
        </>
      )}
    </View>
  );
}

// A whole page of placeholder cards.
export function BonePage({ cards = [{ tall: true, lines: 2 }, { lines: 1 }, { lines: 3 }] }) {
  return (
    <View style={styles.page}>
      {cards.map((c, i) => (
        <BoneCard key={i} {...c} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bone: { backgroundColor: colors.border },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  page: { gap: spacing.lg, width: "100%" },
});
