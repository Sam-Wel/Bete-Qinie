import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AdminHeader, Button, EmptyState, ScreenContainer } from "../../../components/ui";
import { AdminOnly, Chips, Notice, Panel, adminStyles, scriptStyle } from "../../../components/admin";
import { ago, downloadText, rpc } from "../../../lib/adminApi";
import { AREAS, collapsePairs, describeChange } from "../../../lib/adminText";
import { colors, radii, spacing, typography } from "../../../theme";

const DAYS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];
const PAGE = 200;

// Every change to the content, access and settings: who, when, before and after
// (admin_log, written by triggers in supabase/admin_tools.sql).
export default function Activity() {
  return (
    <AdminOnly>
      <ActivityPage />
    </AdminOnly>
  );
}

function ActivityPage() {
  const [area, setArea] = useState("all");
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);

  const args = useCallback(
    (before = null, limit = PAGE) => ({
      p_tables: AREAS.find((a) => a.value === area).tables,
      p_since: new Date(Date.now() - days * 864e5).toISOString(),
      p_limit: limit,
      p_before: before,
    }),
    [area, days]
  );

  const load = useCallback(
    async (before = null) => {
      setLoading(true);
      setError(null);
      try {
        const data = await rpc("admin_log_list", args(before));
        setRows((r) => (before ? [...r, ...data] : data));
        setMore(data.length === PAGE);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [args]
  );

  useEffect(() => {
    setRows([]);
    load();
  }, [load]);

  const download = async () => {
    try {
      const data = await rpc("admin_log_list", args(null, 1000));
      const stamp = new Date().toISOString().slice(0, 10);
      downloadText(`bete-qinie-changes-${area}-${stamp}.json`, JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e.message);
    }
  };

  const shown = collapsePairs(rows);
  return (
    <ScreenContainer scroll contentContainerStyle={adminStyles.page}>
      <AdminHeader
        title="Change log"
        right={
          Platform.OS === "web" ? (
            <Button size="sm" variant="secondary" onPress={download}>
              Download
            </Button>
          ) : null
        }
      />
      <Chips items={AREAS.map(({ value, label }) => ({ value, label }))} value={area} onChange={setArea} />
      <Chips items={DAYS} value={days} onChange={setDays} />
      <Notice tone="error">{error}</Notice>
      <Panel title={loading && !rows.length ? "Loading…" : `${shown.length}${more ? "+" : ""} change${shown.length === 1 ? "" : "s"}`}>
        {!loading && !rows.length && !error ? <EmptyState message="No changes in this time." icon="scroll-text" /> : null}
        {shown.map((row) => {
          const line = describeChange(row);
          const expanded = open === row.id;
          return (
            <Pressable
              key={row.id}
              onPress={() => setOpen(expanded ? null : row.id)}
              style={({ hovered }) => [styles.row, hovered && styles.rowHover]}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <Text style={[styles.line, scriptStyle(line) && adminStyles.ethiopic]}>{line}</Text>
              <Text style={adminStyles.muted}>{`${row.actor_email || "someone"} · ${ago(row.at)} · ${new Date(row.at).toLocaleString()}`}</Text>
              {expanded ? (
                <View style={styles.detail}>
                  {row.before ? <Text style={styles.json}>{`Before\n${JSON.stringify(row.before, null, 2).slice(0, 1500)}`}</Text> : null}
                  {row.after ? <Text style={styles.json}>{`After\n${JSON.stringify(row.after, null, 2).slice(0, 1500)}`}</Text> : null}
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {!loading && more ? (
          <Button size="sm" variant="secondary" onPress={() => load(rows[rows.length - 1].id)}>
            Show older
          </Button>
        ) : null}
      </Panel>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowHover: { backgroundColor: colors.surfaceMuted },
  line: { ...typography.body, color: colors.textPrimary },
  detail: { gap: spacing.sm, marginTop: spacing.xs },
  json: {
    ...typography.caption,
    fontFamily: Platform.OS === "web" ? "ui-monospace, Menlo, monospace" : "monospace",
    color: colors.textSecondary,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
});
