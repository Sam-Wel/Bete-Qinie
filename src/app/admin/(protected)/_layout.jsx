import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect, Stack, router } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { Button, Card, ScreenContainer } from "../../../components/ui";
import { colors, spacing, typography } from "../../../theme";

export default function ProtectedLayout() {
  const { isAdmin, loading, user, profile } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // Only a visitor with no session belongs on the sign-in screen. Sending a signed-in
  // user there just looks like the login failed.
  if (!user) return <Redirect href="/auth/sign-in" />;

  if (!isAdmin) {
    return (
      <ScreenContainer center>
        <Card style={styles.card}>
          <Text style={styles.title}>Admin only</Text>
          <Text style={styles.body}>
            You are signed in as {user.email}, but this account is not an admin
            {profile ? "" : " — and no profile row was found for it"}.
          </Text>
          <Button variant="secondary" onPress={() => router.replace("/")}>
            Back to the app
          </Button>
        </Card>
      </ScreenContainer>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { gap: spacing.md, alignItems: "center" },
  title: { ...typography.h2, color: colors.textPrimary },
  body: { ...typography.caption, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
});
