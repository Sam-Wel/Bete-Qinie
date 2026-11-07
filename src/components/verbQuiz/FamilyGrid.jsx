import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FAMILIES, familyProgress, hasLanguage } from "../../lib/verbQuiz";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";
import { StackedBar, percent } from "./shared";

const MIN = 76;
const MAX = 100;
const GAP = spacing.sm;

// The 21 ending-letter groups as tiles. In "pick" mode a tile shows how many
// words can be asked in the chosen language; in "progress" mode it shows how
// many are known. Either way the bar underneath is that group's progress.
export function FamilyGrid({ bank, stats, mode, lang, selected = [], onPress }) {
  const [width, setWidth] = useState(0);
  const perRow = Math.max(1, Math.floor((width + GAP) / (MIN + GAP)));
  const tileWidth = width ? Math.min(MAX, (width - GAP * (perRow - 1)) / perRow) : MAX;

  return (
    <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {FAMILIES.map((family) => {
        const progress = familyProgress(bank, stats, family.id);
        const available = mode === "pick" ? bank.byFamily[family.id].filter((e) => hasLanguage(e, lang)).length : null;
        const empty = mode === "pick" && available === 0;
        const isSelected = selected.includes(family.id);
        const touched = progress.total - progress.counts.new;

        return (
          <Pressable
            key={family.id}
            onPress={() => onPress(family.id)}
            disabled={empty}
            style={({ hovered }) => [
              styles.tile,
              { width: tileWidth },
              isSelected && styles.tileSelected,
              hovered && !empty && !isSelected && styles.tileHover,
              empty && styles.tileEmpty,
            ]}
          >
            {isSelected ? <Text style={styles.check}>✓</Text> : null}
            {/* The group's main letter, with the letters that sound the same under it. */}
            <Text style={[styles.letter, isSelected && styles.letterSelected]}>{family.id}</Text>
            <Text style={styles.alike} numberOfLines={1}>
              {family.letters.filter((l) => l !== family.id).join(" ") || " "}
            </Text>
            <Text style={styles.count}>
              {mode === "pick"
                ? empty
                  ? "none"
                  : available
                : `${progress.counts.known + progress.counts.mastered}/${progress.total}`}
            </Text>
            <StackedBar counts={progress.counts} total={progress.total} height={4} style={styles.bar} />
            {mode === "progress" ? <Text style={styles.accuracy}>{touched ? percent(progress.accuracy) : " "}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
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
  check: {
    position: "absolute",
    top: 3,
    right: 6,
    fontSize: 11,
    fontFamily: fontFamily.latinBold,
    color: colors.primaryDark,
  },
  letter: { fontFamily: fontFamily.ethiopicBold, fontSize: 22, lineHeight: 28, color: colors.textPrimary },
  alike: { fontFamily: fontFamily.ethiopicRegular, fontSize: 12, lineHeight: 16, height: 16, color: colors.textMuted },
  letterSelected: { color: colors.primaryDark },
  count: { ...typography.caption, color: colors.textSecondary },
  bar: { alignSelf: "stretch", marginTop: 4 },
  accuracy: { ...typography.caption, fontSize: 11, lineHeight: 14, height: 14, color: colors.textMuted },
});
