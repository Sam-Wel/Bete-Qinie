import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors, radii, spacing, typography } from "../../theme";
import { scriptFont, scriptFontBold } from "../verbQuiz/shared";

// Four answers, two by two on wide screens. After a pick the right one turns
// green and a wrong pick red. Keys 1–4 answer on a computer.
export function Choices({ options, answerIndex, chosen, onPick, geez = false, dark = false, disabled = false }) {
  const wide = useWindowDimensions().width >= 600;
  const locked = chosen != null || disabled;

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    const onKey = (event) => {
      if (locked || event.metaKey || event.ctrlKey) return;
      const n = Number(event.key);
      if (n >= 1 && n <= options.length) onPick(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <View style={[styles.grid, wide && styles.gridWide]}>
      {options.map((text, i) => {
        const state = chosen == null ? null : i === answerIndex ? "right" : i === chosen ? "wrong" : "dim";
        return (
          <Pressable
            key={`${i}-${text}`}
            onPress={() => !locked && onPick(i)}
            accessibilityRole="button"
            accessibilityLabel={`${i + 1}. ${text}`}
            style={({ hovered, pressed }) => [
              styles.option,
              wide && styles.optionWide,
              dark && styles.optionDark,
              (hovered || pressed) && !locked && (dark ? styles.hoverDark : styles.hover),
              state === "right" && styles.right,
              state === "wrong" && styles.wrong,
              state === "dim" && styles.dim,
            ]}
          >
            <View style={[styles.key, dark && styles.keyDark, state === "right" && styles.keyRight, state === "wrong" && styles.keyWrong]}>
              <Text style={[styles.keyText, (state === "right" || state === "wrong") && { color: "#fff" }]}>
                {state === "right" ? "✓" : state === "wrong" ? "✕" : i + 1}
              </Text>
            </View>
            <Text
              style={[
                geez ? scriptFontBold(text) : scriptFont(text),
                styles.text,
                geez && styles.textGeez,
                dark && styles.textDark,
                (state === "right" || state === "wrong") && dark && { color: colors.textPrimary },
              ]}
            >
              {text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm },
  gridWide: { flexDirection: "row", flexWrap: "wrap" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionWide: { flexBasis: "45%", flexGrow: 1 },
  optionDark: { backgroundColor: "#241a0d", borderColor: "#5a4422" },
  hover: { borderColor: colors.primary },
  hoverDark: { borderColor: "#e0a52a" },
  right: { borderColor: colors.success, backgroundColor: colors.successLight },
  wrong: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  dim: { opacity: 0.5 },
  key: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  keyDark: { backgroundColor: "#3a2c17" },
  keyRight: { backgroundColor: colors.success },
  keyWrong: { backgroundColor: colors.accent },
  keyText: { ...typography.label, color: colors.textSecondary },
  text: { flex: 1, fontSize: 17, lineHeight: 25, color: colors.textPrimary },
  textGeez: { fontSize: 22, lineHeight: 32 },
  textDark: { color: "#f6e2ac" },
});
