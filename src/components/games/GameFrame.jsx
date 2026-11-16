import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { Button, ScreenContainer } from "../ui";
import { DIFFICULTIES } from "../../lib/verbGames";
import { LANGUAGES } from "../../lib/verbQuiz";
import { FOCUSES } from "../../lib/daily";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { Chip, shared } from "../verbQuiz/shared";
import { BoneCard } from "../ui/Skeleton";

// Always the hub: router.back() in the drawer goes to the first screen (Dictionary).
export const backToGames = () => router.navigate("/game");

// The page around every verb game: its title with the usual back link, and
// (outside play) the shared meaning-language and difficulty pickers.
export function GameFrame({ title, game, children, scroll = true }) {
  let body = children;
  if (game.error) body = <Text style={styles.error}>{game.error}</Text>;
  else if (!game.ready) body = <BoneCard tall lines={3} />;
  return (
    <ScreenContainer scroll={scroll} enter="slide">
      {body}
    </ScreenContainer>
  );
}

export function LanguagePicker({ lang, onChange }) {
  return (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>MEANINGS IN</Text>
      <View style={shared.row}>
        {LANGUAGES.map((l) => (
          <Chip key={l.code} label={l.label} active={lang === l.code} onPress={() => onChange(l.code)} />
        ))}
      </View>
    </View>
  );
}

// Which words the game asks: today's, today's plus due reviews, or any (practice).
export function FocusPicker({ game }) {
  const { focus, todayCounts: c } = game;
  const hint = FOCUSES.find((f) => f.key === focus)?.hint;
  const status =
    focus === "free"
      ? null
      : c.total
        ? `Today: ${c.learned + c.skipped} of ${c.total} learned${c.left ? `, ${c.left} to go` : " · all done"}`
        : "No words for today yet. Open ዛሬ to see why.";
  return (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>WORDS</Text>
      <View style={shared.row}>
        {FOCUSES.map((f) => (
          <Chip key={f.key} label={f.label} active={focus === f.key} onPress={() => game.setFocus(f.key)} />
        ))}
      </View>
      <Text style={shared.hint}>{hint}</Text>
      {status ? <Text style={styles.focusStatus}>{status}</Text> : null}
    </View>
  );
}

export function DifficultyPicker({ value, onChange, options = DIFFICULTIES, label = "DIFFICULTY" }) {
  return (
    <View style={styles.pickerRow}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={shared.row}>
        {options.map((d) => (
          <Chip key={d.key} label={d.label} active={value === d.key} onPress={() => onChange(d.key)} />
        ))}
      </View>
    </View>
  );
}

// The start card every game shows before play: what to do, the pickers, the
// player's best, and a big start button.
export function StartCard({ emoji, lead, rules = [], best, children, onStart, startLabel = "Start", disabled, note }) {
  return (
    <View style={[shared.card, styles.start]}>
      <View style={styles.startHead}>
        <View style={styles.art}>
          <Text style={styles.artText}>{emoji}</Text>
        </View>
        <Text style={styles.lead}>{lead}</Text>
      </View>
      {rules.length ? (
        <View style={styles.rules}>
          {rules.map((r) => (
            <Text key={r} style={shared.hint}>
              • {r}
            </Text>
          ))}
        </View>
      ) : null}
      {children}
      {best != null ? <Text style={styles.best}>Your best: {best}</Text> : null}
      <Button onPress={onStart} disabled={disabled} style={styles.startButton}>
        {startLabel}
      </Button>
      {note ? <Text style={shared.muted}>{note}</Text> : null}
    </View>
  );
}

// A thin bar showing how far through a round the player is.
// A thin bar that grows to its value (and on to each new one).
export function ProgressBar({ value, color = colors.primary }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const target = Math.max(0, Math.min(1, value || 0));
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(trackWidth * target, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [trackWidth, target]); // eslint-disable-line react-hooks/exhaustive-deps
  const fill = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <View style={styles.track} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { ...typography.body, color: colors.dangerDark, marginTop: spacing.lg },
  pickerRow: { gap: spacing.xs },
  pickerLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },
  focusStatus: { ...typography.caption, color: colors.primaryDark },
  start: { gap: spacing.md },
  startHead: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  art: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: "#17110a",
    alignItems: "center",
    justifyContent: "center",
  },
  artText: { fontSize: 32 },
  lead: { ...typography.body, color: colors.textPrimary, flex: 1 },
  rules: { gap: 4 },
  best: { ...typography.label, color: colors.primary },
  startButton: { alignSelf: "stretch" },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.borderMuted, overflow: "hidden" },
  fill: { height: 6, borderRadius: radii.pill },
});

export const ethiopicBig = { fontFamily: fontFamily.ethiopicBold, color: colors.textPrimary };
