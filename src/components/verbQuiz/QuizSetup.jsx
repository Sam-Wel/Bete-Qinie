import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../ui";
import {
  DIRECTIONS,
  FAMILIES,
  FAMILY_BY_ID,
  FILTERS,
  LANGUAGES,
  LANGUAGE_LABEL,
  familyProgress,
  filterPool,
  hasLanguage,
  partProgress,
  partsOf,
  stateOf,
  wordsInScope,
} from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { Chip, Legend, Section, StackedBar, shared } from "./shared";

const COUNTS = [10, 20, 50, "all"];

function FamilyTile({ family, available, progress, selected, onPress, width }) {
  const empty = available === 0;
  return (
    <Pressable
      onPress={onPress}
      disabled={empty}
      style={({ hovered }) => [
        styles.tile,
        { width },
        selected && styles.tileSelected,
        hovered && !empty && !selected && styles.tileHover,
        empty && styles.tileEmpty,
      ]}
    >
      <Text style={[styles.tileLetter, selected && styles.tileLetterSelected]}>{family.label}</Text>
      <Text style={styles.tileCount}>{empty ? "none" : available}</Text>
      <StackedBar counts={progress.counts} total={progress.total} height={4} style={styles.tileBar} />
    </Pressable>
  );
}

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

  const pool = useMemo(() => wordsInScope(bank, scope, lang), [bank, scope, lang]);
  const matching = useMemo(
    () => (filter === "smart" ? pool.length : filterPool(pool, stats, filter).length),
    [pool, stats, filter]
  );
  const asked = count === "all" ? matching : Math.min(count, matching);

  const available = (familyId) => bank.byFamily[familyId].filter((e) => hasLanguage(e, lang)).length;

  const setPicks = (next) => onChange({ scope: { mode: Object.keys(next).length ? "choose" : scope.mode, picks: next } });

  const toggleFamily = (familyId) => {
    if (scope.mode === "all") {
      onChange({ scope: { mode: "choose", picks: { [familyId]: "all" } } });
      return;
    }
    const next = { ...picks };
    if (familyId in next) delete next[familyId];
    else next[familyId] = "all";
    onChange({ scope: { mode: "choose", picks: next } });
  };

  // As many tiles per row as fit, stretched to fill it, so a phone gets four
  // across instead of three and a gap.
  const [tilesWidth, setTilesWidth] = useState(0);
  const perRow = Math.max(1, Math.floor((tilesWidth + TILE_GAP) / (TILE_MIN + TILE_GAP)));
  const tileWidth = tilesWidth ? Math.min(TILE_MAX, (tilesWidth - TILE_GAP * (perRow - 1)) / perRow) : TILE_MAX;

  const unseenInPool = pool.filter((e) => stateOf(stats[e.id]) === "new").length;
  const filterHint = FILTERS.find((f) => f.key === filter)?.hint;

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

      <Section title="Answer in">
        <View style={shared.row}>
          {LANGUAGES.map((l) => (
            <Chip
              key={l.code}
              label={l.label}
              active={lang === l.code}
              onPress={() =>
                onChange({
                  lang: l.code,
                  alsoShow: LANGUAGES.map((x) => x.code).filter((code) => code !== l.code),
                })
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
            <Chip
              label="Choose groups"
              active={scope.mode === "choose"}
              onPress={() => onChange({ scope: { mode: "choose", picks } })}
            />
          </View>
        }
      >
        <Text style={shared.hint}>
          {scope.mode === "all"
            ? "Every group is in. Tap a letter to study just that group."
            : "Tap the groups you want; split a big group into parts of 20."}
        </Text>

        <View style={styles.tiles} onLayout={(e) => setTilesWidth(e.nativeEvent.layout.width)}>
          {FAMILIES.map((family) => (
            <FamilyTile
              key={family.id}
              family={family}
              available={available(family.id)}
              progress={familyProgress(bank, stats, family.id)}
              selected={scope.mode === "choose" && family.id in picks}
              width={tileWidth}
              onPress={() => toggleFamily(family.id)}
            />
          ))}
        </View>

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
              <Pressable onPress={() => onChange({ scope: { mode: "choose", picks: {} } })}>
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
                  onChange({ scope: { mode: "choose", picks: next } });
                }}
              />
            ))}
            <Text style={shared.muted}>Parts follow the order the words were entered in the dictionary.</Text>
          </View>
        ) : null}

        <Text style={styles.summary}>
          {pool.length} words with {LANGUAGE_LABEL[lang]} · {unseenInPool} you haven't seen yet
        </Text>
      </Section>

      <Section title="Words to include">
        <View style={shared.row}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => onChange({ filter: f.key })} />
          ))}
        </View>
        <Text style={shared.hint}>{filterHint}</Text>
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
                onPress={() =>
                  onChange({ alsoShow: on ? alsoShow.filter((c) => c !== l.code) : [...alsoShow, l.code] })
                }
              />
            );
          })}
        </View>
      </Section>

      <Button onPress={onStart} disabled={asked === 0} style={styles.start}>
        {asked === 0 ? "Nothing to ask" : `Start · ${asked} question${asked === 1 ? "" : "s"}`}
      </Button>

      {storageNote ? <Text style={[shared.muted, styles.note]}>{storageNote}</Text> : null}
    </View>
  );
}

const TILE_MIN = 76;
const TILE_MAX = 100;
const TILE_GAP = spacing.sm;

const styles = StyleSheet.create({
  resume: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.xl,
    borderColor: colors.borderGold,
    backgroundColor: colors.surfaceMuted,
  },
  resumeTitle: { ...typography.bodySemiBold, color: colors.textPrimary },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: TILE_GAP },
  tile: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: 2,
  },
  tileSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tileHover: { borderColor: colors.primary },
  tileEmpty: { opacity: 0.45 },
  tileLetter: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, lineHeight: 28, color: colors.textPrimary },
  tileLetterSelected: { color: colors.primaryDark },
  tileCount: { ...typography.caption, color: colors.textSecondary },
  tileBar: { alignSelf: "stretch", marginTop: 4 },
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
  summary: { ...typography.label, color: colors.textSecondary, marginTop: spacing.xs },
  start: { alignSelf: "flex-start", minWidth: 220 },
  note: { marginTop: spacing.md },
});
