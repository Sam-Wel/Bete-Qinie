import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontFamily, spacing } from "../../theme";

const ETHIOPIC = /[ሀ-፿]/;

// Text tabs on a faint line; the open one is underlined in gold. Hover or keyboard
// focus shows a faint underline in place of the browser's focus ring. Used wherever a
// page switches between views (መዐቀኒ, ግሲ ፈተና, ቃል).
// tabs: [{ key, label }]
export function Tabs({ tabs, value, onChange, center = false, style }) {
  return (
    <View style={[styles.tabs, center && styles.center, style]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ hovered, focused }) => [styles.tab, (hovered || focused) && !active && styles.tabHover, active && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                ETHIOPIC.test(tab.label) && styles.tabTextEthiopic,
                active && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.lg,
  },
  center: { justifyContent: "center" },
  // The underline sits on the faint line beneath the tabs.
  tab: {
    paddingVertical: 6,
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    outlineStyle: "none",
  },
  tabHover: { borderBottomColor: colors.border },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontFamily: fontFamily.latinRegular, fontSize: 15, lineHeight: 24, color: colors.textSecondary },
  tabTextEthiopic: { fontFamily: fontFamily.ethiopicRegular },
  tabTextActive: { fontFamily: fontFamily.latinSemiBold, color: colors.textPrimary },
});
