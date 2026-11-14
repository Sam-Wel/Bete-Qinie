import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AdminHeader, Badge, Button, ScreenContainer } from "../../../../components/ui";
import { AdminOnly, ListRow, Notice, Panel, adminStyles } from "../../../../components/admin";
import { ProgressView } from "../../../../components/progress/ProgressView";
import { useGameLanguage } from "../../../../hooks/useGameLanguage";
import { useRpc } from "../../../../hooks/useRpc";
import { useVerbBank } from "../../../../hooks/useVerbBank";
import { ago, shortDate } from "../../../../lib/adminApi";
import { gameName } from "../../../../lib/gameNames";
import { statFromRow, withDue } from "../../../../lib/verbQuiz";
import { colors, spacing, typography } from "../../../../theme";

// One learner: their account, then the same view as their own እድገት page.
export default function Learner() {
  return (
    <AdminOnly>
      <LearnerPage />
    </AdminOnly>
  );
}

function LearnerPage() {
  const { id } = useLocalSearchParams();
  const data = useRpc("admin_learner", { p_user: id });
  const { bank, error: bankError } = useVerbBank();
  const [lang] = useGameLanguage();

  const stats = useMemo(
    () => Object.fromEntries((data.data?.progress || []).map((row) => [row.word_id, withDue(statFromRow(row))])),
    [data.data]
  );

  const user = data.data?.user;
  return (
    <ScreenContainer scroll contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Learner" fallback="/admin/learners" />
      <Notice tone="error">{data.error || bankError}</Notice>
      {!user || !bank ? (
        data.error ? null : <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <View style={styles.top}>
            <View style={adminStyles.row}>
              <Text style={styles.email}>{user.email}</Text>
              {user.role !== "user" ? <Badge label={user.role} tone="primary" /> : null}
            </View>
            {user.display_name ? <Text style={adminStyles.hint}>{user.display_name}</Text> : null}
            <Text style={adminStyles.muted}>{`joined ${shortDate(user.joined)} · last signed in ${ago(user.last_sign_in)}`}</Text>
            <Button
              size="sm"
              variant="secondary"
              style={{ alignSelf: "flex-start", marginTop: spacing.xs }}
              onPress={() => router.push({ pathname: "/admin/access", params: { email: user.email } })}
            >
              Change access
            </Button>
          </View>

          <ProgressView bank={bank} stats={stats} lang={lang} readOnly />

          <Panel title="Latest games and quizzes">
            {data.data.games.length ? (
              data.data.games.map((g, i, all) => (
                <ListRow
                  key={`${g.at}-${i}`}
                  title={gameName(g.game_type)}
                  subtitle={ago(g.at)}
                  right={<Text style={styles.score}>{g.total ? `${g.score}/${g.total}` : g.score}</Text>}
                  last={i === all.length - 1}
                />
              ))
            ) : (
              <Text style={adminStyles.hint}>No finished games yet.</Text>
            )}
          </Panel>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  top: { gap: 4 },
  email: { ...typography.h2, fontSize: 20, color: colors.textPrimary },
  score: { ...typography.bodySemiBold, color: colors.textPrimary },
});
