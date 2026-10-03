import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { colors, fontFamily, radii, spacing, typography } from "../theme";

// Rendered by the admin Stack rather than by each screen, so it sits in exactly the same
// place everywhere — the same reason TopNavBar is wired into the Drawer.
export function AdminTopBar() {
  const { user, signOut } = useAuth();

  const leave = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.replace("/admin")} hitSlop={8} style={styles.brandGroup}>
          <Text style={styles.brand}>ቤተ ቅኔ</Text>
          <View style={styles.chip}>
            <Text style={styles.chipText}>Admin</Text>
          </View>
        </Pressable>

        <View style={styles.spacer} />

        <Pressable onPress={() => router.replace("/")} hitSlop={8} style={styles.link}>
          <Text style={styles.linkText}>View site</Text>
        </Pressable>

        {user ? (
          <Pressable onPress={leave} hitSlop={8} style={styles.link}>
            <Text style={styles.linkMuted}>Sign out</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGold,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  brandGroup: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brand: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, color: colors.primary },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
  },
  chipText: {
    ...typography.caption,
    fontFamily: fontFamily.latinSemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.primaryDark,
  },
  spacer: { flex: 1 },
  link: { paddingVertical: 4, paddingHorizontal: spacing.xs },
  linkText: { ...typography.caption, fontFamily: fontFamily.latinSemiBold, color: colors.primary },
  linkMuted: { ...typography.caption, fontFamily: fontFamily.latinSemiBold, color: colors.textMuted },
});
