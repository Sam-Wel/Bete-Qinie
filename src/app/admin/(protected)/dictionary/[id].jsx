import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AdminHeader, Button, ScreenContainer, TextField } from "../../../../components/ui";
import { ConfirmButton, ListRow, Notice, Panel, adminStyles, scriptStyle } from "../../../../components/admin";
import { LexiconSection } from "../../../../components/LexiconSection";
import { ago, rpc } from "../../../../lib/adminApi";
import { languageLabel, searchWords } from "../../../../lib/dictionaryAdmin";
import { colors, fontFamily, radii, spacing, typography } from "../../../../theme";

const MEANING_LANGS = ["ti", "am", "en"];
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// One word: spelling, meanings (shared ones change for this word only or for all),
// ሰዋሰው, open reports, merge and delete. Every change goes through a database
// function in supabase/admin_tools.sql and lands in the change log.
export default function EditWord() {
  const { id, merge } = useLocalSearchParams();
  const wordId = Number(id);
  const [word, setWord] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const [w, r] = await Promise.all([
        rpc("dict_word", { p_id: wordId }),
        rpc("reports_list", { p_status: "open", p_limit: 1000 }),
      ]);
      setWord(w);
      setReports(r.filter((x) => x.word_id === wordId));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [wordId]);

  useEffect(() => {
    load();
  }, [load]);

  // Runs one change, says what happened, reloads the word. Returns the function's
  // result, or undefined when it failed.
  const act = async (fn, done, { reload = true } = {}) => {
    setNotice(null);
    try {
      const result = await fn();
      if (done) setNotice({ tone: "done", text: typeof done === "function" ? done(result) : done });
      if (reload) await load();
      return result;
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
      return undefined;
    }
  };

  if (error) {
    return (
      <ScreenContainer scroll contentContainerStyle={adminStyles.page}>
        <AdminHeader title="Edit word" fallback="/admin/dictionary" />
        <Notice tone="error">{error}</Notice>
      </ScreenContainer>
    );
  }
  if (!word) {
    return (
      <ScreenContainer center>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  const isGeez = word.language_code === "gz";
  const meanings = word.links.filter((l) => l.language_code !== "gz");
  const geezLinks = word.links.filter((l) => l.language_code === "gz");

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Edit word" fallback="/admin/dictionary" help="admin-word" />

      <View style={styles.top}>
        <Text style={[styles.word, scriptStyle(word.word) && styles.wordEthiopic]}>{word.word}</Text>
        <Text style={adminStyles.muted}>
          {`#${word.word_id} · ${languageLabel(word.language_code)}`}
          {isGeez ? ` · studied by ${plural(word.learners, "learner")}` : ""}
        </Text>
      </View>
      <Notice tone={notice?.tone}>{notice?.text}</Notice>

      {isGeez ? <LexiconSection word={word.word} /> : null}

      <Spelling word={word} act={act} />

      {isGeez ? (
        <Panel title="Meanings">
          {MEANING_LANGS.map((lang) => (
            <View key={lang} style={styles.langGroup}>
              <Text style={styles.langName}>{languageLabel(lang)}</Text>
              {meanings
                .filter((m) => m.language_code === lang)
                .map((m) => (
                  <Meaning key={m.word_id} meaning={m} word={word} act={act} />
                ))}
              <AddMeaning lang={lang} word={word} act={act} />
            </View>
          ))}
        </Panel>
      ) : (
        <Panel title={`Meaning of ${plural(geezLinks.length, "ግዕዝ word")}`}>
          <Text style={adminStyles.hint}>
            This is a {languageLabel(word.language_code)} meaning. Changing its spelling above changes it for every word below.
          </Text>
          {geezLinks.map((g, i) => (
            <ListRow key={g.word_id} title={g.word} subtitle={`#${g.word_id}`} onPress={() => router.push(`/admin/dictionary/${g.word_id}`)} last={i === geezLinks.length - 1} />
          ))}
        </Panel>
      )}

      {isGeez ? <Examples word={word} act={act} /> : null}

      {reports.length ? (
        <Panel title={`Open reports (${reports.length})`}>
          {reports.map((r) => (
            <View key={r.id} style={styles.report}>
              <Text style={[styles.reportText, scriptStyle(r.message) && adminStyles.ethiopic]}>{r.message}</Text>
              <Text style={adminStyles.muted}>{`${ago(r.created_at)} · ${r.reporter_email || (r.signed_in ? "a signed-in learner" : "a guest")}`}</Text>
              <View style={adminStyles.row}>
                <Button size="sm" onPress={() => act(() => rpc("report_resolve", { p_id: r.id, p_status: "fixed", p_note: null }), "Marked fixed.")}>
                  Fixed
                </Button>
                <Button size="sm" variant="secondary" onPress={() => act(() => rpc("report_resolve", { p_id: r.id, p_status: "dismissed", p_note: null }), "Dismissed.")}>
                  Dismiss
                </Button>
              </View>
            </View>
          ))}
        </Panel>
      ) : null}

      <Merge word={word} initial={merge ? Number(merge) : null} act={act} />

      <Panel title="Delete">
        <Text style={adminStyles.hint}>
          {isGeez
            ? word.learners
              ? `${plural(word.learners, "learner")} studied this word; it stops showing in their ዛሬ, ክለሳ and games.`
              : "No learner has studied this word."
            : "Deletes this meaning and its links."}{" "}
          Meanings used by no other word are deleted with it.
        </Text>
        <ConfirmButton
          style={{ alignSelf: "flex-start" }}
          onConfirm={async () => {
            const ok = await act(() => rpc("dict_delete", { p_id: word.word_id }), null, { reload: false });
            if (ok !== undefined) router.replace("/admin/dictionary");
          }}
        >
          {`Delete “${word.word}”`}
        </ConfirmButton>
      </Panel>
    </ScreenContainer>
  );
}

