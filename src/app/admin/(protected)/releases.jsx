import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { AdminHeader, Badge, Button, ScreenContainer } from "../../../components/ui";
import { AdminOnly, ConfirmButton, Notice, Panel, adminStyles } from "../../../components/admin";
import { adminError, shortDate } from "../../../lib/adminApi";
import { FORM_BATCH, WORD_BATCH, checkRelease, compareTags, deployedLine, formRows, identifyFiles, releaseRow, wordRows } from "../../../lib/lexiconImport";
import { supabase } from "../../../lib/supabaseClient";
import { colors, radii, spacing, typography } from "../../../theme";

// Ge'ez lexicon releases in the app: import one from its files, make it live, roll
// back, remove old ones. The same checks as scripts/import-lexicon.mjs.
export default function Releases() {
  return (
    <AdminOnly>
      <ReleasesPage />
    </AdminOnly>
  );
}

const count = async (table, tag) => {
  const { count: n, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("release_tag", tag);
  if (error) throw new Error(adminError(error));
  return n;
};

async function readPicked(asset) {
  const text = asset.file ? await asset.file.text() : await (await fetch(asset.uri)).text();
  return JSON.parse(text);
}

function ReleasesPage() {
  const [releases, setReleases] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [record, setRecord] = useState(null); // the lex.py line to copy after a switch
  const [picked, setPicked] = useState(null); // { manifest, app, problems, names }
  const [progress, setProgress] = useState(null); // text while importing

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("lexicon_releases")
      .select("tag, version, released_on, words, forms, imported_at, is_current")
      .order("imported_at", { ascending: false });
    if (e) setError(adminError(e));
    else setReleases(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const live = releases?.find((r) => r.is_current)?.tag || null;

  const makeLive = async (tag) => {
    setNotice(null);
    const before = live;
    const { error: e } = await supabase.rpc("lexicon_set_current", { p_tag: tag });
    if (e) return setNotice({ tone: "error", text: adminError(e) });
    setNotice({ tone: "done", text: `${tag} is live. Learners get it the next time they open the app.` });
    setRecord(deployedLine(tag, before, "made live from the admin Data releases page"));
    load();
  };

  const remove = async (tag) => {
    setNotice(null);
    const { error: e } = await supabase.from("lexicon_releases").delete().eq("tag", tag).eq("is_current", false);
    if (e) setNotice({ tone: "error", text: adminError(e) });
    else setNotice({ tone: "done", text: `Removed ${tag}.` });
    load();
  };

  const pick = async () => {
    setNotice(null);
    setPicked(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/json"], multiple: true, copyToCacheDirectory: false });
    if (result.canceled) return;
    try {
      const jsons = await Promise.all(result.assets.map(readPicked));
      const { manifest, app } = identifyFiles(jsons);
      const problems = !manifest || !app ? ["Pick both app.json and manifest.json from the release's folder."] : checkRelease(manifest, app);
      setPicked({ manifest, app, problems, names: result.assets.map((a) => a.name).join(", ") });
    } catch (e) {
      setNotice({ tone: "error", text: `Couldn't read those files: ${e.message}` });
    }
  };

  const runImport = async (goLive) => {
    const { manifest, app } = picked;
    const tag = manifest.tag;
    const existing = releases?.find((r) => r.tag === tag);
    setNotice(null);
    try {
      if (existing?.is_current) throw new Error(`${tag} is the live release; make another release live before replacing it.`);
      if (existing) {
        setProgress(`Removing the earlier copy of ${tag}…`);
        const { error: e } = await supabase.from("lexicon_releases").delete().eq("tag", tag);
        if (e) throw new Error(adminError(e));
      }
      setProgress("Writing the release…");
      const { error: releaseError } = await supabase.from("lexicon_releases").insert(releaseRow(manifest, app));
      if (releaseError) throw new Error(adminError(releaseError));

      for (const [table, rows, size, label] of [
        ["lexicon_words", wordRows(tag, app), WORD_BATCH, "words"],
        ["lexicon_forms", formRows(tag, app), FORM_BATCH, "forms"],
      ]) {
        for (let i = 0; i < rows.length; i += size) {
          setProgress(`Writing ${label}: ${Math.min(i + size, rows.length)} of ${rows.length}`);
          const { error: e } = await supabase.from(table).insert(rows.slice(i, i + size));
          if (e) throw new Error(`Writing ${label} ${i + 1}–${Math.min(i + size, rows.length)} failed: ${adminError(e)}`);
        }
      }

      setProgress("Checking the counts…");
      const [nWords, nForms] = [await count("lexicon_words", tag), await count("lexicon_forms", tag)];
      if (nWords !== manifest.words || nForms !== manifest.forms) {
        throw new Error(`Counts don't match the manifest: ${nWords}/${manifest.words} words, ${nForms}/${manifest.forms} forms.`);
      }
      setProgress(null);
      setPicked(null);
      setNotice({ tone: "done", text: `Imported ${tag}: ${nWords} words and ${nForms} forms, matching the manifest.` });
      await load();
      if (goLive) await makeLive(tag);
    } catch (e) {
      // Leave nothing half-imported behind (never touches the live release).
      await supabase.from("lexicon_releases").delete().eq("tag", tag).eq("is_current", false);
      setProgress(null);
      setNotice({ tone: "error", text: `${e.message} Nothing was kept; the live release is unchanged.` });
      load();
    }
  };

  const copy = () => {
    if (Platform.OS === "web" && navigator.clipboard) navigator.clipboard.writeText(record).catch(() => {});
  };

  const busy = Boolean(progress);
  return (
    <ScreenContainer scroll contentContainerStyle={adminStyles.page}>
      <AdminHeader title="Data releases" help="admin-releases" />
      <Text style={adminStyles.hint}>
        Dictionary data from the Ge'ez lexicon (heads and ርባታ from መጽሐፈ ግስ ወሰዋስው). One release is live at a time;
        learners' apps pick up a change the next time they open. Making an older release live is a rollback.
      </Text>
      <Notice tone={notice?.tone}>{notice?.text}</Notice>

      {record ? (
        <Panel title="Record it in the lexicon">
          <Text style={adminStyles.hint}>In ~/Projects/geez-lexicon, run:</Text>
          <Text selectable style={styles.code}>
            {record}
          </Text>
          {Platform.OS === "web" ? (
            <Button size="sm" variant="secondary" style={{ alignSelf: "flex-start" }} onPress={copy}>
              Copy
            </Button>
          ) : null}
        </Panel>
      ) : null}

      <Panel title="Imported releases">
        <Notice tone="error">{error}</Notice>
        {!releases && !error ? <ActivityIndicator color={colors.primary} /> : null}
        {releases && !releases.length ? <Text style={adminStyles.hint}>None yet.</Text> : null}
        {(releases || []).map((r) => (
          <View key={r.tag} style={styles.release}>
            <View style={adminStyles.row}>
              <Text style={styles.tag}>{r.tag}</Text>
              {r.is_current ? <Badge label="live" tone="primary" /> : null}
            </View>
            <Text style={adminStyles.muted}>
              {`${r.words} words · ${r.forms} forms · released ${shortDate(r.released_on)} · imported ${shortDate(r.imported_at)}`}
            </Text>
            {r.is_current ? null : (
              <View style={adminStyles.row}>
                <ConfirmButton variant="secondary" disabled={busy} onConfirm={() => makeLive(r.tag)}>
                  {live && compareTags(r.tag, live) < 0 ? "Roll back to this" : "Make live"}
                </ConfirmButton>
                <ConfirmButton disabled={busy} onConfirm={() => remove(r.tag)}>
                  Remove
                </ConfirmButton>
              </View>
            )}
          </View>
        ))}
      </Panel>

      <Panel title="Import a release">
        <Text style={adminStyles.hint}>Pick app.json and manifest.json from geez-lexicon/releases/data-vX.Y.Z/. Only core releases are accepted.</Text>
        <Button size="sm" variant="secondary" style={{ alignSelf: "flex-start" }} disabled={busy} onPress={pick}>
          Choose the files
        </Button>
        {picked ? (
          <View style={styles.picked}>
            <Text style={adminStyles.muted}>{picked.names}</Text>
            {picked.manifest ? (
              <Text style={styles.summary}>
                {`${picked.manifest.tag}: ${picked.manifest.words} words, ${picked.manifest.forms} forms, ${picked.app?.heads?.length || 0} head tables, released ${picked.manifest.date}`}
              </Text>
            ) : null}
            {picked.manifest?.note ? <Text style={adminStyles.hint}>{picked.manifest.note}</Text> : null}
            {picked.problems.map((p) => (
              <Notice key={p} tone="error">
                {p}
              </Notice>
            ))}
            {!picked.problems.length ? (
              <>
                {releases?.some((r) => r.tag === picked.manifest.tag) ? (
                  <Text style={adminStyles.hint}>{`${picked.manifest.tag} is already imported; importing replaces that copy.`}</Text>
                ) : null}
                <View style={adminStyles.row}>
                  <Button size="sm" disabled={busy} onPress={() => runImport(false)}>
                    Import
                  </Button>
                  <Button size="sm" variant="secondary" disabled={busy} onPress={() => runImport(true)}>
                    Import and make live
                  </Button>
                </View>
              </>
            ) : null}
          </View>
        ) : null}
        {progress ? (
          <View style={adminStyles.row}>
            <ActivityIndicator color={colors.primary} />
            <Text style={adminStyles.hint}>{progress}</Text>
          </View>
        ) : null}
      </Panel>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  release: { gap: 4, paddingVertical: spacing.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  tag: { ...typography.bodySemiBold, fontSize: 17, color: colors.textPrimary },
  picked: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  summary: { ...typography.bodySemiBold, color: colors.textPrimary },
  code: {
    ...typography.caption,
    fontFamily: Platform.OS === "web" ? "ui-monospace, Menlo, monospace" : "monospace",
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
});
