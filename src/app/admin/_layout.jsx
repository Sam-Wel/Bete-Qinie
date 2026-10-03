import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { Button } from "../../components/ui";
import { colors, spacing, typography } from "../../theme";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(protected)" />
    </Stack>
  );
}

// Expo Router renders this instead of the segment when a child throws. Without it a
// render error anywhere under /admin is a white page with nothing to go on.
export function ErrorBoundary({ error, retry }) {
  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Something broke on this page</Text>
        <Text style={styles.message}>{error?.message ?? "Unknown error"}</Text>
        {error?.stack ? <Text style={styles.stack}>{String(error.stack).slice(0, 1200)}</Text> : null}

        <View style={styles.actions}>
          <Button onPress={retry}>Try again</Button>
          <Button variant="secondary" onPress={() => router.replace("/")}>
            Back to the app
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h2, color: colors.dangerDark },
  message: { ...typography.bodySemiBold, color: colors.textPrimary },
  stack: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: "monospace",
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: 8,
  },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
