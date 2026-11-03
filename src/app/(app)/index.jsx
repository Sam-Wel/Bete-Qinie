import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useDictionarySearch } from "../../hooks/useDictionarySearch";
import { useRecentSearches } from "../../hooks/useRecentSearches";
import { useWordProgress } from "../../context/WordProgressContext";
import { useDueCount } from "../../hooks/useDueCount";
import { Button, EmptyState, Icon, ScreenContainer, Select } from "../../components/ui";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

const ETHIOPIC = /[ሀ-፿]/;
const ORDER = ["gz", "ti", "am", "en"];
const rank = (code) => (ORDER.includes(code) ? ORDER.indexOf(code) : ORDER.length);

// "ትግርኛ - Tigrinya" → "ትግርኛ"; English keeps its Latin name.
function shortName(name = "") {
  const [first, second] = name.split(" - ");
  return ETHIOPIC.test(first) && !(second && /english/i.test(second)) ? first : second || first;
}

function LanguageChips({ languages, value, onChange }) {
  if (languages.length > 6) {
    return (
      <Select
        value={value}
        onValueChange={onChange}
        items={languages.map((l) => ({ label: l.language_name, value: l.language_code }))}
      />
    );
  }
  return (
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Search in">
      {[...languages].sort((a, b) => rank(a.language_code) - rank(b.language_code)).map((l) => {
        const on = l.language_code === value;
        const label = shortName(l.language_name);
        return (
          <Pressable
            key={l.language_code}
            onPress={() => onChange(l.language_code)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={({ hovered }) => [styles.chip, hovered && !on && styles.chipHover, on && styles.chipOn]}
          >
            <Text style={[ETHIOPIC.test(label) ? styles.chipEthiopic : styles.chipLatin, on && styles.chipTextOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// መዝገበ ቃላት: search a word in any language and see it in the others.
export default function Dictionary() {
  const {
    query,
    onQueryChange,
    selectedLanguage,
    setSelectedLanguage,
    languages,
    languageMap,
    results,
    suggestions,
    sewasewExamples,
    loading,
    error,
    handleSearch,
  } = useDictionarySearch();
  const { recentSearches, addRecentSearch } = useRecentSearches();
  const progress = useWordProgress();
  const due = useDueCount();
  const [searched, setSearched] = useState(null);
  const current = languages.find((l) => l.language_code === selectedLanguage);

  const runSearch = async (searchQuery, searchLanguage) => {
    const result = await handleSearch(searchQuery, searchLanguage);
    if (result) {
      setSearched(result.query);
      addRecentSearch(result.query, result.language, languageMap[result.language] || result.language);
    }
  };


  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={styles.page}>
      <View style={styles.searchCard}>
        <LanguageChips languages={languages} value={selectedLanguage} onChange={setSelectedLanguage} />

        <View style={styles.searchRow}>
          <View style={styles.inputBox}>
            <Icon name="search-outline" size={20} color={colors.primaryDark} />
            <TextInput
              value={query}
              onChangeText={onQueryChange}
              onSubmitEditing={() => runSearch()}
              returnKeyType="search"
              placeholder={current ? `Search in ${shortName(current.language_name)}…` : "Search a word…"}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Search a word"
              style={styles.input}
            />
          </View>
          <Button onPress={() => runSearch()} style={styles.searchButton}>
            Search
          </Button>
        </View>

        {suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((item, index) => (
              <Pressable
                key={`${item}-${index}`}
                onPress={() => runSearch(item)}
                style={({ hovered }) => [styles.suggestion, index > 0 && styles.suggestionLine, hovered && styles.chipHover]}
              >
                <Icon name="search-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.suggestionText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {recentSearches.length > 0 ? (
          <View style={styles.recent}>
            <Text style={styles.recentLabel}>Recent</Text>
            {recentSearches.map((item, index) => (
              <Pressable
                key={`${item.language}-${item.query}-${index}`}
                onPress={() => runSearch(item.query, item.language)}
                accessibilityLabel={`${item.query}, ${item.languageLabel}`}
                style={({ hovered }) => [styles.recentChip, hovered && styles.chipHover]}
              >
                <Text style={styles.recentText}>{item.query}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results.length > 0 && selectedLanguage !== "gz" && results[0].geez ? (
        <Text style={styles.foundLine}>
          {searched} · {results.length === 1 ? "1 ግዕዝ word" : `${results.length} ግዕዝ words`}
        </Text>
      ) : null}

      {results.map((entry, i) => {
        const saved = Boolean(entry.geezId && progress.stats[entry.geezId]?.saved);
        const examples = sewasewExamples.filter((x) => x.word_id === entry.geezId);
        const tiles = ORDER.filter((code) => entry.meanings[code]?.length);
        return (
          <View key={entry.geezId ?? i} style={styles.card}>
            <View style={styles.wordRow}>
              <Text style={styles.word}>{entry.geez ?? searched}</Text>
              <Text style={styles.wordLang}>{entry.geez ? "ግዕዝ" : current ? shortName(current.language_name) : ""}</Text>
              {entry.geezId ? (
                <Pressable
                  onPress={() => (saved ? progress.unsave(entry.geezId) : progress.save([entry.geezId]))}
                  accessibilityRole="button"
                  accessibilityState={{ checked: saved }}
                  style={({ hovered }) => [styles.save, saved && styles.saveOn, hovered && !saved && styles.chipHover]}
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
                    <Text style={styles.meaningLang}>{shortName(languageMap[code] || code)}</Text>
                    <Text style={styles.meaningWords}>{entry.meanings[code].join(code === "en" ? ", " : "፣ ")}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {examples.length ? (
              <View style={styles.examples}>
                <Text style={styles.cardLabel}>ሰዋሰው</Text>
                {examples.map((example) => (
                  <Text key={example.sewasew_id} style={styles.example}>
                    {example.sewasew_text}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}

      {!loading && !results.length && searched && query.trim() === searched ? (
        <EmptyState message="No results found." icon="search-outline" />
      ) : null}

      {due ? (
        <Pressable
          onPress={() => router.navigate("/review")}
          accessibilityRole="link"
          style={({ hovered }) => [styles.review, hovered && shadows.raised]}
        >
          <View style={styles.reviewCount}>
            <Text style={styles.reviewCountText}>{due}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewTitle}>ክለሳ today</Text>
            <Text style={styles.reviewLine}>
              {due} word{due === 1 ? "" : "s"} due for review
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.primaryLight} />
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}

const card = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radii.lg + 4,
  padding: spacing.lg + 4,
  ...shadows.card,
};

const styles = StyleSheet.create({
  page: { gap: spacing.lg },
  searchCard: { ...card, gap: spacing.md + 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipHover: { backgroundColor: colors.surfaceMuted },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipEthiopic: { fontFamily: fontFamily.ethiopicBold, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  chipLatin: { fontFamily: fontFamily.latinSemiBold, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  chipTextOn: { color: colors.textPrimary },
  searchRow: { flexDirection: "row", gap: spacing.sm + 2, flexWrap: "wrap" },
  inputBox: {
    flexGrow: 4,
    flexBasis: 220,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    height: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: "100%",
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 18,
    color: colors.textPrimary,
    outlineStyle: "none",
  },
  searchButton: { flexGrow: 1, flexBasis: 120, height: 54, borderRadius: radii.lg },
  suggestions: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: "hidden", marginTop: -4 },
  suggestion: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
  suggestionLine: { borderTopWidth: 1, borderTopColor: colors.borderMuted },
  suggestionText: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, color: colors.textPrimary },
  recent: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  recentLabel: { ...typography.caption, color: colors.textSecondary, marginRight: 2 },
  recentChip: { paddingVertical: 4, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  recentText: { fontFamily: fontFamily.ethiopicBold, fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  error: { ...typography.body, color: colors.danger },
  card: { ...card, gap: spacing.md },
  wordRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  word: { fontFamily: fontFamily.ethiopicBold, fontSize: 32, lineHeight: 42, color: colors.textPrimary },
  wordLang: {
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
  meaningWords: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 24, color: colors.textPrimary },
  cardLabel: { fontFamily: fontFamily.ethiopicBold, fontSize: 13, letterSpacing: 1, color: colors.primaryDark },
  foundLine: { ...typography.caption, color: colors.textSecondary, marginBottom: -spacing.sm },
  examples: { gap: 4, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  example: { fontFamily: fontFamily.ethiopicRegular, fontSize: 16, lineHeight: 26, color: colors.textPrimary },
  review: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md + 2,
    padding: spacing.lg,
    borderRadius: radii.lg + 4,
    backgroundColor: "#2B2013",
  },
  reviewCount: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewCountText: { fontFamily: fontFamily.latinBold, fontSize: 20, color: colors.onPrimary },
  reviewTitle: { fontFamily: fontFamily.ethiopicBold, fontSize: 17, lineHeight: 24, color: "#FBF6EA" },
  reviewLine: { ...typography.caption, color: "#EBE0C4" },
});
