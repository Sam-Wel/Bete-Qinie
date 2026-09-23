import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

function LineStrip({ index, slots, state, readyOf, active, onSelect }) {
  return (
    <View style={styles.strip}>
      <Text style={styles.stripLabel}>ቤት {ORDINALS[index]}</Text>
      <View style={styles.stripSlots}>
        {slots.map((slot) => {
          const value = state.slots[slot.key];
          const isActive = active.line === index && active.slot === slot.key;
          const filled = Boolean(value.type) && value.count != null && !value.skipped;
          const broken = filled && !readyOf(index, slot);

          return (
            <Pressable
              key={slot.key}
              onPress={() => onSelect(index, slot.key)}
              style={[
                styles.stripChip,
                filled && !broken && styles.stripChipSettled,
                value.skipped && styles.stripChipSkipped,
                broken && styles.stripChipBroken,
                isActive && styles.stripChipActive,
              ]}
            >
              <Text style={styles.stripChipLabel} numberOfLines={1}>
                {slot.short}
              </Text>
              <Text style={[styles.stripChipValue, broken && styles.stripChipValueBroken]} numberOfLines={1}>
                {value.skipped ? "የለም" : filled ? `${TYPE_LABEL[value.type]} ${value.count}` : "—"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MeterChecker() {
  const [meterId, setMeterId] = useState(METERS[0].id);
  const meter = METERS.find((m) => m.id === meterId);

  const [state, setState] = useState(() => buildState(METERS[0]));
  const [active, setActive] = useState({ line: 0, slot: "s0" });

  const slotsByLine = meter.lines.map(buildLineSlots);
  const sequence = slotsByLine.flatMap((slots, line) => slots.map((slot) => ({ line, slot: slot.key })));
  const showsTableNames = meterTables(meter).length > 1;

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

  const activeSlot = slotsByLine[active.line].find((slot) => slot.key === active.slot) ?? slotsByLine[active.line][0];
  const activePart = meter.lines[active.line].parts[activeSlot.part];
  const activeConfig = state[active.line].parts[activeSlot.part];
  const activeValue = state[active.line].slots[activeSlot.key];
  const activeOptions = optionsOf(active.line, activeSlot);

  const patchSlot = (lineIndex, slotKey, next) =>
    setState((prev) =>
      prev.map((line, i) =>
        i === lineIndex ? { ...line, slots: { ...line.slots, [slotKey]: { ...line.slots[slotKey], ...next } } } : line
      )
    );

  // Re-measuring a pair invalidates whatever was picked inside it, so clear both slots.
  const patchPart = (next) =>
    setState((prev) =>
      prev.map((line, i) => {
        if (i !== active.line) return line;
        const cleared = Object.fromEntries(
          slotsByLine[i]
            .filter((slot) => slot.part === activeSlot.part)
            .map((slot) => [slot.key, { ...line.slots[slot.key], type: null, count: null }])
        );
        return {
          ...line,
          parts: line.parts.map((part, p) => (p === activeSlot.part ? { ...part, ...next } : part)),
          slots: { ...line.slots, ...cleared },
        };
      })
    );

  const advance = () => {
    const at = sequence.findIndex((s) => s.line === active.line && s.slot === active.slot);
    const next = sequence[at + 1];
    if (next) setActive(next);
  };

  const pick = (type, count) => {
    patchSlot(active.line, activeSlot.key, { type, count, skipped: false });
    advance();
  };

  const skip = () => {
    patchSlot(active.line, activeSlot.key, { type: null, count: null, skipped: !activeValue.skipped });
    if (!activeValue.skipped) advance();
  };

  const switchMeter = (next) => {
    setMeterId(next.id);
    setState(buildState(next));
    setActive({ line: 0, slot: "s0" });
  };

  const reset = () => {
    setState(buildState(meter));
    setActive({ line: 0, slot: "s0" });
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
          {meter.lines.length} lines · {sequence.length} segments
          {optionalCount ? ` · ${optionalCount} optional` : ""} · every pair picks its own row
        </Text>
        <Text style={styles.progress}>
          {settledCount}/{required.length}
        </Text>
      </View>

      {slotsByLine.map((slots, index) => (
        <LineStrip
          key={index}
          index={index}
          slots={slots}
          state={state[index]}
          readyOf={readyOf}
          active={active}
          onSelect={(l, s) => setActive({ line: l, slot: s })}
        />
      ))}

      <View style={styles.picker}>
        <View style={styles.pickerHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pickerTitle}>{activeSlot.label}</Text>
            <Text style={styles.pickerCaption}>{activeSlot.caption}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.pickerLine}>ቤት {ORDINALS[active.line]}</Text>
            {showsTableNames && activePart.kind !== "hareg" ? (
              <Text style={styles.pickerTable}>{partTable(activePart, activeConfig).name}</Text>
            ) : null}
          </View>
        </View>

        {activePart.kind === "medeb" && activePart.sourceChoice ? (
          <Toggle
            hint="ይለኩ በ"
            options={MEASURE_SOURCES}
            activeKey={partSource(activePart, activeConfig)}
            onSelect={(source) => patchPart({ source })}
          />
        ) : null}

        {activePart.kind === "mewqe" && activePart.tables.length > 1 ? (
          <Toggle
            hint="ይለኩ በ"
            options={activePart.tables.map((table, i) => ({ key: i, label: table.name }))}
            activeKey={activeConfig.table}
            onSelect={(table) => patchPart({ table })}
          />
        ) : null}

        {activeOptions ? (
          <Animated.View entering={FadeIn.duration(180)}>
            <TextInput
              value={activeValue.text}
              onChangeText={(text) => patchSlot(active.line, activeSlot.key, { text })}
              placeholder="ቃላቱን ይጻፉ"
              placeholderTextColor={colors.textMuted}
              style={styles.wordInput}
            />
            <OptionMatrix
              options={activeOptions}
              value={activeValue}
              optional={Boolean(activeSlot.optional)}
              onPick={pick}
              onSkip={skip}
            />
          </Animated.View>
        ) : (
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>
              Set {slotsByLine[active.line].find((s) => s.key === activeSlot.leadKey)?.label} first — it decides what
              can go here.
            </Text>
          </View>
        )}
      </View>

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

  strip: { gap: spacing.xs },
  stripLabel: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.textMuted, letterSpacing: 0.5 },
  stripSlots: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  stripChip: {
    flexGrow: 1,
    flexBasis: 74,
    paddingVertical: spacing.sm,
    paddingHorizontal: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    gap: 2,
  },
  stripChipSettled: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  stripChipSkipped: { borderColor: colors.borderMuted, backgroundColor: colors.surfaceMuted },
  stripChipBroken: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  stripChipActive: { borderColor: colors.accent, borderWidth: 2, ...shadows.card },
  stripChipLabel: { fontFamily: fontFamily.ethiopicRegular, fontSize: 10, color: colors.textMuted },
  stripChipValue: { fontFamily: fontFamily.ethiopicBold, fontSize: 12, color: colors.textPrimary },
  stripChipValueBroken: { color: colors.dangerDark },

  picker: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.raised,
  },
  pickerHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  pickerTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 18, color: colors.textPrimary },
  pickerCaption: { ...typography.caption, color: colors.textMuted },
  pickerLine: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.primary },
  pickerTable: { fontFamily: fontFamily.ethiopicRegular, fontSize: 11, color: colors.textMuted },

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

  wordInput: {
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 18,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
    marginBottom: spacing.sm,
  },

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

  waiting: { paddingVertical: spacing.lg, alignItems: "center" },
  waitingText: { ...typography.caption, color: colors.textMuted, fontStyle: "italic", textAlign: "center" },

  finale: { gap: spacing.sm, paddingVertical: spacing.md, alignItems: "center" },
  finaleTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 20, color: colors.primary },
  finaleSubtitle: { ...typography.caption, color: colors.textSecondary },
  finaleLine: { alignItems: "center", gap: 2, marginTop: spacing.sm },
  finaleWords: { fontFamily: fontFamily.ethiopicRegular, fontSize: 18, color: colors.textPrimary, textAlign: "center" },
  finalePattern: { ...typography.caption, color: colors.textMuted },

  resetButton: { alignSelf: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  resetText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.textSecondary },
});
