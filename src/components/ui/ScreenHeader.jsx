import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { colors, spacing, typography } from "../../theme";
import { OrnamentDivider } from "./OrnamentDivider";

export function ScreenHeader({ title, titleEthiopic = false, onBack, right, style }) {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.container}>
        <View style={styles.left}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
              <Icon name="chevron-back" size={20} color={colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}
          <Text style={titleEthiopic ? styles.titleEthiopic : styles.title}>{title}</Text>
        </View>
        {right ? <View>{right}</View> : null}
      </View>
      <OrnamentDivider style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { gap: spacing.xs, flex: 1 },
  backButton: { flexDirection: "row", alignItems: "center" },
  backText: { ...typography.body, color: colors.primary, marginLeft: 2 },
  title: { ...typography.h2, color: colors.textPrimary },
  titleEthiopic: { ...typography.h2Ethiopic, color: colors.textPrimary },
  divider: { marginVertical: spacing.xs, width: "100%" },
});
