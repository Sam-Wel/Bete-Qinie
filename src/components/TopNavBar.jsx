import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CrossMenuIcon } from "./ui/CrossMenuIcon";
import { colors, fontFamily, spacing } from "../theme";

// Persistent top bar for every Drawer screen -- always the exact same
// position (rendered by the navigator, not by each screen's own,
// sometimes-centered content), always shows the brand + menu toggle.
export function TopNavBar({ navigation }) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.bar}>
        <Pressable onPress={() => navigation.openDrawer()} hitSlop={10} style={styles.menuButton}>
          <CrossMenuIcon size={24} />
        </Pressable>
        <Text style={styles.brand}>ቤተ ቅኔ</Text>
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
    gap: spacing.sm + 2,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  brand: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 20,
    color: colors.primary,
  },
});
