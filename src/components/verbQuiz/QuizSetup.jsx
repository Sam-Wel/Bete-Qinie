import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Button } from "../ui";
import {
  DIRECTIONS,
  FAMILIES,
  FAMILY_BY_ID,
  FILTERS,
  LANGUAGES,
  LANGUAGE_LABEL,
  filterPool,
  hasLanguage,
  isDue,
  partProgress,
  partsOf,
  stateOf,
  wordsInScope,
} from "../../lib/verbQuiz";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";
import { FamilyGrid } from "./FamilyGrid";
import { Chip, Legend, Section, shared } from "./shared";

const COUNTS = [10, 20, 50, "all"];

function PartPicker({ bank, stats, familyId, pick, lang, onPick, onRemove }) {
  const parts = partsOf(bank, familyId);
  const family = FAMILY_BY_ID[familyId];
  const chosen = pick === "all" ? bank.byFamily[familyId] : parts[pick] || [];
  const usable = chosen.filter((e) => hasLanguage(e, lang)).length;

  return (
    <View style={styles.partRow}>
      <Text style={styles.partLetter}>{family.label}</Text>
      <View style={styles.partChips}>
        <Chip label="Whole group" active={pick === "all"} onPress={() => onPick("all")} />
        {parts.length > 1
          ? parts.map((part, index) => {
              const known = partProgress(stats, part);
              return (
                <Pressable
                  key={index}
                  onPress={() => onPick(index)}
                  style={[styles.partChip, pick === index && styles.partChipActive]}
                >
                  <Text style={[styles.partChipText, pick === index && styles.partChipTextActive]}>{index + 1}</Text>
                  <View style={styles.partDotTrack}>
                    <View style={[styles.partDotFill, { width: `${Math.round(known * 100)}%` }]} />
                  </View>
                </Pressable>
              );
            })
          : null}
      </View>
      <Text style={styles.partCount}>{usable} words</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Text style={styles.partRemove}>✕</Text>
      </Pressable>
    </View>
  );
}

