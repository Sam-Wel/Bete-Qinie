import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { ScreenContainer, Card, Button, ScreenHeader, EmptyState } from "../../components/ui";
import { colors, spacing, typography } from "../../theme";

const GAME_TYPE_LABELS = {
  dictionary_quiz: "Dictionary Quiz",
};

export default function Account() {
  const { user, profile, isAdmin, loading: authLoading, signOut } = useAuth();
  const [scores, setScores] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const fetchScores = async () => {
      setScoresLoading(true);
      const { data, error } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (cancelled) return;
      if (error) {
        console.error("Error fetching score history:", error);
      } else {
        setScores(data || []);
      }
      setScoresLoading(false);
    };

    fetchScores();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (authLoading) {
    return (
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!user) {
    return <Redirect href="/auth/sign-in" />;
  }

  return (
    <ScreenContainer scroll contentContainerStyle={styles.container}>
      <ScreenHeader title="Account" />

      <Card style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{profile?.display_name || user.email}</Text>
        <Text style={styles.email}>{user.email}</Text>

        {isAdmin && (
          <Button variant="secondary" onPress={() => router.push("/admin")} style={styles.button}>
            Admin Dashboard
          </Button>
        )}

        <Button variant="danger" onPress={handleSignOut} style={styles.button}>
          Sign Out
        </Button>
      </Card>

      <Text style={styles.sectionTitle}>Your Recent Scores</Text>

      {scoresLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : scores.length === 0 ? (
        <EmptyState message="No completed games yet -- play a game to see your scores here." icon="trophy-outline" />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {scores.map((session) => (
            <Card key={session.id} style={styles.scoreCard}>
              <Text style={styles.scoreGame}>
                {GAME_TYPE_LABELS[session.game_type] || session.game_type}
              </Text>
              <Text style={styles.scoreValue}>
                {session.score}
                {session.total_questions ? ` / ${session.total_questions}` : ""}
              </Text>
              <Text style={styles.scoreDate}>
                {new Date(session.created_at).toLocaleDateString()}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, maxWidth: 560, width: "100%", alignSelf: "center" },
  card: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.h2, fontSize: 20, color: colors.textPrimary },
  email: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  button: { marginTop: spacing.sm },
  sectionTitle: { ...typography.h2, fontSize: 18, color: colors.textPrimary, marginTop: spacing.md },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreGame: { ...typography.bodySemiBold, color: colors.textPrimary, flex: 1 },
  scoreValue: { ...typography.bodySemiBold, color: colors.primary, marginHorizontal: spacing.md },
  scoreDate: { ...typography.caption, color: colors.textMuted },
});
