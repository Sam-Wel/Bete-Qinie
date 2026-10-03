import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AdminHeader, Button, Card, ScreenContainer } from "../../../components/ui";
import { KeneMeasureTable } from "../../../components/KeneMeasureTable";
import { useAuth } from "../../../context/AuthContext";
import { useKeneMeters } from "../../../hooks/useKeneMeters";
import { supabase } from "../../../lib/supabaseClient";
import { LINE_TYPES, TYPE_LABEL, buildMeasureTable } from "../../../lib/keneMeters";
import { colors, fontFamily, radii, spacing, typography } from "../../../theme";

const clone = (value) => JSON.parse(JSON.stringify(value));
const emptyFollow = () => ({ wedaqi: null, tetay: null, tenesh: null, siyaf: null });

// The printed sheets top out at 8, but a stored edit may already go higher.
function countCeiling(payload) {
  let max = 8;
  const visit = (counts) => {
    for (const c of counts ?? []) if (c > max) max = c;
  };
  for (const side of ["medeb", "mewqe"]) {
    for (const entry of payload?.[side] ?? []) {
      for (const branch of entry.branches ?? []) {
        visit(branch.counts);
        for (const key of Object.keys(branch.follow ?? {})) visit(branch.follow[key]);
      }
    }
  }
  for (const key of Object.keys(payload?.options ?? {})) visit(payload.options[key]);
  return max;
}

// A count in two branches of the same type makes the lookup ambiguous, and a branch with
// no counts can never be reached — both would quietly break the checker.
function validate(payload) {
  const issues = [];

  for (const side of ["medeb", "mewqe"]) {
    for (const entry of payload?.[side] ?? []) {
      const seen = new Set();
      (entry.branches ?? []).forEach((branch, index) => {
        if (!branch.counts?.length) {
          issues.push(`${TYPE_LABEL[entry.type]} — row ${index + 1} has no lead counts.`);
        }
        for (const count of branch.counts ?? []) {
          if (seen.has(count)) issues.push(`${TYPE_LABEL[entry.type]} — ${count} appears in two rows.`);
          seen.add(count);
        }
      });
    }
  }

  return issues;
}

