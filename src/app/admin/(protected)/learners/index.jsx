import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AdminHeader, Badge, Button, ScreenContainer, TextField } from "../../../../components/ui";
import { AdminOnly, ListRow, Notice, Panel, StatTile, TileRow, adminStyles } from "../../../../components/admin";
import { Bars, shortDate } from "../../../../components/charts/Bars";
import { useRpc } from "../../../../hooks/useRpc";
import { ago } from "../../../../lib/adminApi";
import { gameName } from "../../../../lib/gameNames";
import { colors, spacing, typography } from "../../../../theme";

const SHOWN = 50;

// Learners & stats: how many people learn, how much, and which words they miss.
export default function Learners() {
  return (
    <AdminOnly>
      <LearnersPage />
    </AdminOnly>
  );
}

function LearnersPage() {
  const overview = useRpc("admin_overview");
  const people = useRpc("admin_learners");
  const hard = useRpc("dict_hard_words", { p_min: 3, p_limit: 10 });
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);
  const o = overview.data || {};

  const matching = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (people.data || []).filter((p) => !f || p.email?.toLowerCase().includes(f) || p.display_name?.toLowerCase().includes(f));
  }, [people.data, filter]);
  const shown = showAll ? matching : matching.slice(0, SHOWN);

  return (
    <ScreenContainer scroll contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Learners" />
      <Notice tone="error">{overview.error || people.error}</Notice>

      <TileRow>
        <StatTile value={o.accounts} label={`accounts${o.new_7d ? ` · ${o.new_7d} new this week` : ""}`} />
        <StatTile value={o.active_1d} label="active today" />
        <StatTile value={o.active_7d} label="active this week" />
        <StatTile value={o.active_30d} label="active this month" />
        <StatTile value={o.learned_7d} label="words learned this week" />
      </TileRow>

      <Panel title="Words learned per week · all learners">
        {o.learned_per_week ? (
          <Bars items={o.learned_per_week} label={(w) => shortDate(w.start)} highlightLast empty="No words learned in the last 8 weeks." />
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </Panel>

      <Panel title="New accounts per week">
        {o.new_per_week ? (
          <Bars items={o.new_per_week} label={(w) => shortDate(w.start)} highlightLast empty="No new accounts in the last 8 weeks." />
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </Panel>

      <Panel title="Games and quizzes · last 30 days">
        {(o.games_30d || []).length ? (
          o.games_30d.map((g, i, all) => (
            <ListRow key={g.game} title={gameName(g.game)} right={<Text style={styles.count}>{g.count}</Text>} last={i === all.length - 1} />
          ))
        ) : (
          <Text style={adminStyles.hint}>{overview.loading ? "Loading…" : "No finished games yet."}</Text>
        )}
      </Panel>

      <Panel
        title="Words learners miss most"
        right={
          <Button size="sm" variant="ghost" onPress={() => router.push({ pathname: "/admin/dictionary", params: { filter: "hard" } })}>
            See all
          </Button>
        }
      >
        <Text style={adminStyles.hint}>A word many people miss can have an unclear or wrong meaning. Words need 3 or more learners to show.</Text>
        <Notice tone="error">{hard.error}</Notice>
        {(hard.data || []).map((h, i, all) => (
          <ListRow
            key={h.word_id}
            title={h.word}
            subtitle={`missed ${Math.round(Number(h.miss_rate) * 100)}% of ${h.seen} answers · ${h.learners} learners`}
            onPress={() => router.push(`/admin/dictionary/${h.word_id}`)}
            last={i === all.length - 1}
          />
        ))}
        {hard.data && !hard.data.length ? <Text style={adminStyles.hint}>Not enough answers yet.</Text> : null}
      </Panel>

      <Panel title={people.data ? `People · ${matching.length}` : "People"}>
        <TextField value={filter} onChangeText={setFilter} placeholder="Find by email or name" autoCapitalize="none" />
        {people.loading && !people.data ? <ActivityIndicator color={colors.primary} /> : null}
        {shown.map((p, i) => (
          <ListRow
            key={p.user_id}
            title={p.display_name ? `${p.display_name} · ${p.email}` : p.email}
            subtitle={`active ${ago(p.last_active)} · joined ${shortDate(p.joined)} · ${p.practised} practised · ${p.known + p.mastered} known · ${p.games} games`}
            right={p.role !== "user" ? <Badge label={p.role} tone="primary" /> : null}
            onPress={() => router.push(`/admin/learners/${p.user_id}`)}
            last={i === shown.length - 1}
          />
        ))}
        {matching.length > shown.length ? (
          <Button size="sm" variant="secondary" onPress={() => setShowAll(true)}>
            {`Show all ${matching.length}`}
          </Button>
        ) : null}
        <Text style={adminStyles.muted}>Guests aren't listed: their progress stays on their own device.</Text>
      </Panel>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  count: { ...typography.bodySemiBold, color: colors.textPrimary, minWidth: 32, textAlign: "right" },
  gap: { gap: spacing.sm },
});