// The word's own spelling. A clash with an existing word offers to open or merge it.
function Spelling({ word, act }) {
  const [text, setText] = useState(word.word);
  const [conflict, setConflict] = useState(null);
  useEffect(() => {
    setText(word.word);
    setConflict(null);
  }, [word.word]);
  const clean = text.trim().replace(/\s+/g, " ");
  const changed = Boolean(clean) && clean !== word.word;
  const shared = word.language_code !== "gz" && word.links.length > 1;

  return (
    <Panel title="Spelling">
      {shared ? <Text style={adminStyles.hint}>{`Used by ${word.links.length} ግዕዝ words: a new spelling changes it for all of them.`}</Text> : null}
      <View style={styles.inline}>
        <TextField value={text} onChangeText={setText} style={{ flex: 1 }} inputStyle={scriptStyle(text) ? styles.inputEthiopic : null} />
        <Button
          size="sm"
          disabled={!changed}
          onPress={async () => {
            const r = await act(() => rpc("dict_rename", { p_id: word.word_id, p_text: clean }), (res) => (res?.ok ? "Spelling saved." : null));
            if (r?.conflict) setConflict(r);
          }}
        >
          Save
        </Button>
      </View>
      {conflict ? (
        <View style={styles.conflict}>
          <Text style={adminStyles.hint}>{`“${conflict.word}” is already in the dictionary as #${conflict.conflict}.`}</Text>
          <View style={adminStyles.row}>
            <Button size="sm" variant="secondary" onPress={() => router.push(`/admin/dictionary/${conflict.conflict}`)}>
              {`Open #${conflict.conflict}`}
            </Button>
            <ConfirmButton
              variant="secondary"
              onConfirm={async () => {
                const r = await act(() => rpc("dict_merge", { p_keep: conflict.conflict, p_drop: word.word_id }), null, { reload: false });
                if (r !== undefined) router.replace(`/admin/dictionary/${conflict.conflict}`);
              }}
            >
              Merge this word into it
            </ConfirmButton>
          </View>
        </View>
      ) : null}
    </Panel>
  );
}

