import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { ScreenContainer, Icon } from "../../../components/ui";
import { QINE, QINE_TYPES } from "../../../data/qine";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../../theme";

// ዜማ: ቅኔ to listen to, grouped by type. Each opens with its text and audio.
export default function ZemaList() {
  const groups = QINE_TYPES.map((t) => ({ ...t, items: QINE.filter((q) => q.type === t.key) })).filter((g) => g.items.length);

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <Text style={styles.lead}>Listen to each ቅኔ as it is chanted, read along, and repeat any part until you have it.</Text>
      {groups.map((g) => (
        <View key={g.key} style={styles.group}>
          <Text style={styles.groupTitle}>{g.name}</Text>
          {g.items
            .sort((a, b) => a.number - b.number)
            .map((q) => (
              <Link key={q.id} href={`/zema/${q.id}`} asChild>
              <Pressable accessibilityRole="link">
                <View style={styles.row}>
                <View style={styles.number}>
                  <Text style={styles.numberText}>{q.number}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.title}>{q.title}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {q.zema} · {q.lines[0]?.text}
                  </Text>
                </View>
                <Icon name="musical-notes-outline" size={18} color={colors.primary} />
                </View>
              </Pressable>
              </Link>
            ))}
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl },
  lead: { ...typography.body, color: colors.textSecondary },
  group: { gap: spacing.sm },
  groupTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 18, lineHeight: 28, color: colors.primaryDark },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  number: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: { fontFamily: fontFamily.latinBold, fontSize: 15, color: colors.primaryDark },
  title: { fontFamily: fontFamily.ethiopicBold, fontSize: 18, lineHeight: 28, color: colors.textPrimary },
  preview: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, lineHeight: 22, color: colors.textSecondary },
});
