import { Pressable, StyleSheet, Text, View } from "react-native";
import { useWordProgress } from "../context/WordProgressContext";
import { Icon } from "./ui/Icon";
import { colors, fontFamily, radii, spacing, typography } from "../theme";

const ETHIOPIC = /[ሀ-፿]/;
export const LANGUAGE_ORDER = ["gz", "ti", "am", "en"];

// "ትግርኛ - Tigrinya" → "ትግርኛ"; English keeps its Latin name.
export function shortName(name = "") {
  const [first, second] = name.split(" - ");
  return ETHIOPIC.test(first) && !(second && /english/i.test(second)) ? first : second || first;
}

// One spelling of each language's name everywhere in the app, whatever the database's
// languages table says (it spells Amharic አምሓርኛ, the games አማርኛ).
export const LANGUAGE_NAMES = { gz: "ግዕዝ", ti: "ትግርኛ", am: "አማርኛ", en: "English" };
export const languageName = (code, name) => LANGUAGE_NAMES[code] ?? shortName(name || code);

// One Ge'ez word with its meanings in each language and its ሰዋሰው examples,
// as shown by the Dictionary and ግሲ. `meanings` maps a language code to a list.
export function WordCard({ word, tag = "ግዕዝ", geezId, meanings, examples = [], languageMap = {} }) {
  const progress = useWordProgress();
  const saved = Boolean(geezId && progress.stats[geezId]?.saved);
  const tiles = LANGUAGE_ORDER.filter((code) => meanings[code]?.length);

  return (
    <View style={styles.card}>
      <View style={styles.wordRow}>
        <Text style={styles.word}>{word}</Text>
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        {geezId ? (
          <Pressable
            onPress={() => (saved ? progress.unsave(geezId) : progress.save([geezId]))}
            accessibilityRole="button"
            accessibilityState={{ checked: saved }}
            style={({ hovered }) => [styles.save, saved && styles.saveOn, hovered && !saved && styles.saveHover]}
          >
            <Icon name="bookmark-outline" size={16} color={saved ? colors.success : colors.primaryDark} />
            <Text style={[styles.saveText, saved && { color: colors.success }]}>{saved ? "In ክለሳ" : "Save to ክለሳ"}</Text>
          </Pressable>
        ) : null}
      </View>

      {tiles.length ? (
        <View style={styles.meanings}>
          {tiles.map((code) => (
            <View key={code} style={styles.meaning}>
              <Text style={styles.meaningLang}>{languageName(code, languageMap[code])}</Text>
              <Text style={code === "en" ? styles.meaningLatin : styles.meaningWords}>
                {meanings[code].join(code === "en" ? ", " : "፣ ").replace(/፣\s*/g, "፣ ")}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.none}>No translations yet.</Text>
      )}

      {examples.length ? (
        <View style={styles.examples}>
          <Text style={styles.label}>ሰዋሰው</Text>
          {examples.map((example) => (
            <Text key={example.sewasew_id} style={styles.example}>
              {example.sewasew_text}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg + 4,
    padding: spacing.lg + 4,
  },
  wordRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  word: { fontFamily: fontFamily.ethiopicBold, fontSize: 32, lineHeight: 42, color: colors.textPrimary },
  tag: {
    ...typography.caption,
    fontFamily: fontFamily.ethiopicBold,
    color: colors.success,
    backgroundColor: colors.successLight,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: "hidden",
  },
  save: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveHover: { backgroundColor: colors.surfaceMuted },
  saveOn: { borderColor: colors.success, backgroundColor: colors.successLight },
  saveText: { fontFamily: fontFamily.ethiopicBold, fontSize: 14, color: colors.primaryDark },
  meanings: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  meaning: {
    flexGrow: 1,
    flexBasis: 180,
    gap: 4,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
  },
  meaningLang: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, color: colors.primaryDark },
  meaningWords: { fontFamily: fontFamily.ethiopicRegular, fontSize: 17, lineHeight: 26, color: colors.textPrimary },
  meaningLatin: { fontFamily: fontFamily.latinRegular, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  none: { ...typography.caption, color: colors.textSecondary },
  examples: { gap: 4, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  label: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, letterSpacing: 1, color: colors.primaryDark },
  example: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 26, color: colors.textPrimary },
});
