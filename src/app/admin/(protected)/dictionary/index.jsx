import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AdminHeader, Button, EmptyState, ScreenContainer, TextField } from "../../../../components/ui";
import { Chips, ConfirmButton, ListRow, Notice, Panel, adminStyles } from "../../../../components/admin";
import { useRpc } from "../../../../hooks/useRpc";
import { rpc } from "../../../../lib/adminApi";
import { languageLabel, loadPreviews, previewLine, searchWords } from "../../../../lib/dictionaryAdmin";
import { colors, spacing } from "../../../../theme";

const FILTERS = [
  { value: "missing_en", label: "No English" },
  { value: "missing_ti", label: "No ትግርኛ" },
  { value: "missing_am", label: "No አማርኛ" },
  { value: "no_meaning", label: "No meaning" },
  { value: "duplicates", label: "Duplicates" },
  { value: "orphans", label: "Orphan meanings" },
  { value: "reported", label: "Reported" },
  { value: "hard", label: "Missed most" },
];
const PAGE = 100;

// Rows for one filter: [{ word_id, word, language_code, detail, mergeWith }] and the total.
async function loadFilter(kind, offset) {
  if (kind === "reported") {
    const reports = await rpc("reports_list", { p_status: "open", p_limit: 1000 });
    const byWord = new Map();
    for (const r of reports) {
      const row = byWord.get(r.word_id) || { word_id: r.word_id, word: r.word, language_code: "gz", count: 0, message: r.message };
      row.count += 1;
      byWord.set(r.word_id, row);
    }
    const rows = [...byWord.values()].map((r) => ({
      ...r,
      detail: `${r.count} open report${r.count === 1 ? "" : "s"}: “${r.message.slice(0, 90)}${r.message.length > 90 ? "…" : ""}”`,
    }));
    return { rows, total: rows.length };
  }
  if (kind === "hard") {
    const hard = await rpc("dict_hard_words", { p_min: 3, p_limit: 100 });
    const rows = hard.map((h) => ({
      word_id: h.word_id,
      word: h.word,
      language_code: "gz",
      detail: `missed ${Math.round(Number(h.miss_rate) * 100)}% of ${h.seen} answers · ${h.learners} learners`,
    }));
    return { rows, total: rows.length };
  }
  const res = await rpc("dict_issues", { p_kind: kind, p_limit: PAGE, p_offset: offset });
  const rows = res.rows.map((r) => ({
    ...r,
    mergeWith: kind === "duplicates" ? r.other_id : null,
    detail:
      kind === "duplicates"
        ? `Same spelling as #${r.other_id} “${r.other_word}” (spaces differ)`
        : kind === "orphans"
          ? `${languageLabel(r.language_code)} · not linked to any ግዕዝ word`
          : null,
  }));
  return { rows, total: res.total };
}

