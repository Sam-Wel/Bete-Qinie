import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { ScreenContainer, EmptyState } from "../../../components/ui";
import { LoopPlayer } from "../../../components/LoopPlayer";
import { QINE_BY_ID, typeName } from "../../../data/qine";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../../theme";

// One ቅኔ: its text, read along with the recording, and the repeat range to
// practise a part. Lines that have times get a button that loops just them.
export default function Qine() {
  const { id } = useLocalSearchParams();
  const qine = QINE_BY_ID[id];
  const [region, setRegion] = useState(null);

  if (!qine) {
    return (
      <ScreenContainer>
        <EmptyState message="This ቅኔ isn't here." icon="musical-notes-outline" />
        <Pressable onPress={() => router.navigate("/zema")} hitSlop={8}>
          <Text style={styles.back}>Back to ዜማ</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.page}>
      <View style={[styles.textCard, shadows.card]}>
        <Text style={styles.meta}>
          {typeName(qine.type)} · {qine.zema} · {qine.number}
        </Text>
        <Text style={styles.title}>{qine.title}</Text>
        <View style={styles.lines}>
          {qine.lines.map((line, i) => {
            const timed = line.start != null && line.end != null;
            const on = region?.line === i;
            return (
              <View key={i} style={[styles.lineRow, on && styles.lineOn]}>
                <Text style={styles.line}>{line.text}</Text>
                {timed ? (
                  <Pressable
                    onPress={() => setRegion({ start: line.start, end: line.end, line: i, key: Date.now() })}
                    style={styles.lineLoop}
                    hitSlop={6}
                  >
                    <Text style={styles.lineLoopText}>Loop line</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {qine.blogId ? (
        <Link href={`/blog/${qine.blogId}`} style={styles.readLink}>
          Read it in ቅኔ አበው ›
        </Link>
      ) : null}

      <LoopPlayer source={qine.audio} region={region} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  back: { ...typography.label, color: colors.primaryDark },
  readLink: { ...typography.label, color: colors.primaryDark, alignSelf: "center", marginTop: -spacing.sm },
  textCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.lg + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  meta: { fontFamily: fontFamily.ethiopicRegular, fontSize: 13, color: colors.textMuted, textAlign: "center" },
  title: { fontFamily: fontFamily.ethiopicBold, fontSize: 26, lineHeight: 38, color: colors.primaryDark, textAlign: "center" },
  lines: { gap: spacing.sm },
  lineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radii.md },
  lineOn: { backgroundColor: colors.primaryLight },
  line: { flex: 1, fontFamily: fontFamily.ethiopicRegular, fontSize: 22, lineHeight: 38, color: colors.textPrimary, textAlign: "center" },
  lineLoop: {
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  lineLoopText: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.primaryDark },
});
