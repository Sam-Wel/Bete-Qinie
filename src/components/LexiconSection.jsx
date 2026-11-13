import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLexicon, useLexiconForms } from "../hooks/useLexicon";
import { bookGloss, formsByName, headsOf, lookup } from "../lib/lexicon";
import { colors, fontFamily, radii, spacing, typography } from "../theme";
import { Icon } from "./ui/Icon";

// The book's ርባታ of one lexicon word: its printed forms grouped by name, loaded on open.
function Forms({ lexId }) {
  const { forms, error, loading } = useLexiconForms(lexId);
  if (loading) return <ActivityIndicator color={colors.primary} style={{ alignSelf: "flex-start" }} />;
  if (error) return <Text style={styles.note}>{error}</Text>;
  const groups = formsByName(forms);
  if (!groups.length) return <Text style={styles.note}>No forms printed for this word.</Text>;
  return (
    <View style={styles.groups}>
      {groups.map((g) => (
        <View key={g.slot} style={styles.group}>
          <Text style={styles.groupName}>{g.label}</Text>
          <Text style={styles.groupForms}>{g.forms.join("፣ ")}</Text>
        </View>
      ))}
    </View>
  );
}

function LexiconWord({ word, showGloss }) {
  const [open, setOpen] = useState(false);
  const heads = headsOf(word);
  return (
    <View style={styles.word}>
      <View style={styles.headRow}>
        <Text style={styles.label}>ርእስ</Text>
        {heads.map((h) => (
          <View key={h.head} style={styles.chip}>
            <Text style={styles.chipHead}>{h.head}</Text>
            {h.mark ? <Text style={styles.chipMark}>{h.mark}</Text> : null}
          </View>
        ))}
        {showGloss && bookGloss(word) ? <Text style={styles.gloss}>{bookGloss(word)}</Text> : null}
        <Pressable
          onPress={() => setOpen(!open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={({ hovered }) => [styles.toggle, hovered && styles.toggleHover]}
        >
          <Text style={styles.toggleText}>ርባታ</Text>
          <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.primaryDark} />
        </Pressable>
      </View>
      {word.openQuestions.length ? <Text style={styles.note}>Some of this entry is still being checked.</Text> : null}
      {open ? <Forms lexId={word.id} /> : null}
    </View>
  );
}

// What the book (መጽሐፈ ግስ ወሰዋስው) says about a verb: the head it follows and its
// printed forms. Shown on Dictionary and ግሲ word cards when the live lexicon release
// has the word; nothing is shown otherwise. The source and data version are on the About page.
export function LexiconSection({ word }) {
  const { lexicon } = useLexicon();
  const matches = lookup(lexicon, word);
  if (!matches.length) return null;
  return (
    <View style={styles.section}>
      {matches.map((m) => (
        <LexiconWord key={m.id} word={m} showGloss={matches.length > 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  word: { gap: spacing.sm },
  headRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  label: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, letterSpacing: 1, color: colors.primaryDark },
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
  },
  chipHead: { fontFamily: fontFamily.ethiopicBold, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  chipMark: { fontFamily: fontFamily.ethiopicRegular, fontSize: 12, color: colors.accentDark },
  gloss: { fontFamily: fontFamily.ethiopicRegular, fontSize: 14, color: colors.textSecondary },
  toggle: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleHover: { backgroundColor: colors.surfaceMuted },
  toggleText: { fontFamily: fontFamily.ethiopicBold, fontSize: 14, color: colors.primaryDark },
  groups: { gap: 6 },
  group: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "baseline" },
  groupName: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.textSecondary, minWidth: 110 },
  groupForms: { fontFamily: fontFamily.ethiopicRegular, fontSize: 17, lineHeight: 26, color: colors.textPrimary, flexShrink: 1 },
  note: { ...typography.caption, color: colors.textSecondary },
});
