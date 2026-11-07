import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { DueBadge } from "../../components/DrawerContent";
import { ThemeSwitch } from "../../components/nav/ThemeSwitch";
import { Icon, ScreenContainer } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useBadges } from "../../hooks/useDueCount";
import { NAV_GROUPS } from "../../lib/navigation";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

function Row({ icon, title, english, badge, last, onPress, latin }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ hovered, pressed }) => [styles.row, !last && styles.rowLine, (hovered || pressed) && styles.rowHover]}>
      <Icon name={icon} size={18} color={colors.primaryDark} />
      <Text style={latin ? styles.rowTitleLatin : styles.rowTitle}>{title}</Text>
      <View style={styles.rowEnd}>{badge || (english ? <Text style={styles.rowEnglish}>{english}</Text> : null)}</View>
    </Pressable>
  );
}

// Phones: every section of the app in its group, plus account and appearance.
export default function More() {
  const { user, profile, isAdmin } = useAuth();
  const badges = useBadges();

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <View style={styles.list}>
        {user ? (
          <Row icon="person-circle-outline" title={profile?.display_name || "Account"} english="Account" latin last onPress={() => router.navigate("/account")} />
        ) : (
          <>
            <Row icon="log-in-outline" title="Sign in" english="Keep progress everywhere" latin onPress={() => router.navigate("/auth/sign-in")} />
            <Row icon="person-add-outline" title="Create an account" latin last onPress={() => router.navigate("/auth/sign-up")} />
          </>
        )}
      </View>

      {NAV_GROUPS.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <View style={styles.list}>
            {group.items.map((item, i) => (
              <Row
                key={item.route}
                icon={item.icon}
                title={item.title}
                english={item.english}
                badge={badges[item.badge] ? <DueBadge count={badges[item.badge]} suffix={item.badge === "due" ? " due" : " to do"} /> : null}
                last={i === group.items.length - 1}
                onPress={() => router.navigate(item.href)}
              />
            ))}
          </View>
        </View>
      ))}

      {isAdmin ? (
        <View style={styles.list}>
          <Row icon="shield-checkmark-outline" title="Admin dashboard" latin last onPress={() => router.navigate("/admin")} />
        </View>
      ) : null}

      <ThemeSwitch large />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  group: { gap: 6 },
  groupLabel: { fontFamily: fontFamily.latinSemiBold, fontSize: 12, letterSpacing: 1, color: colors.textSecondary, paddingLeft: 4 },
  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg + 2,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: 14, minHeight: 52 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.borderMuted },
  rowHover: { backgroundColor: colors.surfaceMuted },
  rowTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  rowTitleLatin: { ...typography.bodySemiBold, color: colors.textPrimary },
  rowEnd: { marginLeft: "auto" },
  rowEnglish: { ...typography.caption, color: colors.textSecondary },
});