function CountRow({ label, values, ceiling, onChange, nullable }) {
  const off = values == null;

  return (
    <View style={styles.countRow}>
      <Text style={[styles.countLabel, off && styles.countLabelOff]}>{label}</Text>

      {nullable ? (
        <Pressable
          onPress={() => onChange(off ? [] : null)}
          style={[styles.notAllowed, off && styles.notAllowedOn]}
        >
          <Text style={[styles.notAllowedText, off && styles.notAllowedTextOn]}>አይአቱን</Text>
        </Pressable>
      ) : null}

      <View style={styles.counts}>
        {Array.from({ length: ceiling }, (_, i) => i + 1).map((count) => {
          const on = values?.includes(count) ?? false;
          return (
            <Pressable
              key={count}
              onPress={() => onChange(on ? values.filter((c) => c !== count) : [...(values ?? []), count].sort((a, b) => a - b))}
              style={[styles.count, on && styles.countOn, off && styles.countDim]}
            >
              <Text style={[styles.countText, on && styles.countTextOn]}>{count}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BranchEditor({ branch, index, ceiling, onChange, onRemove }) {
  return (
    <View style={styles.branch}>
      <View style={styles.branchHead}>
        <Text style={styles.branchTitle}>Row {index + 1}</Text>
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={styles.remove}>አስወግድ</Text>
        </Pressable>
      </View>

      <CountRow
        label="ይህን ከያዘ"
        values={branch.counts}
        ceiling={ceiling}
        onChange={(counts) => onChange({ ...branch, counts: counts ?? [] })}
      />

      <Text style={styles.branchThen}>ከጎኑ የሚፈቀደው</Text>
      {LINE_TYPES.map((type) => (
        <CountRow
          key={type.key}
          label={type.label}
          nullable
          ceiling={ceiling}
          values={branch.follow?.[type.key] ?? null}
          onChange={(values) => onChange({ ...branch, follow: { ...branch.follow, [type.key]: values } })}
        />
      ))}
    </View>
  );
}

function SideEditor({ title, caption, entries, ceiling, onChange }) {
  const setEntry = (type, next) => onChange(entries.map((e) => (e.type === type ? next : e)));

  return (
    <View style={styles.side}>
      <Text style={styles.sideTitle}>{title}</Text>
      <Text style={styles.sideCaption}>{caption}</Text>

      {LINE_TYPES.map((type) => {
        const entry = entries.find((e) => e.type === type.key) ?? { type: type.key, branches: [] };
        return (
          <Card key={type.key} style={styles.entry}>
            <View style={styles.entryHead}>
              <Text style={styles.entryTitle}>{type.label}</Text>
              <Text style={styles.entryNote}>
                {entry.branches.length ? `${entry.branches.length} row(s)` : "አይአቱን"}
              </Text>
            </View>

            {entry.branches.map((branch, index) => (
              <BranchEditor
                key={index}
                branch={branch}
                index={index}
                ceiling={ceiling}
                onChange={(next) =>
                  setEntry(type.key, {
                    ...entry,
                    branches: entry.branches.map((b, i) => (i === index ? next : b)),
                  })
                }
                onRemove={() =>
                  setEntry(type.key, { ...entry, branches: entry.branches.filter((_, i) => i !== index) })
                }
              />
            ))}

            <Pressable
              onPress={() =>
                setEntry(type.key, {
                  ...entry,
                  branches: [...entry.branches, { counts: [], follow: emptyFollow() }],
                })
              }
              style={styles.addRow}
            >
              <Text style={styles.addRowText}>+ ረድፍ ይጨምሩ</Text>
            </Pressable>
          </Card>
        );
      })}
    </View>
  );
}

// Kept separate so `draft` is never null inside it. When the save callback lived in the
// parent, the React Compiler hoisted its dependency check — draft.id, draft.kind — to the
// top of every render, which threw before a table had been opened.
function DraftEditor({ draft, setDraft, overridden, userId, refresh, onFinished }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const issues = useMemo(() => validate(draft.payload), [draft]);
  const ceiling = useMemo(() => countCeiling(draft.payload), [draft]);

  const save = async () => {
    if (issues.length) return;
    setBusy(true);
    setNotice(null);

    const { error: saveError } = await supabase.from("kene_measures").upsert({
      id: draft.id,
      kind: draft.kind,
      name: draft.name,
      payload: draft.payload,
      updated_at: new Date().toISOString(),
      updated_by: userId ?? null,
    });

    setBusy(false);
    if (saveError) {
      setNotice({ tone: "error", text: saveError.message });
      return;
    }
    await refresh();
    onFinished({ tone: "ok", text: `${draft.name} ተቀምጧል።` });
  };

  const resetToDefault = async () => {
    setBusy(true);
    const { error: delError } = await supabase.from("kene_measures").delete().eq("id", draft.id);
    setBusy(false);
    if (delError) {
      setNotice({ tone: "error", text: delError.message });
      return;
    }
    await refresh();
    onFinished({ tone: "ok", text: `${draft.name} ወደ ነባሩ ተመልሷል።` });
  };

  return (
    <ScreenContainer scroll>
      <AdminHeader title={draft.name} titleEthiopic onBack={() => onFinished(null)} />

      {draft.kind === "table" ? (
        <>
          <Card style={styles.previewCard}>
            <Text style={styles.previewTitle}>ቅድመ እይታ</Text>
            <KeneMeasureTable {...buildMeasureTable({ ...draft.payload, id: draft.id, name: draft.name })} />
          </Card>

          <SideEditor
            title="መደብ → ተቀባሊ መደብ"
            caption="Each row is one lead measure and what it allows beside it."
            entries={draft.payload.medeb}
            ceiling={ceiling}
            onChange={(medeb) => setDraft({ ...draft, payload: { ...draft.payload, medeb } })}
          />
          <SideEditor
            title="መውቀዒ ቤት → ቤት"
            caption="Measured independently of the መደብ side."
            entries={draft.payload.mewqe}
            ceiling={ceiling}
            onChange={(mewqe) => setDraft({ ...draft, payload: { ...draft.payload, mewqe } })}
          />
        </>
      ) : (
        <Card style={styles.entry}>
          <Text style={styles.entryTitle}>ሐረግ</Text>
          <Text style={styles.sideCaption}>Allowed syllable counts per type. ሐረግ is always optional.</Text>
          {LINE_TYPES.map((type) => (
            <CountRow
              key={type.key}
              label={type.label}
              nullable
              ceiling={ceiling}
              values={draft.payload.options?.[type.key] ?? null}
              onChange={(values) =>
                setDraft({ ...draft, payload: { options: { ...draft.payload.options, [type.key]: values } } })
              }
            />
          ))}
        </Card>
      )}

      {issues.length ? (
        <Card style={styles.issues}>
          <Text style={styles.issuesTitle}>Fix before saving</Text>
          {issues.map((issue) => (
            <Text key={issue} style={styles.issueText}>
              • {issue}
            </Text>
          ))}
        </Card>
      ) : null}

      {notice ? <Text style={notice.tone === "error" ? styles.error : styles.ok}>{notice.text}</Text> : null}

      <View style={styles.actions}>
        <Button onPress={save} disabled={busy || issues.length > 0}>
          ያስቀምጡ
        </Button>
        {overridden.includes(draft.id) ? (
          <Button variant="danger" onPress={resetToDefault} disabled={busy}>
            ወደ ነባሩ ይመለስ
          </Button>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

export default function MetersAdmin() {
  const { user } = useAuth();
  const { tables, hareg, overridden, loading, error, refresh } = useKeneMeters();
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState(null);

  const open = (kind, id, source) => {
    setNotice(null);
    setDraft({
      kind,
      id,
      name: source.name,
      payload:
        kind === "table"
          ? { examples: clone(source.examples ?? {}), medeb: clone(source.medeb ?? []), mewqe: clone(source.mewqe ?? []) }
          : { options: clone(source.options ?? {}) },
    });
  };

  const finish = (result) => {
    setDraft(null);
    setNotice(result);
  };

  if (loading) {
    return (
      <ScreenContainer center>
        <ActivityIndicator />
      </ScreenContainer>
    );
  }

  if (draft) {
    return (
      <DraftEditor
        draft={draft}
        setDraft={setDraft}
        overridden={overridden}
        userId={user?.id}
        refresh={refresh}
        onFinished={finish}
      />
    );
  }

  return (
    <ScreenContainer scroll>
      <AdminHeader title="መዐቀኒ ሰንጠረዥ" titleEthiopic />

      <Text style={styles.lead}>
        These rules drive both the ሰንጠረዥ tab and the መስፈሪያ checker, so an edit here changes what the checker
        accepts. Anything not edited stays on the version shipped with the app.
      </Text>

      {error ? <Text style={styles.error}>Could not load saved edits: {error}</Text> : null}
      {notice ? <Text style={notice.tone === "error" ? styles.error : styles.ok}>{notice.text}</Text> : null}

      <Text style={styles.groupTitle}>ሰንጠረዦች</Text>
      {Object.values(tables).map((table) => (
        <Pressable key={table.id} onPress={() => open("table", table.id, table)}>
          <Card style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{table.name}</Text>
              <Text style={styles.rowNote}>{table.medeb?.length ? "መደብ + መውቀዒ ቤት" : "መውቀዒ ቤት only"}</Text>
            </View>
            {overridden.includes(table.id) ? <Text style={styles.badge}>ተስተካክሏል</Text> : null}
          </Card>
        </Pressable>
      ))}

      <Text style={styles.groupTitle}>ሐረግ</Text>
      {Object.values(hareg).map((item) => (
        <Pressable key={item.id} onPress={() => open("hareg", item.id, item)}>
          <Card style={styles.row}>
            <Text style={[styles.rowTitle, { flex: 1 }]}>{item.name}</Text>
            {overridden.includes(item.id) ? <Text style={styles.badge}>ተስተካክሏል</Text> : null}
          </Card>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lead: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },
  groupTitle: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 15,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  rowTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, color: colors.textPrimary },
  rowNote: { ...typography.caption, color: colors.textMuted },
  badge: {
    ...typography.caption,
    fontFamily: fontFamily.ethiopicRegular,
    color: colors.warningText,
    backgroundColor: colors.warning,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  previewCard: { gap: spacing.sm, marginBottom: spacing.lg },
  previewTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 14, color: colors.textMuted },

  side: { marginBottom: spacing.lg },
  sideTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 16, color: colors.primary },
  sideCaption: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },

  entry: { gap: spacing.sm, marginBottom: spacing.md },
  entryHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entryTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 17, color: colors.textPrimary },
  entryNote: { ...typography.caption, color: colors.textMuted },

  branch: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  branchHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  branchTitle: { ...typography.label, color: colors.textSecondary },
  branchThen: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  remove: { ...typography.caption, color: colors.dangerDark, fontFamily: fontFamily.ethiopicRegular },

  countRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  countLabel: { width: 58, fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.textPrimary },
  countLabelOff: { fontFamily: fontFamily.ethiopicRegular, color: colors.textMuted },
  counts: { flexDirection: "row", gap: 4, flexWrap: "wrap", flex: 1 },
  count: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  countOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  countDim: { opacity: 0.35 },
  countText: { ...typography.caption, color: colors.textSecondary },
  countTextOn: { fontFamily: fontFamily.latinBold, color: colors.primaryDark },
  notAllowed: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notAllowedOn: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  notAllowedText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 11, color: colors.textMuted },
  notAllowedTextOn: { fontFamily: fontFamily.ethiopicBold, color: colors.accentDark },

  addRow: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  addRowText: { ...typography.caption, color: colors.primary, fontFamily: fontFamily.ethiopicRegular },

  issues: { gap: 2, borderColor: colors.danger, marginBottom: spacing.md },
  issuesTitle: { ...typography.label, color: colors.dangerDark },
  issueText: { ...typography.caption, color: colors.dangerDark },

  actions: { gap: spacing.sm, marginBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.dangerDark, marginBottom: spacing.sm },
  ok: { ...typography.caption, color: colors.success, marginBottom: spacing.sm },
});
