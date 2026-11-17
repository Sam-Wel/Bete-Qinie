import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useWindowDimensions } from "../hooks/useWindowDimensions";
import { helpFor } from "../lib/help";
import { colors, fontFamily, radii, spacing, typography } from "../theme";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Sheet } from "./ui/Sheet";

// The "?" in a page's header: opens a short guide to that page (src/lib/help.js).
// Pages without a guide show no button.
export function HelpButton({ route }) {
  const [open, setOpen] = useState(false);
  const { height } = useWindowDimensions();
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

      <Sheet visible={open} onClose={() => setOpen(false)} label={`How to use ${guide.title}`}>
        <View style={styles.head}>
          <Text style={styles.kicker}>HOW TO USE</Text>
          <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.title}>{guide.title}</Text>
        {/* The points scroll; the Got it button below always stays in view. */}
        <ScrollView style={{ maxHeight: Math.max(220, height * 0.55) }} contentContainerStyle={styles.points}>
          {guide.points.map((point) => (
            <View key={point} style={styles.point}>
              <View style={styles.dot} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </ScrollView>
        <Button onPress={() => setOpen(false)} style={styles.gotIt}>
          Got it
        </Button>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  buttonHover: { backgroundColor: colors.surfaceMuted },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.primaryDark },
  title: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 30, color: colors.textPrimary },
  points: { gap: spacing.sm + 2, paddingTop: spacing.xs },
  point: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 9 },
  pointText: { ...typography.body, lineHeight: 24, color: colors.textPrimary, flex: 1 },
  gotIt: { alignSelf: "stretch", marginTop: spacing.sm },
});
