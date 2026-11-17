import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBadges } from "../../hooks/useDueCount";
import { NAV_GROUPS, TABS } from "../../lib/navigation";
import { colors, fontFamily, radii } from "../../theme";
import { Icon } from "../ui/Icon";
import { Harag } from "../manuscript/Harag";
import { LinearGradient } from "expo-linear-gradient";
import { useLabPiece } from "../../hooks/useLab";

const IN_TABS = new Set(TABS.map((t) => t.route));
const SECTION_ROUTES = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.route)));

// Phone navigation. `section` is the current page's section; sections without
// a tab of their own (መዐቀኒ, ዜማ, ...) light up More, where they live.
export function BottomTabs({ section }) {
  const goldTab = useLabPiece("goldTab");
  const badges = useBadges();
  const active = IN_TABS.has(section) ? section : SECTION_ROUTES.has(section) || section === "account" || section === "about" ? "more" : section;

  // One highlight that glides to the tab you tap (measured: the row's width, and how far
  // down its tab the icon pill sits).
  const [rowWidth, setRowWidth] = useState(0);
  const [pillY, setPillY] = useState(null);
  const index = TABS.findIndex((t) => t.route === active);
  const x = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (!rowWidth || index < 0) return;
    const tabWidth = (rowWidth - 2 * ROW_PAD) / TABS.length;
    const target = ROW_PAD + index * tabWidth + (tabWidth - PILL_W) / 2;
    if (placed.current) x.value = withSpring(target, { damping: 18, stiffness: 230 });
    else {
      x.value = target;
      placed.current = true;
    }
  }, [index, rowWidth]); // eslint-disable-line react-hooks/exhaustive-deps
  const glide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <SafeAreaView edges={["bottom"]} style={styles.bar}>
      <Harag pattern="pearls" thickness={7} />
      <View style={styles.row} accessibilityRole="tablist" onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}>
        {rowWidth && pillY != null && index >= 0 ? (
          <Animated.View pointerEvents="none" style={[styles.glide, goldTab && styles.glideGold, { top: ROW_TOP + pillY }, glide]}>
            {goldTab ? <LinearGradient colors={GOLD_LEAF} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
          </Animated.View>
        ) : null}
        {TABS.map((tab, i) => {
          const on = active === tab.route;
          return (
            <Pressable
              key={tab.route}
              onPress={() => router.navigate(tab.href)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={badges[tab.badge] ? `${tab.label}, ${badges[tab.badge]} to do` : tab.label}
              style={styles.tab}
            >
              <View style={styles.pill} onLayout={i === 0 ? (e) => setPillY(e.nativeEvent.layout.y) : undefined}>
                <Icon name={tab.icon} size={20} color={on ? (goldTab ? INK : colors.primaryDark) : colors.textSecondary} strokeWidth={on ? 2.2 : 1.9} />
                {badges[tab.badge] ? (
                  <View style={[styles.badge, tab.badge === "today" && !badges.due && styles.badgeCalm]}>
                    <Text style={[styles.badgeText, tab.badge === "today" && !badges.due && styles.badgeTextCalm]}>
                      {badges[tab.badge] > 99 ? "99+" : badges[tab.badge]}
                    </Text>
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

// Gold leaf for the lab's highlight, light in both themes, so the icon on it is ink-dark.
const GOLD_LEAF = ["#F6E7B0", "#E8C766", "#D4AF37"];
const INK = "#2B2013";

const ROW_PAD = 4;
const ROW_TOP = 6;
const PILL_W = 56;

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface },
  row: { flexDirection: "row", paddingTop: ROW_TOP, paddingBottom: 8, paddingHorizontal: ROW_PAD },
  tab: { flex: 1, alignItems: "center", gap: 3, minHeight: 50, justifyContent: "center" },
  pill: { width: PILL_W, height: 30, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  glide: { position: "absolute", left: 0, width: PILL_W, height: 30, borderRadius: radii.pill, backgroundColor: colors.primaryLight },
  glideGold: { overflow: "hidden", borderWidth: 1, borderColor: "#B8860B" },
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
  badgeCalm: { backgroundColor: colors.primaryDark },
  badgeTextCalm: { color: colors.background },
  label: { fontFamily: fontFamily.ethiopicBold, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  labelLatin: { fontFamily: fontFamily.latinSemiBold, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  labelOn: { color: colors.textPrimary },
});
