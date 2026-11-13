import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { helpFor } from "../lib/help";
import { colors, fontFamily, radii, spacing, typography } from "../theme";
import { Icon } from "./ui/Icon";

// The "?" in a page's header: opens a short guide to that page (src/lib/help.js).
// Pages without a guide show no button.
export function HelpButton({ route }) {
  const [open, setOpen] = useState(false);
  const guide = helpFor(route);
  if (!guide) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`How to use ${guide.title}`}
        hitSlop={8}
        style={({ hovered }) => [styles.button, hovered && styles.buttonHover]}
      >
        <Icon name="help-circle-outline" size={22} color={colors.primaryDark} strokeWidth={2} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close the guide">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.head}>
              <Text style={styles.kicker}>HOW TO USE</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.title}>{guide.title}</Text>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={styles.points}>
              {guide.points.map((point) => (
                <View key={point} style={styles.point}>
                  <View style={styles.dot} />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  buttonHover: { backgroundColor: colors.surfaceMuted },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
  sheet: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg + 4,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg + 2,
    gap: spacing.sm,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.primaryDark },
  title: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 30, color: colors.textPrimary },
  points: { gap: spacing.sm + 2, paddingTop: spacing.xs },
  point: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 9 },
  pointText: { ...typography.body, lineHeight: 24, color: colors.textPrimary, flex: 1 },
});
