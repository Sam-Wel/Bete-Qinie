import { StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { colors, spacing, typography } from "../../theme";

export function EmptyState({ message, icon }) {
  return (
    <View style={styles.container}>
      {icon ? (
        <Icon name={icon} size={32} color={colors.textMuted} style={styles.icon} />
      ) : null}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  icon: { marginBottom: spacing.sm },
  message: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
