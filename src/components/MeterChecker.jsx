import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { OrnamentDivider } from "./ui/OrnamentDivider";
import { MeterPicker, rememberMeter } from "./MeterPicker";
import { colors, fontFamily, gradients, radii, shadows, spacing, typography } from "../theme";
import {
  LINE_TYPES,
  MEASURE_SOURCES,
  METERS,
  NOT_ALLOWED,
  ORDINALS,
  TYPE_LABEL,
  buildLineSlots,
  isAllowed,
  meterTables,
  partMeasure,
  slotNeeded,
  slotOptions,
} from "../lib/keneMeters";
import { useKeneMeters } from "../hooks/useKeneMeters";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { clearDraft, draftFits, hasContent, loadDraft, saveDraft } from "../lib/meaqeniDraft";

const SPRING = { damping: 15, stiffness: 300 };
const EMPTY = { type: null, count: null, text: "", skipped: false };
// Segments hug their words: never narrower than CELL_MIN, and past CELL_MAX the words
// wrap onto another line.
const CELL_MIN = 72;
const CELL_MAX = 280;
const CELL_GAP = 20;
// Past this width a long line wraps onto a second row instead of scrolling sideways.
const WRAP_LINES_AT = 720;

const buildState = (meter) =>
  meter.lines.map((def) => ({
    parts: def.parts.map(() => ({ table: 0, source: "medeb" })),
    slots: Object.fromEntries(buildLineSlots(def).map((slot) => [slot.key, { ...EMPTY }])),
  }));

