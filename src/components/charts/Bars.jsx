import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { toDate } from "../../lib/dates";
import { colors, radii, spacing, typography } from "../../theme";

// Simple bars on a baseline, with a label under each; the tallest bar fills the height.
// With nothing to show yet, a short line says so instead of a row of empty bars.
// items: [{ count }], label(item, i) → text under the bar.
export function Bars({ items, label, highlightLast, empty }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.some((i) => i.count)) return <Text style={styles.empty}>{empty}</Text>;
  return (
    <View style={styles.bars}>
      {items.map((item, i) => (
        <View key={i} style={styles.barCol}>
          <Text style={styles.barValue}>{item.count || ""}</Text>
          <View style={styles.barTrack}>
            <Fill
              pct={item.count ? Math.max(4, (item.count / max) * 100) : 0}
              delay={i * 40}
              color={highlightLast && i === items.length - 1 ? colors.primaryDark : colors.primary}
            />
          </View>
          <Text style={styles.barLabel}>{label(item, i)}</Text>
        </View>
      ))}
    </View>
  );
}

// One bar, growing up from the baseline when it first appears.
function Fill({ pct, delay, color }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = 0;
    grow.value = withTiming(1, { duration: 550 + delay, easing: Easing.out(Easing.cubic) });
  }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ height: `${pct * grow.value}%` }));
  return <Animated.View style={[styles.barFill, { backgroundColor: color }, style]} />;
}

export const shortDate = (time) => toDate(time).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const styles = StyleSheet.create({
  bars: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, height: 130 },
  barCol: { flex: 1, alignItems: "center", gap: 4, height: "100%" },
  barValue: { ...typography.caption, fontSize: 11, color: colors.textSecondary, height: 14 },
  barTrack: { flex: 1, width: "100%", maxWidth: 28, justifyContent: "flex-end", borderBottomWidth: 2, borderBottomColor: colors.border },
  barFill: { width: "100%", backgroundColor: colors.primary, borderTopLeftRadius: radii.sm, borderTopRightRadius: radii.sm },
  empty: { ...typography.body, color: colors.textSecondary },
  barLabel: { ...typography.caption, fontSize: 11, color: colors.textMuted },
});
