import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { Button, Card, ScreenContainer } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { colors, spacing, typography } from "../../theme";

// Lives outside (protected) on purpose: the gate redirects here rather than rendering a
// screen in place of its navigator, which leaves the router with an unresolvable child.
export default function NoAccess() {
  const { user, profile } = useAuth();

  return (
    <ScreenContainer center>
      <Card style={styles.card}>
        <Text style={styles.title}>Admin only</Text>
        <Text style={styles.body}>
          {user
            ? `You are signed in as ${user.email}, but this account is not an admin.`
            : "This area is for admins."}
        </Text>
        {user && !profile ? (
          <Text style={styles.detail}>No profile row was found for this account.</Text>
        ) : null}
        <Button variant="secondary" onPress={() => router.replace("/")}>
          Back to the app
        </Button>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, alignItems: "center" },
  title: { ...typography.h2, color: colors.textPrimary },
  body: { ...typography.caption, color: colors.textSecondary, textAlign: "center", lineHeight: 19 },
  detail: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
});