function Chip({ label, selected, muted, onPress }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.9, SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING);
        }}
        style={[styles.chip, muted && styles.chipMuted, selected && styles.chipSelected]}
      >
        {selected ? <LinearGradient colors={gradients.goldButton} style={StyleSheet.absoluteFillObject} /> : null}
        <Text style={[styles.chipText, muted && styles.chipTextMuted, selected && styles.chipTextSelected]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// Each cell is a complete, legal answer — one tap sets both the type and the count.
function OptionMatrix({ options, value, optional, skipLabel, onPick, onSkip }) {
  return (
    <View style={styles.matrix}>
      {LINE_TYPES.map((type) => {
        const counts = options[type.key];
        return (
          <View key={type.key} style={styles.matrixRow}>
            <Text style={[styles.matrixType, !counts && styles.matrixTypeMuted]}>{type.label}</Text>
            {counts ? (
              <View style={styles.matrixCounts}>
                {counts.map((count) => (
                  <Chip
                    key={count}
                    label={String(count)}
                    selected={!value.skipped && value.type === type.key && value.count === count}
                    onPress={() => onPick(type.key, count)}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.notAllowed}>{NOT_ALLOWED}</Text>
            )}
          </View>
        );
      })}

      {optional ? (
        <View style={styles.skipRow}>
          <Chip label={skipLabel} muted selected={value.skipped} onPress={onSkip} />
        </View>
      ) : null}
    </View>
  );
}

function Toggle({ hint, options, activeKey, onSelect }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleHint}>{hint}</Text>
      {options.map((option) => {
        const on = option.key === activeKey;
        return (
          <Pressable
            key={option.key}
            onPress={() => (on ? null : onSelect(option.key))}
            style={[styles.toggleChip, on && styles.toggleChipActive]}
          >
            <Text style={[styles.toggleText, on && styles.toggleTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// One segment of the line, written on an underline like a verse on ruled paper: the
// words are the only large thing. Beneath them one small caption names the segment and,
// once measured, shows the measure; tapping it opens the measure picker. The underline
// carries the state at a glance: bright while being written, gold once measured, red if
// the measure does not fit.
const LINE_HEIGHT = 28;

function SlotCell({ slot, value, active, broken, unused, onFocus, onMeasure, onChangeText, onLayout }) {
  const measured = !unused && Boolean(value.type) && value.count != null && !value.skipped;
  const result = unused ? null : value.skipped ? "none" : measured ? `${TYPE_LABEL[value.type]} ${value.count}` : null;

  return (
    <View onLayout={onLayout} style={[styles.cell, unused && styles.cellUnused]}>
      {/* An invisible copy of the words sets the segment's size and the input lies over
          it, so the line fits whatever is typed. */}
      <View
        style={[
          styles.cellField,
          measured && styles.cellFieldMeasured,
          broken && styles.cellFieldBroken,
          active && styles.cellFieldActive,
        ]}
      >
        <Text style={[styles.cellInput, styles.cellCopy]} aria-hidden>
          {`${value.text}\u200b`}
        </Text>
        <TextInput
          value={value.text}
          onChangeText={onChangeText}
          onFocus={onFocus}
          accessibilityLabel={slot.label}
          style={[styles.cellInput, styles.cellInputOver]}
          multiline
        />
      </View>

      <Pressable
        onPress={onMeasure}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${slot.label}: measure`}
        style={({ hovered, focused }) => [styles.caption, (hovered || focused) && styles.captionHover]}
      >
        <Text style={styles.captionName} numberOfLines={1}>
          {slot.short}
          {result ? (
            <Text
              style={[
                styles.captionResult,
                broken && styles.captionBroken,
                value.skipped && styles.captionSkipped,
              ]}
            >{`  ·  ${result}`}</Text>
          ) : active && !unused ? (
            <>
              {"  ·  "}
              <Text style={styles.captionAction}>measure</Text>
            </>
          ) : null}
        </Text>
      </Pressable>
    </View>
  );
}

export function MeterChecker() {
  const { meters } = useKeneMeters();
  const [meterId, setMeterId] = useState(METERS[0].id);
  // Saved edits only change what the tables contain, never the slot layout, so state
  // built from the bundled defaults stays valid once an override arrives.
  const meter = meters.find((m) => m.id === meterId) ?? meters[0];

  const [state, setState] = useState(() => buildState(METERS[0]));
  const [active, setActive] = useState({ line: 0, slot: "s0" });
  const [measuring, setMeasuring] = useState(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);
  const scrollers = useRef({});
  useEffect(() => rememberMeter(meterId), [meterId]);
  const cellX = useRef({});
  const wrapLines = useWindowDimensions().width >= WRAP_LINES_AT;
  const { user, profile } = useAuth();

  const slotsByLine = meter.lines.map(buildLineSlots);
  const sequence = slotsByLine.flatMap((slots, line) => slots.map((slot) => ({ line, slot: slot.key })));
  const showsTableNames = meterTables(meter).length > 1;

  // Work in progress outlives leaving the page, so a half-measured ቅኔ is not lost to a
  // stray tap on the menu.
  useEffect(() => {
    let active = true;

    loadDraft().then((draft) => {
      if (!active) return;
      const target = METERS.find((m) => m.id === draft?.meterId);

      if (target && hasContent(draft) && draftFits(draft, target.lines.map(buildLineSlots))) {
        setMeterId(draft.meterId);
        setState(draft.state);
        setTitle(draft.title ?? "");
        setRestored(true);
      }
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => saveDraft({ meterId, state, title }), 400);
    return () => clearTimeout(timer);
  }, [hydrated, meterId, state, title]);

  // Advancing can land on a cell that is scrolled off the side, so bring it into view.
  // Cells are as wide as their words, so each one's position is read from its layout.
  useEffect(() => {
    const scroller = scrollers.current[active.line];
    const x = cellX.current[`${active.line}:${active.slot}`];
    if (!scroller || x == null) return;
    scroller.scrollTo({ x: Math.max(0, x - 24), animated: true });
  }, [active.line, active.slot, meterId]);

  const optionsOf = (lineIndex, slot) => slotOptions(meter.lines[lineIndex], slot, state[lineIndex]);

  const readyOf = (lineIndex, slot) => {
    const value = state[lineIndex].slots[slot.key];
    return isAllowed(optionsOf(lineIndex, slot), value.type, value.count);
  };

  const neededOf = (lineIndex, slot) => slotNeeded(meter.lines[lineIndex], slot, state[lineIndex]);

  // An optional slot is settled whether or not it gets used; only a filled one must be legal.
  // A follow with nothing to answer to is settled by not being there.
  const settledOf = (lineIndex, slot) => {
    if (!neededOf(lineIndex, slot)) return true;
    if (!slot.optional) return readyOf(lineIndex, slot);
    return !state[lineIndex].slots[slot.key].type || readyOf(lineIndex, slot);
  };

  const patchSlot = (lineIndex, slotKey, next) =>
    setState((prev) =>
      prev.map((line, i) =>
        i === lineIndex ? { ...line, slots: { ...line.slots, [slotKey]: { ...line.slots[slotKey], ...next } } } : line
      )
    );

  // Re-measuring a pair invalidates whatever was picked inside it, so clear both slots.
  // Moving a መውቀዒ ቤት to another sheet can also change which sheet measures the line's
  // መደብ, so those pairs are cleared with it.
  const patchPart = (lineIndex, partIndex, next) =>
    setState((prev) =>
      prev.map((line, i) => {
        if (i !== lineIndex) return line;
        const parts = meter.lines[i].parts;
        const resheeted = parts[partIndex].kind === "mewqe" && "table" in next;
        const cleared = Object.fromEntries(
          slotsByLine[i]
            .filter((slot) => slot.part === partIndex || (resheeted && parts[slot.part].swap))
            .map((slot) => [slot.key, { ...line.slots[slot.key], type: null, count: null }])
        );
        return {
          ...line,
          parts: line.parts.map((part, p) => (p === partIndex ? { ...part, ...next } : part)),
          slots: { ...line.slots, ...cleared },
        };
      })
    );

  const advanceFrom = (lineIndex, slotKey) => {
    const at = sequence.findIndex((s) => s.line === lineIndex && s.slot === slotKey);
    const next = sequence[at + 1];
    if (next) setActive(next);
  };

  const pick = (lineIndex, slotKey, type, count) => {
    patchSlot(lineIndex, slotKey, { type, count, skipped: false });
    setMeasuring(null);
    advanceFrom(lineIndex, slotKey);
  };

  const skip = (lineIndex, slotKey, wasSkipped) => {
    patchSlot(lineIndex, slotKey, { type: null, count: null, skipped: !wasSkipped });
    setMeasuring(null);
    if (!wasSkipped) advanceFrom(lineIndex, slotKey);
  };

  const openMeasure = (lineIndex, slotKey) => {
    setActive({ line: lineIndex, slot: slotKey });
    setMeasuring({ line: lineIndex, slot: slotKey });
  };

  const switchMeter = (next) => {
    setMeterId(next.id);
    setState(buildState(next));
    setActive({ line: 0, slot: "s0" });
    setMeasuring(null);
    setTitle("");
    setSaved(null);
    setRestored(false);
  };

  const reset = () => {
    setState(buildState(meter));
    setActive({ line: 0, slot: "s0" });
    setMeasuring(null);
    setTitle("");
    setSaved(null);
    setRestored(false);
    clearDraft();
  };

  // Progress counts only the slots a poem must have; ሐረግ is never part of the target.
  const required = sequence.filter(({ line, slot }) => !slotsByLine[line].find((s) => s.key === slot).optional);
  const settledCount = required.filter(({ line, slot }) =>
    settledOf(line, slotsByLine[line].find((s) => s.key === slot))
  ).length;
  const complete = settledCount === required.length;
  const optionalCount = sequence.length - required.length;
  // The words as written, one line per ቤት, skipping segments left empty.
  const poemText = () =>
    slotsByLine
      .map((slots, i) =>
        slots
          .map((slot) => state[i].slots[slot.key].text.trim())
          .filter(Boolean)
          .join(" ")
      )
      .filter(Boolean)
      .join("\n");

  const savePoem = async () => {
    setSaving(true);
    setSaved(null);

    const { error: saveError } = await supabase.from("blog_posts").insert([
      {
        title: title.trim(),
        content: poemText(),
        content_type: meter.contentType ?? meter.title,
        written_by: profile?.display_name ?? user?.email ?? "",
        created_date: new Date().toISOString(),
        is_published: true,
        is_public: false,
        user_id: user?.id,
      },
    ]);

    setSaving(false);
    if (saveError) {
      setSaved({ tone: "error", text: saveError.message });
      return;
    }
    setSaved({ tone: "ok", text: "Saved." });
    setRestored(false);
    clearDraft();
  };

  const touched = state.some((line) =>
    Object.values(line.slots).some((value) => value.skipped || value.type || value.text)
  );

  const sheet = measuring
    ? (() => {
        const slots = slotsByLine[measuring.line];
        const slot = slots.find((s) => s.key === measuring.slot);
        if (!slot) return null;
        return {
          slot,
          value: state[measuring.line].slots[slot.key],
          part: meter.lines[measuring.line].parts[slot.part],
          config: state[measuring.line].parts[slot.part],
          measure:
            slot.kind === "hareg"
              ? null
              : partMeasure(meter.lines[measuring.line], slot.part, state[measuring.line]),
          options: optionsOf(measuring.line, slot),
          needed: neededOf(measuring.line, slot),
          leadLabel: slots.find((s) => s.key === slot.leadKey)?.label,
        };
      })()
    : null;

  return (
    <View style={styles.wrapper}>
      <MeterPicker
        meters={meters}
        meterId={meterId}
        onPick={switchMeter}
        right={
          <Text style={styles.progress}>
            {settledCount}/{required.length}
          </Text>
        }
      />

      <Text style={styles.meterSubtitle}>
        Write each segment on its line, then tap measure beneath it.
        {optionalCount ? ` ${optionalCount} optional.` : ""}
      </Text>

      {restored ? <Text style={styles.restored}>Your unfinished work is back.</Text> : null}

      {slotsByLine.map((slots, lineIndex) => {
        const cells = slots.map((slot) => {
          const value = state[lineIndex].slots[slot.key];
          const unused = !neededOf(lineIndex, slot);
          const filled = !unused && Boolean(value.type) && value.count != null && !value.skipped;

          return (
            <SlotCell
              key={slot.key}
              slot={slot}
              value={value}
              active={active.line === lineIndex && active.slot === slot.key}
              unused={unused}
              broken={filled && !readyOf(lineIndex, slot)}
              onFocus={() => setActive({ line: lineIndex, slot: slot.key })}
              onMeasure={() => openMeasure(lineIndex, slot.key)}
              onChangeText={(text) => patchSlot(lineIndex, slot.key, { text })}
              onLayout={(e) => {
                cellX.current[`${lineIndex}:${slot.key}`] = e.nativeEvent.layout.x;
              }}
            />
          );
        });

        return (
          <View key={lineIndex} style={styles.lineBlock}>
            <View style={styles.lineHeader}>
              <Text style={styles.lineLabel}>ቤት {ORDINALS[lineIndex]}</Text>
              <View style={styles.lineRule} />
            </View>

            {wrapLines ? (
              <View style={[styles.lineRow, styles.lineRowWrapped]}>{cells}</View>
            ) : (
              <ScrollView
                ref={(node) => {
                  scrollers.current[lineIndex] = node;
                }}
                horizontal
                showsHorizontalScrollIndicator
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.lineRow}
              >
                {cells}
              </ScrollView>
            )}
          </View>
        );
      })}

      {complete ? (
        <Animated.View entering={FadeIn.duration(320)} style={styles.finale}>
          <OrnamentDivider />
          <Text style={styles.finaleTitle}>It fits</Text>
          <Text style={styles.finaleSubtitle}>All lines fit {meter.title}.</Text>

          {slotsByLine.map((slots, index) => {
            const used = slots.filter((slot) => state[index].slots[slot.key].type && neededOf(index, slot));
            return (
              <View key={index} style={styles.finaleLine}>
                {/* Each segment's words with its measure beneath, as they were written. */}
                {used.map((slot) => {
                  const value = state[index].slots[slot.key];
                  const words = value.text.trim();
                  return (
                    <View key={slot.key} style={styles.finaleSegment}>
                      {words ? <Text style={styles.finaleWords}>{words}</Text> : null}
                      <Text style={styles.finalePattern}>{`${TYPE_LABEL[value.type]} ${value.count}`}</Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
          <OrnamentDivider style={{ marginTop: spacing.md }} />

          {user ? (
            <View style={styles.save}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor={colors.textMuted}
                style={styles.saveTitle}
              />
              <Pressable
                onPress={savePoem}
                disabled={saving || !title.trim() || !poemText()}
                style={[
                  styles.saveButton,
                  (saving || !title.trim() || !poemText()) && styles.saveButtonOff,
                ]}
              >
                <Text style={styles.saveButtonText}>{saving ? "..." : "Save"}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.saveHint}>Sign in to save this ቅኔ.</Text>
          )}

          {!poemText() && user ? (
            <Text style={styles.saveHint}>Type the words into the cells to save this one.</Text>
          ) : null}
          {saved ? (
            <Text style={saved.tone === "error" ? styles.saveError : styles.saveOk}>{saved.text}</Text>
          ) : null}
        </Animated.View>
      ) : null}

      {touched ? (
        <Pressable onPress={reset} style={styles.resetButton}>
          <Text style={styles.resetText}>Start over</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={Boolean(sheet)}
        transparent
        animationType="fade"
        onRequestClose={() => setMeasuring(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMeasuring(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {sheet ? (
              <>
                <View style={styles.sheetHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>{sheet.slot.label}</Text>
                    <Text style={styles.sheetCaption}>
                      ቤት {ORDINALS[measuring.line]}
                      {showsTableNames && sheet.measure ? ` · ${sheet.measure.table.name}` : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => setMeasuring(null)} hitSlop={10} style={styles.sheetClose}>
                    <Text style={styles.sheetCloseText}>✕</Text>
                  </Pressable>
                </View>

                {sheet.value.text ? <Text style={styles.sheetWords}>{sheet.value.text}</Text> : null}

                <OrnamentDivider style={{ marginBottom: spacing.xs }} />

                {sheet.part.kind === "medeb" && sheet.part.sourceChoice && !sheet.measure.fixed ? (
                  <Toggle
                    hint="Measure by"
                    options={MEASURE_SOURCES}
                    activeKey={sheet.measure.source}
                    onSelect={(source) => patchPart(measuring.line, sheet.slot.part, { source })}
                  />
                ) : null}

                {sheet.part.kind !== "hareg" && sheet.part.tables.length > 1 ? (
                  <Toggle
                    hint="Measure by"
                    options={sheet.part.tables.map((table, i) => ({ key: i, label: table.name }))}
                    activeKey={sheet.config.table}
                    onSelect={(table) => patchPart(measuring.line, sheet.slot.part, { table })}
                  />
                ) : null}

                {!sheet.needed ? (
                  <Text style={styles.waitingText}>
                    Nothing is measured here — the {sheet.leadLabel} stands on its own or was left out.
                  </Text>
                ) : sheet.options ? (
                  <OptionMatrix
                    options={sheet.options}
                    value={sheet.value}
                    optional={Boolean(sheet.slot.optional)}
                    skipLabel={sheet.slot.kind === "hareg" ? "No ሐረግ" : "None"}
                    onPick={(type, count) => pick(measuring.line, sheet.slot.key, type, count)}
                    onSkip={() => skip(measuring.line, sheet.slot.key, sheet.value.skipped)}
                  />
                ) : (
                  <Text style={styles.waitingText}>
                    Measure {sheet.leadLabel} first — it decides what can go here.
                  </Text>
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },

  meterSubtitle: { fontFamily: fontFamily.latinRegular, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  progress: { fontFamily: fontFamily.latinRegular, fontSize: 12, lineHeight: 18, color: colors.textMuted, paddingTop: 6 },

  lineBlock: { gap: spacing.xs },
  lineHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  lineLabel: { fontFamily: fontFamily.ethiopicRegular, fontSize: 11, color: colors.textMuted, letterSpacing: 0.5, opacity: 0.7 },
  lineRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border, opacity: 0.6 },
  lineRow: { flexDirection: "row", alignItems: "flex-start", columnGap: CELL_GAP, rowGap: 16, paddingVertical: 4, paddingRight: spacing.sm },
  lineRowWrapped: { flexWrap: "wrap", paddingRight: 0 },

  cell: { minWidth: CELL_MIN, maxWidth: CELL_MAX, gap: 3 },
  cellUnused: { opacity: 0.35 },
  cellField: {
    minHeight: LINE_HEIGHT,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    paddingBottom: 2,
  },
  cellFieldMeasured: { borderBottomColor: colors.primary },
  cellFieldBroken: { borderBottomColor: colors.danger },
  // Bright and neutral, so red only ever means a measure that does not fit.
  cellFieldActive: { borderBottomColor: colors.textPrimary, borderBottomWidth: 2, paddingBottom: 1.5 },
  // What the learner writes is the point of the line, so it is the largest thing on it.
  cellInput: {
    fontFamily: fontFamily.latinSemiBold,
    fontSize: 18,
    lineHeight: LINE_HEIGHT,
    color: colors.textPrimary,
    padding: 0,
    textAlignVertical: "top",
    outlineStyle: "none",
  },
  cellCopy: { opacity: 0, paddingRight: 4, pointerEvents: "none" },
  cellInputOver: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, resize: "none", overflow: "hidden" },
  caption: { alignSelf: "flex-start", outlineStyle: "none" },
  captionHover: { opacity: 0.75 },
  // Labels stay small and quiet; colour, not weight, marks a measure.
  captionName: { fontFamily: fontFamily.ethiopicRegular, fontSize: 10.5, lineHeight: 14, color: colors.textMuted, opacity: 0.8 },
  captionResult: { color: colors.primaryDark },
  captionBroken: { color: colors.dangerDark },
  captionSkipped: { fontFamily: fontFamily.ethiopicRegular, color: colors.textMuted },
  captionAction: { color: colors.primaryDark, textDecorationLine: "underline" },

  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.modal,
  },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  sheetTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 18, color: colors.textPrimary },
  sheetCaption: { ...typography.caption, color: colors.textMuted },
  sheetClose: { padding: spacing.xs },
  sheetCloseText: { fontSize: 16, color: colors.textSecondary },
  sheetWords: { fontFamily: fontFamily.ethiopicRegular, fontSize: 17, color: colors.primaryDark },

  toggleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
  toggleHint: { fontFamily: fontFamily.ethiopicRegular, fontSize: 12, color: colors.textMuted, marginRight: 2 },
  toggleChip: {
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toggleChipActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  toggleText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 13, color: colors.textSecondary },
  toggleTextActive: { fontFamily: fontFamily.ethiopicBold, color: colors.accentDark },

  matrix: { gap: spacing.xs },
  matrixRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 38 },
  matrixType: { fontFamily: fontFamily.ethiopicBold, fontSize: 15, color: colors.textPrimary, width: 52 },
  matrixTypeMuted: { fontFamily: fontFamily.ethiopicRegular, color: colors.textMuted },
  matrixCounts: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", flex: 1 },
  notAllowed: { fontFamily: fontFamily.ethiopicRegular, fontSize: 13, color: colors.textMuted },
  skipRow: { marginTop: spacing.xs, alignItems: "flex-start" },

  chip: {
    minWidth: 42,
    height: 34,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chipMuted: { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  chipSelected: { borderColor: "transparent", ...shadows.card },
  chipText: { ...typography.label, color: colors.primaryDark },
  chipTextMuted: { fontFamily: fontFamily.ethiopicRegular, color: colors.textSecondary },
  chipTextSelected: { color: colors.onPrimary },

  waitingText: { ...typography.caption, color: colors.textMuted, fontStyle: "italic" },

  finale: { gap: spacing.sm, paddingVertical: spacing.md, alignItems: "center" },
  finaleTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, color: colors.primary },
  finaleSubtitle: { ...typography.caption, color: colors.textSecondary },
  finaleLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: CELL_GAP,
    rowGap: spacing.sm,
    marginTop: spacing.sm,
  },
  finaleSegment: { alignItems: "center", gap: 2 },
  finaleWords: { fontFamily: fontFamily.latinSemiBold, fontSize: 18, lineHeight: 28, color: colors.textPrimary, textAlign: "center" },
  finalePattern: { fontFamily: fontFamily.ethiopicRegular, fontSize: 10.5, lineHeight: 14, color: colors.primaryDark },

  save: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, width: "100%" },
  saveTitle: {
    flex: 1,
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  saveButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  saveButtonOff: { opacity: 0.45 },
  saveButtonText: { fontFamily: fontFamily.ethiopicBold, fontSize: 14, color: colors.onPrimary },
  saveHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs, textAlign: "center" },
  saveOk: { ...typography.caption, color: colors.success, marginTop: spacing.xs },
  saveError: { ...typography.caption, color: colors.dangerDark, marginTop: spacing.xs },

  restored: {
    ...typography.caption,
    fontFamily: fontFamily.ethiopicRegular,
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },

  resetButton: { alignSelf: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  resetText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.textSecondary },
});
