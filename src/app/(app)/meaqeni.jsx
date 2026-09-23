import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer, ScreenHeader } from "../../components/ui";
import { MeterChecker } from "../../components/MeterChecker";
import { MeterTables } from "../../components/MeterTables";
import { colors, fontFamily, radii, shadows, spacing } from "../../theme";

const TABS = [
  { key: "checker", label: "መስፈሪያ" },
  { key: "tables", label: "ሰንጠረዥ" },
];

function TabSwitch({ value, onChange }) {
  return (
    <View style={styles.tabs}>
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Meaqeni() {
  const [tab, setTab] = useState("checker");

  return (
    <ScreenContainer scroll keyboardAvoiding>
      <ScreenHeader title="መዐቀኒ" titleEthiopic />
      <TabSwitch value={tab} onChange={setTab} />

      {tab === "checker" ? <MeterChecker /> : <MeterTables />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    alignSelf: "flex-start",
    padding: 3,
    gap: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.lg,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  tabActive: { backgroundColor: colors.surface, ...shadows.card },
  tabText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.textSecondary },
  tabTextActive: { fontFamily: fontFamily.ethiopicBold, color: colors.primary },
});
