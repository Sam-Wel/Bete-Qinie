import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AdminHeader, Button, EmptyState, ScreenContainer } from "../../../components/ui";
import { Chips, Notice, Panel, adminStyles, scriptStyle } from "../../../components/admin";
import { useRpc } from "../../../hooks/useRpc";
import { ago, rpc } from "../../../lib/adminApi";
import { colors, fontFamily, spacing, typography } from "../../../theme";

const STATUSES = [
  { value: "open", label: "Open" },
  { value: "fixed", label: "Fixed" },
  { value: "dismissed", label: "Dismissed" },
];

// What learners flagged with "Report a mistake" on word cards.
export default function Reports() {
  const [status, setStatus] = useState("open");
  const list = useRpc("reports_list", { p_status: status, p_limit: 300 });
  const [notice, setNotice] = useState(null);

  const resolve = async (report, next) => {
    setNotice(null);
    try {
      await rpc("report_resolve", { p_id: report.id, p_status: next, p_note: null });
      setNotice({ tone: "done", text: next === "open" ? "Reopened." : next === "fixed" ? "Marked fixed." : "Dismissed." });
      list.reload();
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    }
  };

  const rows = list.data || [];
  return (
    <ScreenContainer scroll contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Mistake reports" />
      <Chips items={STATUSES} value={status} onChange={setStatus} />
      <Notice tone={notice?.tone}>{notice?.text}</Notice>
      <Notice tone="error">{list.error}</Notice>
      <Panel title={list.loading ? "Loading…" : `${rows.length} report${rows.length === 1 ? "" : "s"}`}>
        {list.loading && !rows.length ? <ActivityIndicator color={colors.primary} /> : null}
        {!list.loading && !rows.length && !list.error ? (
          <EmptyState message={status === "open" ? "No open reports." : "None yet."} icon="flag" />
        ) : null}
        {rows.map((r) => (
          <View key={r.id} style={styles.report}>
            <Pressable onPress={() => r.word_id && router.push(`/admin/dictionary/${r.word_id}`)} accessibilityRole="link">
              <Text style={styles.word}>{r.word}</Text>
            </Pressable>
            <Text style={[styles.message, scriptStyle(r.message) && adminStyles.ethiopic]}>{r.message}</Text>
            <Text style={adminStyles.muted}>
              {`${ago(r.created_at)} · ${r.reporter_email || (r.signed_in ? "a signed-in learner" : "a guest")}`}
              {r.resolved_at ? ` · ${r.status} ${ago(r.resolved_at)}` : ""}
            </Text>
            {r.note ? <Text style={adminStyles.hint}>{`Note: ${r.note}`}</Text> : null}
            <View style={adminStyles.row}>
              {r.word_id ? (
                <Button size="sm" variant="secondary" onPress={() => router.push(`/admin/dictionary/${r.word_id}`)}>
                  Open the word
                </Button>
              ) : null}
              {r.status === "open" ? (
                <>
                  <Button size="sm" onPress={() => resolve(r, "fixed")}>
                    Fixed
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => resolve(r, "dismissed")}>
                    Dismiss
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onPress={() => resolve(r, "open")}>
                  Reopen
                </Button>
              )}
            </View>
          </View>
        ))}
      </Panel>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  report: { gap: 4, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  word: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, lineHeight: 28, color: colors.primaryDark },
  message: { ...typography.body, color: colors.textPrimary },
});