export function QuizSetup({ bank, stats, settings, onChange, onStart, paused, onResume, onDiscard, storageNote }) {
  const { lang, scope, filter, count, direction, alsoShow } = settings;
  const picks = scope.mode === "choose" ? scope.picks : {};
  const pickedIds = Object.keys(picks);
  const [open, setOpen] = useState(false);

  const pool = useMemo(() => wordsInScope(bank, scope, lang), [bank, scope, lang]);
  const matching = useMemo(
    () => (filter === "smart" ? pool.length : filterPool(pool, stats, filter).length),
    [pool, stats, filter]
  );
  const asked = count === "all" ? matching : Math.min(count, matching);

  const tally = useMemo(() => {
    const t = { new: 0, review: 0, known: 0 };
    for (const entry of pool) {
      const state = stateOf(stats[entry.id]);
      if (state === "new") t.new += 1;
      else if (state === "known") t.known += 1;
      if (isDue(stats[entry.id])) t.review += 1;
    }
    return t;
  }, [pool, stats]);

  const available = (familyId) => bank.byFamily[familyId].filter((e) => hasLanguage(e, lang)).length;
  const setPicks = (next) => onChange({ scope: { mode: "choose", picks: next } });

  const toggleFamily = (familyId) => {
    if (scope.mode === "all") {
      setPicks({ [familyId]: "all" });
      return;
    }
    const next = { ...picks };
    if (familyId in next) delete next[familyId];
    else next[familyId] = "all";
    setPicks(next);
  };

  const scopeLabel =
    scope.mode === "all"
      ? "all groups"
      : pickedIds.length === 0
        ? "no groups yet"
        : pickedIds
            .map((id) => `${FAMILY_BY_ID[id].label}${picks[id] === "all" ? "" : ` part ${picks[id] + 1}`}`)
            .join(", ");
  const filterLabel = FILTERS.find((f) => f.key === filter)?.label;
  const directionLabel = DIRECTIONS.find((d) => d.key === direction)?.label;

  const startLabel = asked === 0 ? "Nothing to ask" : `Start · ${asked} question${asked === 1 ? "" : "s"}`;

  return (
    <View>
      {paused ? (
        <View style={[shared.card, styles.resume]}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={styles.resumeTitle}>Pick up where you left off</Text>
            <Text style={shared.hint}>
              {paused.retry
                ? `Second-chance round · ${paused.retry.answers.length} of ${paused.retry.questions.length} done`
                : `${paused.answers.length} of ${paused.questions.length} answered`}
              {" · "}
              {paused.answers.filter((a) => a.correct).length} right
            </Text>
          </View>
          <View style={shared.row}>
            <Button variant="secondary" size="sm" onPress={onDiscard}>
              Discard
            </Button>
            <Button size="sm" onPress={onResume}>
              Resume
            </Button>
          </View>
        </View>
      ) : null}

      {/* One tap to practise; everything else is folded away until wanted. */}
      <View style={[shared.card, styles.hero]}>
        <Text style={styles.heroKicker}>{filterLabel}</Text>
        <View style={styles.tally}>
          <View style={styles.tallyItem}>
            <Text style={[styles.tallyValue, { color: colors.accent }]}>{tally.review}</Text>
            <Text style={styles.tallyLabel}>due for review</Text>
          </View>
          <View style={styles.tallyItem}>
            <Text style={styles.tallyValue}>{tally.new}</Text>
            <Text style={styles.tallyLabel}>new</Text>
          </View>
          <View style={styles.tallyItem}>
            <Text style={[styles.tallyValue, { color: colors.success }]}>{tally.known}</Text>
            <Text style={styles.tallyLabel}>known</Text>
          </View>
        </View>

        <Button onPress={onStart} disabled={asked === 0} style={styles.heroStart}>
          {startLabel}
        </Button>
        {tally.review ? (
          <Pressable onPress={() => router.push("/review")}>
            <Text style={styles.reviewLink}>
              Smart mix asks due words first, or review them as flashcards in ክለሳ ›
            </Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => setOpen((v) => !v)} style={styles.summaryRow} hitSlop={6}>
          <Text style={styles.summaryText} numberOfLines={2}>
            <Text style={styles.summaryEthiopic}>{LANGUAGE_LABEL[lang]}</Text>
            {` · ${scopeLabel} · ${directionLabel}`}
          </Text>
          <Text style={styles.summaryToggle}>{open ? "Hide settings ▴" : "Change ▾"}</Text>
        </Pressable>
      </View>

      {open ? (
        <View style={styles.settings}>
          <Section title="Answer in">
            <View style={shared.row}>
              {LANGUAGES.map((l) => (
                <Chip
                  key={l.code}
                  label={l.label}
                  active={lang === l.code}
                  onPress={() =>
                    onChange({ lang: l.code, alsoShow: LANGUAGES.map((x) => x.code).filter((code) => code !== l.code) })
                  }
                />
              ))}
            </View>
          </Section>

          <Section
            title="Groups · by ending letter"
            right={
              <View style={shared.row}>
                <Chip label="All groups" active={scope.mode === "all"} onPress={() => onChange({ scope: { mode: "all", picks } })} />
                <Chip label="Choose" active={scope.mode === "choose"} onPress={() => setPicks(picks)} />
              </View>
            }
          >
            <Text style={shared.hint}>
              {scope.mode === "all"
                ? "Every group is in. Tap a letter to study just that group."
                : "Tap the groups you want; split a big group into parts of 20."}
            </Text>

            <FamilyGrid
              bank={bank}
              stats={stats}
              mode="pick"
              lang={lang}
              selected={scope.mode === "choose" ? pickedIds : []}
              onPress={toggleFamily}
            />

            <View style={styles.underTiles}>
              <Legend />
              {scope.mode === "choose" ? (
                <View style={shared.row}>
                  <Pressable
                    onPress={() =>
                      setPicks(
                        Object.fromEntries(FAMILIES.filter((f) => available(f.id) > 0).map((f) => [f.id, picks[f.id] ?? "all"]))
                      )
                    }
                  >
                    <Text style={styles.link}>Select all</Text>
                  </Pressable>
                  <Pressable onPress={() => setPicks({})}>
                    <Text style={styles.link}>Clear</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {pickedIds.length ? (
              <View style={styles.parts}>
                {FAMILIES.filter((f) => f.id in picks).map((f) => (
                  <PartPicker
                    key={f.id}
                    bank={bank}
                    stats={stats}
                    familyId={f.id}
                    pick={picks[f.id]}
                    lang={lang}
                    onPick={(pick) => setPicks({ ...picks, [f.id]: pick })}
                    onRemove={() => {
                      const next = { ...picks };
                      delete next[f.id];
                      setPicks(next);
                    }}
                  />
                ))}
                <Text style={shared.muted}>Parts follow the order the words were entered in the dictionary.</Text>
              </View>
            ) : null}
          </Section>

          <Section title="Words to include">
            <View style={shared.row}>
              {FILTERS.map((f) => (
                <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => onChange({ filter: f.key })} />
              ))}
            </View>
            <Text style={shared.hint}>{FILTERS.find((f) => f.key === filter)?.hint}</Text>
          </Section>

          <Section title="Questions">
            <View style={shared.row}>
              {COUNTS.map((n) => (
                <Chip key={n} label={n === "all" ? "All" : String(n)} active={count === n} onPress={() => onChange({ count: n })} />
              ))}
            </View>
            <Text style={[shared.hint, count !== "all" && matching < count && { color: colors.accent }]}>
              {matching === 0
                ? "No words match. Pick other groups or another filter."
                : count !== "all" && matching < count
                  ? `Only ${matching} words match, so the quiz will have ${matching}.`
                  : `${matching} words match.`}
            </Text>
          </Section>

          <Section title="Question type">
            <View style={shared.row}>
              {DIRECTIONS.map((d) => (
                <Chip key={d.key} label={d.label} active={direction === d.key} onPress={() => onChange({ direction: d.key })} />
              ))}
            </View>
          </Section>

          <Section title="Also show in answers">
            <View style={shared.row}>
              {LANGUAGES.filter((l) => l.code !== lang).map((l) => {
                const on = alsoShow.includes(l.code);
                return (
                  <Chip
                    key={l.code}
                    label={`${on ? "✓ " : ""}${l.label}`}
                    ethiopic={l.code !== "en"}
                    active={on}
                    onPress={() => onChange({ alsoShow: on ? alsoShow.filter((c) => c !== l.code) : [...alsoShow, l.code] })}
                  />
                );
              })}
            </View>
          </Section>

          <Button onPress={onStart} disabled={asked === 0} style={styles.start}>
            {startLabel}
          </Button>
        </View>
      ) : null}

      {storageNote ? <Text style={[shared.muted, styles.note]}>{storageNote}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  resume: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderColor: colors.borderGold,
    backgroundColor: colors.surfaceMuted,
  },
  resumeTitle: { ...typography.bodySemiBold, color: colors.textPrimary },
  hero: { gap: spacing.md, marginBottom: spacing.xl, ...shadows.card },
  heroKicker: { ...typography.label, color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase" },
  tally: { flexDirection: "row", gap: spacing.xl },
  tallyItem: { gap: 0 },
  tallyValue: { fontFamily: fontFamily.latinBold, fontSize: 28, lineHeight: 34, color: colors.textPrimary },
  tallyLabel: { ...typography.caption, color: colors.textMuted },
  heroStart: { alignSelf: "stretch" },
  reviewLink: { ...typography.caption, color: colors.primary },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  summaryEthiopic: { fontFamily: fontFamily.ethiopicBold },
  summaryToggle: { ...typography.label, color: colors.primary },
  settings: { marginBottom: spacing.md },
  underTiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm, marginTop: 2 },
  link: { ...typography.label, color: colors.primary, textDecorationLine: "underline" },
  parts: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  partRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  partLetter: { fontFamily: fontFamily.ethiopicBold, fontSize: 18, color: colors.textPrimary, minWidth: 56 },
  partChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1, minWidth: 200 },
  partChip: {
    minWidth: 34,
    paddingTop: 5,
    paddingBottom: 4,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: 3,
  },
  partChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  partChipText: { ...typography.label, color: colors.textSecondary },
  partChipTextActive: { color: colors.primaryDark },
  partDotTrack: { width: 18, height: 3, borderRadius: 2, backgroundColor: colors.borderMuted, overflow: "hidden" },
  partDotFill: { height: 3, backgroundColor: colors.success },
  partCount: { ...typography.caption, color: colors.textMuted },
  partRemove: { ...typography.label, color: colors.textMuted },
  start: { alignSelf: "flex-start", minWidth: 220 },
  note: { marginTop: spacing.md },
});
