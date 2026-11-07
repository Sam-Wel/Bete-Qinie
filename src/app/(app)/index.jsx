import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useDictionarySearch } from "../../hooks/useDictionarySearch";
import { useRecentSearches } from "../../hooks/useRecentSearches";
import { useBadges } from "../../hooks/useDueCount";
import { Button, EmptyState, Icon, ScreenContainer, Select } from "../../components/ui";
import { LANGUAGE_ORDER, WordCard, shortName } from "../../components/WordCard";
import { colors, fontFamily, radii, shadows, spacing, typography } from "../../theme";

const ETHIOPIC = /[ሀ-፿]/;
const ORDER = LANGUAGE_ORDER;
const rank = (code) => (ORDER.includes(code) ? ORDER.indexOf(code) : ORDER.length);

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
  const badges = useBadges();
  const due = badges.due;
  const toLearn = badges.today - badges.due;
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

      {results.map((entry, i) => (
        <WordCard
          key={entry.geezId ?? i}
          word={entry.geez ?? searched}
          tag={entry.geez ? "ግዕዝ" : current ? shortName(current.language_name) : null}
          geezId={entry.geezId}
          meanings={entry.meanings}
          examples={sewasewExamples.filter((x) => x.word_id === entry.geezId)}
          languageMap={languageMap}
        />
      ))}

      {!loading && !results.length && searched && query.trim() === searched ? (
        <EmptyState message="No results found." icon="search-outline" />
      ) : null}

      {badges.today ? (
        <Pressable
          onPress={() => router.navigate("/today")}
          accessibilityRole="link"
          style={({ hovered }) => [styles.review, hovered && shadows.raised]}
        >
          <View style={styles.reviewCount}>
            <Text style={styles.reviewCountText}>{badges.today}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewTitle}>ዛሬ: today's study</Text>
            <Text style={styles.reviewLine}>
              {[due ? `${due} due for review` : null, toLearn ? `${toLearn} new word${toLearn === 1 ? "" : "s"} to learn` : null]
                .filter(Boolean)
                .join(" · ")}
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
  foundLine: { ...typography.caption, color: colors.textSecondary, marginBottom: -spacing.sm },
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