// One meaning of a ግዕዝ word. A meaning shared with other words can change for this
// word only (relink) or for all of them (rename).
function Meaning({ meaning, word, act }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(meaning.word);
  const [conflict, setConflict] = useState(null);
  const shared = meaning.shared_with;
  const clean = text.trim().replace(/\s+/g, " ");
  const changed = Boolean(clean) && clean !== meaning.word;
  const close = (result) => {
    if (result !== undefined) {
      setEditing(false);
      setConflict(null);
    }
  };

  if (!editing) {
    return (
      <View style={styles.meaning}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.meaningText, scriptStyle(meaning.word) && styles.meaningEthiopic]}>{meaning.word}</Text>
          {shared ? <Text style={adminStyles.muted}>{`also the meaning of ${plural(shared, "other ግዕዝ word")}`}</Text> : null}
        </View>
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            setText(meaning.word);
            setConflict(null);
            setEditing(true);
          }}
        >
          Edit
        </Button>
        <ConfirmButton onConfirm={() => act(() => rpc("dict_unlink", { p_word_id: word.word_id, p_other_id: meaning.word_id }), `Removed “${meaning.word}”.`)}>
          Remove
        </ConfirmButton>
      </View>
    );
  }

  const onlyHere = () =>
    act(() => rpc("dict_relink", { p_word_id: word.word_id, p_old_id: meaning.word_id, p_text: clean }), `Changed for ${word.word} only.`).then(close);
  const everywhere = async () => {
    const r = await act(() => rpc("dict_rename", { p_id: meaning.word_id, p_text: clean }), (res) => (res?.ok ? "Changed." : null));
    if (r?.conflict) {
      // Not shared: point this word at the existing spelling instead. Shared: ask.
      if (!shared) onlyHere();
      else setConflict(r);
    } else close(r);
  };

  return (
    <View style={styles.editBox}>
      <TextField value={text} onChangeText={setText} autoFocus inputStyle={scriptStyle(text) ? styles.inputEthiopic : null} />
      {shared ? <Text style={adminStyles.hint}>{`“${meaning.word}” is also the meaning of ${plural(shared, "other word")}. Change it:`}</Text> : null}
      <View style={adminStyles.row}>
        {shared ? (
          <>
            <Button size="sm" disabled={!changed} onPress={onlyHere}>
              {`For ${word.word} only`}
            </Button>
            <Button size="sm" variant="secondary" disabled={!changed} onPress={everywhere}>
              {`For all ${shared + 1} words`}
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={!changed} onPress={everywhere}>
            Save
          </Button>
        )}
        <Button size="sm" variant="ghost" onPress={() => setEditing(false)}>
          Cancel
        </Button>
      </View>
      {conflict ? (
        <View style={styles.conflict}>
          <Text style={adminStyles.hint}>{`“${conflict.word}” already exists. Merge “${meaning.word}” into it, for all ${shared + 1} words?`}</Text>
          <ConfirmButton
            variant="secondary"
            style={{ alignSelf: "flex-start" }}
            onConfirm={() => act(() => rpc("dict_merge", { p_keep: conflict.conflict, p_drop: meaning.word_id }), "Merged.").then(close)}
          >
            Merge
          </ConfirmButton>
        </View>
      ) : null}
    </View>
  );
}

function AddMeaning({ lang, word, act }) {
  const [text, setText] = useState("");
  const add = async () => {
    const clean = text.trim();
    if (!clean) return;
    const r = await act(() => rpc("dict_link", { p_word_id: word.word_id, p_lang: lang, p_text: clean }), `Added “${clean}”.`);
    if (r !== undefined) setText("");
  };
  return (
    <View style={styles.inline}>
      <TextField
        value={text}
        onChangeText={setText}
        placeholder={`Add a ${languageLabel(lang)} meaning`}
        onSubmitEditing={add}
        returnKeyType="done"
        style={{ flex: 1 }}
        inputStyle={scriptStyle(text) ? styles.inputEthiopic : null}
      />
      <Button size="sm" variant="secondary" disabled={!text.trim()} onPress={add}>
        Add
      </Button>
    </View>
  );
}

function Examples({ word, act }) {
  const [drafts, setDrafts] = useState({});
  const [adding, setAdding] = useState("");
  return (
    <Panel title="ሰዋሰው">
      {word.examples.map((ex) => {
        const draft = drafts[ex.sewasew_id] ?? ex.text;
        return (
          <View key={ex.sewasew_id} style={styles.example}>
            <TextField multiline value={draft} onChangeText={(t) => setDrafts({ ...drafts, [ex.sewasew_id]: t })} inputStyle={styles.inputEthiopic} />
            <View style={adminStyles.row}>
              <Button
                size="sm"
                disabled={!draft.trim() || draft === ex.text}
                onPress={() => act(() => rpc("example_save", { p_id: ex.sewasew_id, p_word_id: word.word_id, p_text: draft }), "Example saved.")}
              >
                Save
              </Button>
              <ConfirmButton onConfirm={() => act(() => rpc("example_delete", { p_id: ex.sewasew_id }), "Example deleted.")}>Delete</ConfirmButton>
            </View>
          </View>
        );
      })}
      <TextField multiline value={adding} onChangeText={setAdding} placeholder="A new ሰዋሰው example" inputStyle={styles.inputEthiopic} />
      <Button
        size="sm"
        variant="secondary"
        style={{ alignSelf: "flex-start" }}
        disabled={!adding.trim()}
        onPress={async () => {
          const r = await act(() => rpc("example_save", { p_id: null, p_word_id: word.word_id, p_text: adding }), "Example added.");
          if (r !== undefined) setAdding("");
        }}
      >
        Add example
      </Button>
    </Panel>
  );
}

