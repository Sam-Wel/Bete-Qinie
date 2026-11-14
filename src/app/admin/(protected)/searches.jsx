import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { AdminHeader, Button, EmptyState, ScreenContainer } from "../../../components/ui";
import { Chips, ConfirmButton, Notice, Panel, adminStyles, scriptStyle } from "../../../components/admin";
import { adminError, ago } from "../../../lib/adminApi";
import { languageLabel } from "../../../lib/dictionaryAdmin";
import { supabase } from "../../../lib/supabaseClient";
import { colors, fontFamily, spacing, typography } from "../../../theme";

const VIEWS = [
  { value: "open", label: "To look at" },
  { value: "dismissed", label: "Dismissed" },
];

// Words people searched for in the Dictionary and didn't find, most searched first.
// No account or device is recorded with them (supabase/admin_tools.sql log_search_miss).
export default function Searches() {
  const [view, setView] = useState("open");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: e } = await supabase
      .from("search_misses")
      .select("language, term, count, first_at, last_at, dismissed")
      .eq("dismissed", view === "dismissed")
      .order("count", { ascending: false })
      .order("last_at", { ascending: false })
      .limit(300);
    if (e) setError(adminError(e));
    else setRows(data);
  }, [view]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const change = async (row, patch, done) => {
    setNotice(null);
    const q = supabase.from("search_misses");
    const { error: e } = await (patch === "delete" ? q.delete() : q.update(patch)).eq("language", row.language).eq("term", row.term);
    if (e) setNotice({ tone: "error", text: adminError(e) });
    else {
      setNotice({ tone: "done", text: done });
      load();
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Searches with no result" />
      <Text style={adminStyles.hint}>
        What people looked for in the Dictionary and didn't find. Nothing about who searched is kept. A word you add
        stops being counted, because its search then finds something.
      </Text>
      <Chips items={VIEWS} value={view} onChange={setView} />
      <Notice tone={notice?.tone}>{notice?.text}</Notice>
      <Notice tone="error">{error}</Notice>
      <Panel title={rows ? `${rows.length} search${rows.length === 1 ? "" : "es"}` : "Loading…"}>
        {!rows && !error ? <ActivityIndicator color={colors.primary} /> : null}
        {rows && !rows.length ? <EmptyState message="Nothing here." icon="search-x" /> : null}
        {(rows || []).map((r) => (
          <View key={`${r.language}:${r.term}`} style={styles.row}>
            <View style={styles.head}>
              <Text style={[styles.term, scriptStyle(r.term) && styles.termEthiopic]}>{r.term}</Text>
              <Text style={styles.lang}>{languageLabel(r.language)}</Text>
            </View>
            <Text style={adminStyles.muted}>{`searched ${r.count} time${r.count === 1 ? "" : "s"} · last ${ago(r.last_at)}`}</Text>
            {r.language !== "gz" ? (
              <Text style={adminStyles.hint}>{`If it's the meaning of a ግዕዝ word, open that word and add “${r.term}” as its ${languageLabel(r.language)} meaning.`}</Text>
            ) : null}
            <View style={adminStyles.row}>
              {r.language === "gz" ? (
                <Button size="sm" onPress={() => router.push({ pathname: "/admin/dictionary/new", params: { word: r.term } })}>
                  Add this word
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onPress={() => router.push({ pathname: "/admin/dictionary", params: { q: r.term } })}>
                  Search the dictionary
                </Button>
              )}
              {view === "open" ? (
                <Button size="sm" variant="ghost" onPress={() => change(r, { dismissed: true }, `Dismissed “${r.term}”.`)}>
                  Dismiss
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onPress={() => change(r, { dismissed: false }, `“${r.term}” is back on the list.`)}>
                  Restore
                </Button>
              )}
              <ConfirmButton variant="secondary" onConfirm={() => change(r, "delete", `Deleted “${r.term}”.`)}>
                Delete
              </ConfirmButton>
            </View>
          </View>
        ))}
      </Panel>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { gap: 4, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  head: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  term: { ...typography.bodySemiBold, fontSize: 18, color: colors.textPrimary },
  termEthiopic: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, lineHeight: 28 },
  lang: { ...typography.caption, color: colors.primaryDark },
});
