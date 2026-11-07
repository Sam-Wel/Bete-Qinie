import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useBadges } from "../hooks/useDueCount";
import { NAV_GROUPS, sectionOf } from "../lib/navigation";
import { colors, fontFamily, radii, spacing, typography } from "../theme";
import { ThemeSwitch } from "./nav/ThemeSwitch";
import { CrossMenuIcon } from "./ui/CrossMenuIcon";
import { Icon } from "./ui/Icon";

export function Brand({ compact = false }) {
  return (
    <View style={styles.brand}>
      <View style={[styles.brandTile, compact && styles.brandTileCompact]}>
        <CrossMenuIcon size={compact ? 26 : 30} />
      </View>
      {compact ? null : (
        <View>
          <Text style={styles.brandName}>ቤተ ቅኔ</Text>
          <Text style={styles.brandSub}>Ge'ez · Qine</Text>
        </View>
      )}
    </View>
  );
}

export function DueBadge({ count, suffix = "" }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? "99+" : count}
        {suffix}
      </Text>
    </View>
  );
}

function NavItem({ item, active, badges, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={({ hovered }) => [styles.item, hovered && !active && styles.itemHover, active && styles.itemActive]}
    >
      <Icon name={item.icon} size={18} color={colors.primaryDark} />
      <Text style={styles.itemTitle}>{item.title}</Text>
      <View style={styles.itemEnd}>
        {badges[item.badge] ? (
          <DueBadge count={badges[item.badge]} />
        ) : (
          <Text style={[styles.itemEnglish, active && styles.itemEnglishActive]}>{item.english}</Text>
        )}
      </View>
    </Pressable>
  );
}

// The sidebar: permanent on wide screens. Sections grouped, the current one
// highlighted, appearance and account at the bottom.
export function DrawerContent({ state, navigation }) {
  const { user, profile, isAdmin } = useAuth();
  const badges = useBadges();
  const current = sectionOf(state.routes[state.index]?.name);

  const go = (href) => {
    navigation.closeDrawer?.();
    router.navigate(href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Brand />
        {NAV_GROUPS.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.items.map((item) => (
              <NavItem key={item.route} item={item} active={current === item.route} badges={badges} onPress={() => go(item.href)} />
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <ThemeSwitch />
          {user ? (
            <Pressable
              onPress={() => go("/account")}
              style={({ hovered }) => [styles.account, (hovered || current === "account") && styles.itemHover]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(profile?.display_name || user.email || "?").slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName} numberOfLines={1}>
                  {profile?.display_name || "Account"}
                </Text>
                <Text style={styles.accountSub} numberOfLines={1}>
                  Progress synced
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={() => go("/auth/sign-in")} style={({ hovered }) => [styles.account, hovered && styles.itemHover]}>
              <Icon name="log-in-outline" size={18} color={colors.primaryDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>Sign in</Text>
                <Text style={styles.accountSub}>Keep progress on every device</Text>
              </View>
            </Pressable>
          )}
          {isAdmin ? (
            <Pressable onPress={() => go("/admin")} style={({ hovered }) => [styles.adminLink, hovered && styles.itemHover]}>
              <Icon name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.adminText}>Admin dashboard</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.xl - 4, gap: spacing.lg + 2 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6 },
  brandTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTileCompact: { width: 36, height: 36, borderRadius: 10 },
  brandName: { fontFamily: fontFamily.ethiopicBold, fontSize: 19, lineHeight: 24, color: colors.primaryDark },
  brandSub: { ...typography.caption, fontSize: 12, color: colors.textSecondary },
  group: { gap: 2 },
  groupLabel: {
    fontFamily: fontFamily.latinSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.textSecondary,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: radii.md },
  itemHover: { backgroundColor: colors.surfaceMuted },
  itemActive: { backgroundColor: colors.primaryLight },
  itemTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  itemEnd: { marginLeft: "auto" },
  itemEnglish: { ...typography.caption, fontSize: 12, color: colors.textSecondary },
  itemEnglishActive: { color: colors.primaryDark },
  badge: {
    minWidth: 20,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fontFamily.latinBold, fontSize: 11, color: colors.white },
  footer: { marginTop: "auto", gap: spacing.sm + 2, paddingTop: spacing.md },
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fontFamily.latinBold, fontSize: 13, color: colors.primaryDark },
  accountName: { ...typography.label, color: colors.textPrimary },
  accountSub: { ...typography.caption, fontSize: 12, color: colors.textSecondary },
  adminLink: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radii.md },
  adminText: { ...typography.caption, color: colors.textSecondary },
});