// Merging another word into this one (or this one into it): links, ሰዋሰው, reports and
// learners' progress move to the word that stays.
function Merge({ word, initial, act }) {
  const [text, setText] = useState(initial ? `#${initial}` : "");
  const [found, setFound] = useState([]);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState(null);

  const find = useCallback(
    async (value) => {
      setError(null);
      setPicked(null);
      const t = value.trim();
      if (!t) return setFound([]);
      try {
        const byId = t.match(/^#?(\d+)$/);
        if (byId) {
          const w = await rpc("dict_word", { p_id: Number(byId[1]) });
          setFound([w]);
          if (w.word_id !== word.word_id) setPicked(w);
          return;
        }
        const rows = (await searchWords(t, { language: word.language_code, limit: 8 })).filter((r) => r.word_id !== word.word_id);
        setFound(rows);
      } catch (e) {
        setError(e.message);
      }
    },
    [word.word_id, word.language_code]
  );

  useEffect(() => {
    if (initial) find(`#${initial}`);
  }, [initial, find]);

  return (
    <Panel title="Merge">
      <Text style={adminStyles.hint}>
        For two entries of the same word. Links, ሰዋሰው, reports and learners' progress move to the one you keep.
      </Text>
      <View style={styles.inline}>
        <TextField
          value={text}
          onChangeText={setText}
          placeholder="The other word, or its #number"
          onSubmitEditing={() => find(text)}
          returnKeyType="search"
          style={{ flex: 1 }}
          inputStyle={scriptStyle(text) ? styles.inputEthiopic : null}
        />
        <Button size="sm" variant="secondary" onPress={() => find(text)}>
          Find
        </Button>
      </View>
      <Notice tone="error">{error}</Notice>
      {!picked && found.length
        ? found.map((f, i) => (
            <ListRow
              key={f.word_id}
              title={f.word}
              subtitle={`#${f.word_id}`}
              onPress={async () => setPicked(await rpc("dict_word", { p_id: f.word_id }).catch(() => null))}
              last={i === found.length - 1}
            />
          ))
        : null}
      {picked && picked.word_id !== word.word_id ? (
        <View style={styles.conflict}>
          <Text style={adminStyles.hint}>
            {`#${picked.word_id} “${picked.word}”: ${plural(picked.links.length, "link")}, ${plural(picked.examples.length, "example")}` +
              (picked.language_code === "gz" ? `, studied by ${plural(picked.learners, "learner")}.` : ".")}
          </Text>
          <View style={adminStyles.row}>
            <ConfirmButton variant="secondary" onConfirm={() => act(() => rpc("dict_merge", { p_keep: word.word_id, p_drop: picked.word_id }), `Merged #${picked.word_id} into this word.`).then(() => (setPicked(null), setFound([]), setText("")))}>
              {`Keep this, merge #${picked.word_id} in`}
            </ConfirmButton>
            <ConfirmButton
              variant="secondary"
              onConfirm={async () => {
                const r = await act(() => rpc("dict_merge", { p_keep: picked.word_id, p_drop: word.word_id }), null, { reload: false });
                if (r !== undefined) router.replace(`/admin/dictionary/${picked.word_id}`);
              }}
            >
              {`Keep #${picked.word_id} instead`}
            </ConfirmButton>
          </View>
        </View>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  top: { gap: 2 },
  word: { ...typography.h1, color: colors.textPrimary },
  wordEthiopic: { fontFamily: fontFamily.ethiopicBold, fontSize: 34, lineHeight: 46 },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  inputEthiopic: { fontFamily: fontFamily.ethiopicRegular, fontSize: 17 },
  langGroup: { gap: spacing.xs, paddingVertical: spacing.xs },
  langName: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.primaryDark, letterSpacing: 0.5 },
  meaning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  meaningText: { ...typography.body, color: colors.textPrimary },
  meaningEthiopic: { fontFamily: fontFamily.ethiopicRegular, fontSize: 17, lineHeight: 26 },
  editBox: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  conflict: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.primary },
  example: { gap: spacing.xs, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  report: { gap: 4, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reportText: { ...typography.body, color: colors.textPrimary },
});
