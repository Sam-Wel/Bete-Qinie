import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

const ETHIOPIC = /[ሀ-᎟ⶀ-⷟]/;

// Ge'ez, Tigrinya and Amharic need the Ethiopic face; English keeps Inter.
export const scriptFont = (text) =>
  ETHIOPIC.test(text || "") ? { fontFamily: fontFamily.ethiopicRegular } : { fontFamily: fontFamily.latinRegular };

export const scriptFontBold = (text) =>
  ETHIOPIC.test(text || "") ? { fontFamily: fontFamily.ethiopicBold } : { fontFamily: fontFamily.latinBold };

export const percent = (value) => (value == null ? "—" : `${Math.round(value * 100)}%`);

export function Section({ title, right, children, style }) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Chip({ label, active, disabled, onPress, style, ethiopic }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled, style]}
    >
      <Text
        style={[
          styles.chipText,
          (ethiopic ?? ETHIOPIC.test(label)) && { fontFamily: fontFamily.ethiopicRegular },
          active && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Shares of a whole as one bar: mastered, known, learning, missed, new.
export const STATE_COLORS = {
  mastered: colors.mastered,
  known: colors.success,
  learning: colors.primary,
  shaky: colors.accent,
  new: colors.borderMuted,
};

// The share of words at each stage, as one bar. It fills from the left when it first
// appears.
export function StackedBar({ counts, total, height = 6, style }) {
  const [width, setWidth] = useState(0);
  const reveal = useSharedValue(0);
  useEffect(() => {
    if (width) reveal.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [width]); // eslint-disable-line react-hooks/exhaustive-deps
  const clip = useAnimatedStyle(() => ({ width: width * reveal.value }));
  return (
    <View style={[styles.bar, { height }, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.barClip, { height }, clip]}>
        <View style={[styles.barRow, { width, height }]}>
          {total
            ? ["mastered", "known", "learning", "shaky"].map((key) =>
                counts[key] ? (
                  <View key={key} style={{ flex: counts[key] / total, backgroundColor: STATE_COLORS[key] }} />
                ) : null
              )
            : null}
          {total ? <View style={{ flex: Math.max(0, total - ["mastered", "known", "learning", "shaky"].reduce((n, k) => n + (counts[k] || 0), 0)) / total }} /> : null}
        </View>
      </Animated.View>
    </View>
  );
}

export function Legend() {
  return (
    <View style={styles.legend}>
      {[
        ["mastered", "Mastered"],
        ["known", "Known"],
        ["learning", "Learning"],
        ["shaky", "Missed last time"],
        ["new", "New"],
      ].map(([key, label]) => (
        <View key={key} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: STATE_COLORS[key] }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export const shared = StyleSheet.create({
  muted: { ...typography.caption, color: colors.textMuted },
  hint: { ...typography.caption, color: colors.textSecondary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sectionTitle: { ...typography.label, color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipDisabled: { opacity: 0.45 },
  chipText: { ...typography.label, color: colors.textSecondary },
  chipTextActive: { color: colors.primaryDark },
  bar: {
    flexDirection: "row",
    borderRadius: radii.pill,
    overflow: "hidden",
    backgroundColor: colors.borderMuted,
  },
  barClip: { overflow: "hidden" },
  barRow: { flexDirection: "row" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, flexShrink: 1, maxWidth: "100%" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { ...typography.caption, color: colors.textSecondary },
});
