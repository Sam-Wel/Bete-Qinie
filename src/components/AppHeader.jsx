import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsWide } from "../hooks/useIsWide";
import { isEthiopic, pageInfo } from "../lib/navigation";
import { colors, fontFamily, spacing } from "../theme";
import { Brand } from "./DrawerContent";
import { Icon } from "./ui/Icon";

// Matches ScreenContainer's content column, so the title lines up with the page.
const COLUMN = 760;

// The header of every page: section, title and English name, with Back on
// pages that open from a hub (games, a blog post).
export function AppHeader({ route }) {
  const wide = useIsWide();
  const pathname = usePathname();
  const info = pageInfo(route.name);
  const inPost = route.name === "blog" && /^\/blog\/.+/.test(pathname);
  const backTo = inPost ? "/blog" : info.backTo;
  const section = inPost ? "ቅኔ አበው" : info.section;
  const english = inPost ? "Blog" : info.english;
  const titleFont = isEthiopic(info.title) ? styles.titleEthiopic : styles.titleLatin;

  const back = backTo ? (
    <Pressable
      onPress={() => router.navigate(backTo)}
      accessibilityRole="link"
      accessibilityLabel={`Back to ${section || "previous page"}`}
      hitSlop={6}
      style={({ hovered }) => [styles.back, hovered && styles.backHover]}
    >
      <Icon name="chevron-back" size={22} color={colors.primaryDark} strokeWidth={2.2} />
    </Pressable>
  ) : null;

  if (!wide) {
    return (
      <SafeAreaView edges={["top"]} style={styles.bar}>
        <View style={styles.phoneRow}>
          {back || <Brand compact />}
          <View style={{ flex: 1, minWidth: 0 }}>
            {backTo && section ? <Text style={styles.phoneSection}>{section}</Text> : null}
            <Text style={[titleFont, styles.phoneTitle]} numberOfLines={1}>
              {inPost ? "ቅኔ አበው" : info.title}
            </Text>
            {!backTo && english ? <Text style={styles.phoneEnglish}>{english}</Text> : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.bar}>
      <View style={styles.column}>
        {back}
        <View style={{ flex: 1, minWidth: 0 }}>
          {section ? <Text style={styles.section}>{isEthiopic(section) ? section : section.toUpperCase()}</Text> : null}
          <View style={styles.titleRow}>
            <Text style={[titleFont, styles.title]} numberOfLines={1}>
              {inPost ? "ቅኔ አበው" : info.title}
            </Text>
            {english && !inPost ? <Text style={styles.english}>{english}</Text> : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    boxShadow: `inset 0 -2px 0 ${colors.primaryLight}`,
  },
  column: {
    width: "100%",
    maxWidth: COLUMN,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  section: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.textSecondary },
  titleRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.md, flexWrap: "wrap" },
  title: { fontSize: 24, lineHeight: 32 },
  titleEthiopic: { fontFamily: fontFamily.ethiopicBold, color: colors.textPrimary },
  titleLatin: { fontFamily: fontFamily.latinBold, color: colors.textPrimary },
  english: { fontFamily: fontFamily.latinRegular, fontSize: 15, color: colors.textSecondary },
  back: {
    width: 40,
    height: 40,
    marginLeft: -10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backHover: { backgroundColor: colors.surfaceMuted },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    minHeight: 60,
  },
  phoneSection: { fontFamily: fontFamily.ethiopicBold, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  phoneTitle: { fontSize: 20, lineHeight: 27 },
  phoneEnglish: { fontFamily: fontFamily.latinRegular, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
});
