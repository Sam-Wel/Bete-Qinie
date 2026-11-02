import { Pressable, StyleSheet, Text, View } from "react-native";
import { THEME_CHOICES, useColorTheme } from "../../hooks/useColorTheme";
import { colors, spacing, typography } from "../../theme";

// System / Light / Dark. Web only, so it renders nothing in a native build.
export function ThemeSwitch({ large = false }) {
  const { choice, setChoice, available } = useColorTheme();
  if (!available) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>APPEARANCE</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {THEME_CHOICES.map((c) => {
          const on = c.key === choice;
          return (
            <Pressable
              key={c.key}
              onPress={() => setChoice(c.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={({ hovered }) => [styles.option, large && styles.optionLarge, hovered && !on && styles.hover, on && styles.on]}
            >
              <Text style={[styles.text, on && styles.textOn]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  label: { ...typography.caption, fontSize: 11, color: colors.textSecondary, letterSpacing: 1, fontFamily: "Inter_600SemiBold" },
  row: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  option: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: "transparent" },
  optionLarge: { height: 40 },
  hover: { backgroundColor: colors.border },
  on: { backgroundColor: colors.surface, borderColor: colors.primary },
  text: { ...typography.label, fontSize: 13, color: colors.textSecondary },
  textOn: { color: colors.textPrimary },
});
