import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Icon } from "./Icon";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

// Back and title share one row here, rather than stacking as ScreenHeader does, so the
// admin pages lead with their content instead of a banner.
export function AdminHeader({ title, titleEthiopic = false, right, onBack, fallback = "/admin" }) {
  // router.back() is a no-op when the page was opened directly, which is how every admin
  // back button ended up dead. Fall back to a real destination.
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable onPress={goBack} hitSlop={10} style={styles.back}>
          <Icon name="chevron-back" size={15} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        {title ? (
          <Text style={[styles.title, titleEthiopic && styles.titleEthiopic]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}

        <View style={styles.spacer} />
        {right}
      </View>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backText: { ...typography.caption, color: colors.primary, fontFamily: fontFamily.latinSemiBold },
  title: { ...typography.h2, fontSize: 19, color: colors.textPrimary, flexShrink: 1 },
  titleEthiopic: { fontFamily: fontFamily.ethiopicBold, lineHeight: 28 },
  spacer: { flex: 1 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginTop: spacing.md },
});
