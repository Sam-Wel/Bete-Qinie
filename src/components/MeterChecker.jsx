import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { OrnamentDivider } from "./ui/OrnamentDivider";
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
  partSource,
  partTable,
  slotOptions,
} from "../lib/keneMeters";

const SPRING = { damping: 15, stiffness: 300 };
const EMPTY = { type: null, count: null, text: "", skipped: false };
const CELL_WIDTH = 132;
const CELL_GAP = spacing.sm;

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
function OptionMatrix({ options, value, optional, onPick, onSkip }) {
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
          <Chip label="ሐረግ የለም" muted selected={value.skipped} onPress={onSkip} />
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

// One cell per segment, read across as the line reads. The words are typed in the cell;
// the pill beneath opens the measure picker and then shows what was chosen.
function SlotCell({ slot, value, active, broken, onFocus, onMeasure, onChangeText }) {
  const filled = Boolean(value.type) && value.count != null && !value.skipped;
  const measure = value.skipped ? "የለም" : filled ? `${TYPE_LABEL[value.type]} ${value.count}` : "ልኬት ይምረጡ";

  return (
    <View style={[styles.cell, active && styles.cellActive]}>
      <Text style={styles.cellLabel} numberOfLines={1}>
        {slot.short}
      </Text>

      <TextInput
        value={value.text}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder="ቃላቱን ይጻፉ"
        placeholderTextColor={colors.textMuted}
        style={styles.cellInput}
        multiline
      />

      <Pressable
        onPress={onMeasure}
        style={[
          styles.measure,
          filled && !broken && styles.measureFilled,
          broken && styles.measureBroken,
          !filled && !value.skipped && styles.measureEmpty,
        ]}
      >
        <Text
          style={[
            styles.measureText,
            filled && !broken && styles.measureTextFilled,
            broken && styles.measureTextBroken,
          ]}
          numberOfLines={1}
        >
          {measure}
        </Text>
      </Pressable>
    </View>
  );
}

export function MeterChecker() {
  const [meterId, setMeterId] = useState(METERS[0].id);
  const meter = METERS.find((m) => m.id === meterId);

  const [state, setState] = useState(() => buildState(METERS[0]));
  const [active, setActive] = useState({ line: 0, slot: "s0" });
  const [measuring, setMeasuring] = useState(null);
  const scrollers = useRef({});

  const slotsByLine = meter.lines.map(buildLineSlots);
  const sequence = slotsByLine.flatMap((slots, line) => slots.map((slot) => ({ line, slot: slot.key })));
  const showsTableNames = meterTables(meter).length > 1;

  // Advancing can land on a cell that is scrolled off the side, so bring it into view.
  useEffect(() => {
    const index = slotsByLine[active.line]?.findIndex((s) => s.key === active.slot) ?? -1;
    const scroller = scrollers.current[active.line];
    if (!scroller || index < 0) return;
    scroller.scrollTo({ x: Math.max(0, index * (CELL_WIDTH + CELL_GAP) - 24), animated: true });
  }, [active.line, active.slot, meterId]);

  const optionsOf = (lineIndex, slot) => slotOptions(meter.lines[lineIndex], slot, state[lineIndex]);

  const readyOf = (lineIndex, slot) => {
    const value = state[lineIndex].slots[slot.key];
    return isAllowed(optionsOf(lineIndex, slot), value.type, value.count);
  };

  // An optional slot is settled whether or not it gets used; only a filled one must be legal.
  const settledOf = (lineIndex, slot) => {
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
  const patchPart = (lineIndex, partIndex, next) =>
    setState((prev) =>
      prev.map((line, i) => {
        if (i !== lineIndex) return line;
        const cleared = Object.fromEntries(
          slotsByLine[i]
            .filter((slot) => slot.part === partIndex)
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
  };

  const reset = () => {
    setState(buildState(meter));
    setActive({ line: 0, slot: "s0" });
    setMeasuring(null);
  };

  // Progress counts only the slots a poem must have; ሐረግ is never part of the target.
  const required = sequence.filter(({ line, slot }) => !slotsByLine[line].find((s) => s.key === slot).optional);
  const settledCount = required.filter(({ line, slot }) =>
    settledOf(line, slotsByLine[line].find((s) => s.key === slot))
  ).length;
  const complete = settledCount === required.length;
  const optionalCount = sequence.length - required.length;
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
          options: optionsOf(measuring.line, slot),
          leadLabel: slots.find((s) => s.key === slot.leadKey)?.label,
        };
      })()
    : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.meterTabs}>
        {METERS.map((option) => {
          const on = option.id === meterId;
          return (
            <Pressable
              key={option.id}
              onPress={() => (on ? null : switchMeter(option))}
              style={[styles.meterTab, on && styles.meterTabActive]}
            >
              <Text style={[styles.meterTabText, on && styles.meterTabTextActive]}>{option.title}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.meterHeader}>
        <Text style={styles.meterSubtitle}>
          Type each segment in its cell, then tap ልኬት to measure it.
          {optionalCount ? ` ${optionalCount} optional.` : ""}
        </Text>
        <Text style={styles.progress}>
          {settledCount}/{required.length}
        </Text>
      </View>

      {slotsByLine.map((slots, lineIndex) => (
        <View key={lineIndex} style={styles.lineBlock}>
          <View style={styles.lineHeader}>
            <Text style={styles.lineLabel}>ቤት {ORDINALS[lineIndex]}</Text>
            <View style={styles.lineRule} />
          </View>

          <ScrollView
            ref={(node) => {
              scrollers.current[lineIndex] = node;
            }}
            horizontal
            showsHorizontalScrollIndicator
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.lineRow}
          >
            {slots.map((slot) => {
              const value = state[lineIndex].slots[slot.key];
              const filled = Boolean(value.type) && value.count != null && !value.skipped;

              return (
                <SlotCell
                  key={slot.key}
                  slot={slot}
                  value={value}
                  active={active.line === lineIndex && active.slot === slot.key}
                  broken={filled && !readyOf(lineIndex, slot)}
                  onFocus={() => setActive({ line: lineIndex, slot: slot.key })}
                  onMeasure={() => openMeasure(lineIndex, slot.key)}
                  onChangeText={(text) => patchSlot(lineIndex, slot.key, { text })}
                />
              );
            })}
          </ScrollView>
        </View>
      ))}

      {complete ? (
        <Animated.View entering={FadeIn.duration(320)} style={styles.finale}>
          <OrnamentDivider />
          <Text style={styles.finaleTitle}>ተስማምቷል</Text>
          <Text style={styles.finaleSubtitle}>All lines fit {meter.title}.</Text>

          {slotsByLine.map((slots, index) => {
            const used = slots.filter((slot) => state[index].slots[slot.key].type);
            return (
              <View key={index} style={styles.finaleLine}>
                <Text style={styles.finaleWords}>
                  {used
                    .map((slot) => state[index].slots[slot.key].text.trim())
                    .filter(Boolean)
                    .join("  ") || `ቤት ${ORDINALS[index]}`}
                </Text>
                <Text style={styles.finalePattern}>
                  {used
                    .map((slot) => {
                      const value = state[index].slots[slot.key];
                      return `${TYPE_LABEL[value.type]} ${value.count}`;
                    })
                    .join("  ·  ")}
                </Text>
              </View>
            );
          })}
          <OrnamentDivider style={{ marginTop: spacing.md }} />
        </Animated.View>
      ) : null}

      {touched ? (
        <Pressable onPress={reset} style={styles.resetButton}>
          <Text style={styles.resetText}>እንደገና ጀምር</Text>
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
                      {showsTableNames && sheet.part.kind !== "hareg"
                        ? ` · ${partTable(sheet.part, sheet.config).name}`
                        : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => setMeasuring(null)} hitSlop={10} style={styles.sheetClose}>
                    <Text style={styles.sheetCloseText}>✕</Text>
                  </Pressable>
                </View>

                {sheet.value.text ? <Text style={styles.sheetWords}>{sheet.value.text}</Text> : null}

                <OrnamentDivider style={{ marginBottom: spacing.xs }} />

                {sheet.part.kind === "medeb" && sheet.part.sourceChoice ? (
                  <Toggle
                    hint="ይለኩ በ"
                    options={MEASURE_SOURCES}
                    activeKey={partSource(sheet.part, sheet.config)}
                    onSelect={(source) => patchPart(measuring.line, sheet.slot.part, { source })}
                  />
                ) : null}

                {sheet.part.kind === "mewqe" && sheet.part.tables.length > 1 ? (
                  <Toggle
                    hint="ይለኩ በ"
                    options={sheet.part.tables.map((table, i) => ({ key: i, label: table.name }))}
                    activeKey={sheet.config.table}
                    onSelect={(table) => patchPart(measuring.line, sheet.slot.part, { table })}
                  />
                ) : null}

                {sheet.options ? (
                  <OptionMatrix
                    options={sheet.options}
                    value={sheet.value}
                    optional={Boolean(sheet.slot.optional)}
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
  wrapper: { gap: spacing.lg },

  meterTabs: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  meterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  meterTabActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  meterTabText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.textSecondary },
  meterTabTextActive: { fontFamily: fontFamily.ethiopicBold, color: colors.primaryDark },

  meterHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  meterSubtitle: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  progress: { ...typography.label, color: colors.textMuted },

  lineBlock: { gap: spacing.sm },
  lineHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  lineLabel: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.textMuted, letterSpacing: 0.5 },
  lineRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  lineRow: { flexDirection: "row", gap: CELL_GAP, paddingVertical: 2, paddingRight: spacing.sm },

  cell: {
    width: CELL_WIDTH,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cellActive: { borderColor: colors.accent, borderWidth: 2, ...shadows.raised },
  cellLabel: {
    fontFamily: fontFamily.ethiopicBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  cellInput: {
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 52,
    textAlignVertical: "top",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
    paddingBottom: spacing.xs,
  },
  measure: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
  },
  measureEmpty: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderGold, backgroundColor: "transparent" },
  measureFilled: { backgroundColor: colors.primaryLight },
  measureBroken: { backgroundColor: colors.dangerLight },
  measureText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 12, color: colors.primaryDark },
  measureTextFilled: { fontFamily: fontFamily.ethiopicBold, color: colors.primaryDark },
  measureTextBroken: { fontFamily: fontFamily.ethiopicBold, color: colors.dangerDark },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(43, 32, 19, 0.45)",
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
  finaleLine: { alignItems: "center", gap: 2, marginTop: spacing.sm },
  finaleWords: { fontFamily: fontFamily.ethiopicRegular, fontSize: 18, color: colors.textPrimary, textAlign: "center" },
  finalePattern: { ...typography.caption, color: colors.textMuted },

  resetButton: { alignSelf: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  resetText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.textSecondary },
});
