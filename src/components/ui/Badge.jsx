import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../theme";

const TONES = {
  warning: { bg: colors.warning, text: colors.warningText },
  primary: { bg: colors.primaryLight, text: colors.primary },
  danger: { bg: colors.dangerLight, text: colors.dangerDark },
  muted: { bg: colors.surfaceMuted, text: colors.textSecondary },
};

export function Badge({ label, tone = "warning" }) {
  const { bg, text } = TONES[tone] ?? TONES.warning;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
  },
  label: { ...typography.caption, fontFamily: typography.label.fontFamily },
});
