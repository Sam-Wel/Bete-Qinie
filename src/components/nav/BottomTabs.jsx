import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDueCount } from "../../hooks/useDueCount";
import { NAV_GROUPS, TABS } from "../../lib/navigation";
import { colors, fontFamily, radii } from "../../theme";
import { Icon } from "../ui/Icon";

const IN_TABS = new Set(TABS.map((t) => t.route));
const SECTION_ROUTES = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.route)));

// Phone navigation. `section` is the current page's section; sections without
// a tab of their own (መዐቀኒ, ዜማ, ...) light up More, where they live.
export function BottomTabs({ section }) {
  const due = useDueCount();
  const active = IN_TABS.has(section) ? section : SECTION_ROUTES.has(section) || section === "account" ? "more" : section;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.bar}>
      <View style={styles.row} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const on = active === tab.route;
          return (
            <Pressable
              key={tab.route}
              onPress={() => router.navigate(tab.href)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={tab.badge === "due" && due ? `${tab.label}, ${due} due` : tab.label}
              style={styles.tab}
            >
              <View style={[styles.pill, on && styles.pillOn]}>
                <Icon name={tab.icon} size={20} color={on ? colors.primaryDark : colors.textSecondary} strokeWidth={on ? 2.2 : 1.9} />
                {tab.badge === "due" && due ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{due > 99 ? "99+" : due}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[tab.latin ? styles.labelLatin : styles.label, on && styles.labelOn]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: "row", paddingTop: 6, paddingBottom: 8, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: "center", gap: 3, minHeight: 50, justifyContent: "center" },
  pill: { width: 56, height: 30, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: colors.primaryLight },
  badge: {
    position: "absolute",
    top: -2,
    left: 32,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fontFamily.latinBold, fontSize: 10, color: colors.white },
  label: { fontFamily: fontFamily.ethiopicBold, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  labelLatin: { fontFamily: fontFamily.latinSemiBold, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  labelOn: { color: colors.textPrimary },
});