export default function DictionaryAdmin() {
  const params = useLocalSearchParams();
  const counts = useRpc("dict_issue_counts");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(null); // { text, rows, previews } while showing search results
  const [searching, setSearching] = useState(false);
  const [filter, setFilter] = useState(FILTERS.some((f) => f.value === params.filter) ? params.filter : "missing_en");
  const [list, setList] = useState({ rows: [], total: 0, previews: {}, loading: true, error: null });
  const [notice, setNotice] = useState(null);

  const showFilter = useCallback(async (kind, offset = 0) => {
    setList((l) => ({ ...l, loading: true, error: null, ...(offset ? {} : { rows: [], total: 0 }) }));
    try {
      const { rows, total } = await loadFilter(kind, offset);
      const previews = await loadPreviews(rows.map((r) => r.word_id));
      setList((l) => ({
        rows: offset ? [...l.rows, ...rows] : rows,
        total,
        previews: offset ? { ...l.previews, ...previews } : previews,
        loading: false,
        error: null,
      }));
    } catch (e) {
      setList((l) => ({ ...l, loading: false, error: e.message }));
    }
  }, []);

  useEffect(() => {
    showFilter(filter);
  }, [filter, showFilter]);

  // Opened with ?q=… (from "Searches with no result"): search for it straight away.
  useEffect(() => {
    if (typeof params.q === "string" && params.q.trim()) {
      setQuery(params.q);
      runSearch(params.q);
    }
  }, [params.q]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = async (text = query) => {
    const t = text.trim();
    if (!t) return setSearch(null);
    const byId = t.match(/^#?(\d+)$/);
    if (byId) return router.push(`/admin/dictionary/${byId[1]}`);
    setSearching(true);
    try {
      const rows = await searchWords(t);
      setSearch({ text: t, rows, previews: await loadPreviews(rows.map((r) => r.word_id)) });
    } catch (e) {
      setSearch({ text: t, rows: [], previews: {}, error: e.message });
    } finally {
      setSearching(false);
    }
  };

  const open = (row) =>
    router.push({ pathname: "/admin/dictionary/[id]", params: { id: row.word_id, ...(row.mergeWith ? { merge: row.mergeWith } : {}) } });

  const rowFor = (row, previews, i, all) => (
    <ListRow
      key={`${row.word_id}-${row.mergeWith || ""}`}
      title={row.language_code === "gz" ? row.word : `${row.word}  (${languageLabel(row.language_code)})`}
      subtitle={[row.detail, previewLine(previews[row.word_id], row.language_code === "gz" ? "No meanings yet" : "Not linked")]
        .filter(Boolean)
        .join("\n")}
      onPress={() => open(row)}
      last={i === all.length - 1}
    />
  );

  const c = counts.data || {};
  const chips = FILTERS.map((f) => ({ ...f, count: f.value === "hard" ? null : c[f.value === "reported" ? "reported" : f.value] }));

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={adminStyles.page}>
      <AdminHeader
        title="Dictionary"
        help="admin-dictionary"
        right={
          <Button size="sm" onPress={() => router.push("/admin/dictionary/new")}>
            Add a word
          </Button>
        }
      />

      <View style={styles.searchRow}>
        <TextField
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (!t.trim()) setSearch(null);
          }}
          placeholder="A word in any language, or #679"
          onSubmitEditing={() => runSearch()}
          returnKeyType="search"
          style={{ flex: 1 }}
        />
        <Button size="sm" onPress={() => runSearch()} loading={searching}>
          Search
        </Button>
      </View>

      {search ? (
        <Panel
          title={`${search.rows.length} word${search.rows.length === 1 ? "" : "s"} with “${search.text}”`}
          right={
            <Button size="sm" variant="ghost" onPress={() => (setSearch(null), setQuery(""))}>
              Clear
            </Button>
          }
        >
          <Notice tone="error">{search.error}</Notice>
          {search.rows.length ? (
            <View>{search.rows.map((row, i, all) => rowFor(row, search.previews, i, all))}</View>
          ) : (
            <EmptyState message="Nothing contains that." icon="search-outline" />
          )}
        </Panel>
      ) : (
        <>
          <Chips items={chips} value={filter} onChange={setFilter} />
          <Notice tone="error">{counts.error}</Notice>
          <Panel
            title={list.loading && !list.rows.length ? "Loading…" : `${list.total} word${list.total === 1 ? "" : "s"}`}
            right={
              filter === "orphans" && list.total ? (
                <ConfirmButton
                  onConfirm={async () => {
                    try {
                      const n = await rpc("dict_delete_orphans");
                      setNotice({ tone: "done", text: `Deleted ${n} orphan meaning${n === 1 ? "" : "s"}.` });
                    } catch (e) {
                      setNotice({ tone: "error", text: e.message });
                    }
                    counts.reload();
                    showFilter("orphans");
                  }}
                >
                  {`Delete all ${list.total}`}
                </ConfirmButton>
              ) : null
            }
          >
            <Notice tone={notice?.tone}>{notice?.text}</Notice>
            <Notice tone="error">{list.error}</Notice>
            {filter === "duplicates" && list.rows.length ? (
              <Text style={adminStyles.hint}>Open one to merge the pair: links, ሰዋሰው and learners' progress move to the word you keep.</Text>
            ) : null}
            {list.rows.length ? <View>{list.rows.map((row, i, all) => rowFor(row, list.previews, i, all))}</View> : null}
            {!list.loading && !list.rows.length && !list.error ? <EmptyState message="Nothing here. 🎉" /> : null}
            {list.loading ? <ActivityIndicator color={colors.primary} /> : null}
            {!list.loading && list.rows.length < list.total ? (
              <Button size="sm" variant="secondary" onPress={() => showFilter(filter, list.rows.length)}>
                {`Show more (${list.total - list.rows.length} left)`}
              </Button>
            ) : null}
          </Panel>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
