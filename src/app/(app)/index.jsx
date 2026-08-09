import { useEffect } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useDictionarySearch } from "../../hooks/useDictionarySearch";
import { useRecentSearches } from "../../hooks/useRecentSearches";
import { useStudyList } from "../../hooks/useStudyList";
import { ScreenContainer, Card, TextField, Button, EmptyState, ScreenHeader, Select } from "../../components/ui";
import { colors, fontFamily, radii, spacing, typography } from "../../theme";

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
    selectSuggestion,
    sewasewExamples,
    loading,
    error,
    handleSearch,
  } = useDictionarySearch();
  const { recentSearches, addRecentSearch } = useRecentSearches();
  const { allItems, saveWord, removeWord, loadItems, isSignedIn } = useStudyList();

  useEffect(() => {
    if (isSignedIn) loadItems();
  }, [isSignedIn, loadItems]);

  const savedItem = allItems.find((item) => item.word === query && item.language_code === "gz");

  const runSearch = async (searchQuery, searchLanguage) => {
    const result = await handleSearch(searchQuery, searchLanguage);
    if (result) {
      addRecentSearch(
        result.query,
        result.language,
        languageMap[result.language] || result.language
      );
    }
  };

  const groupedResults = Object.entries(
    results.reduce((acc, result) => {
      const lang = languageMap[result.target_language] || result.target_language;
      if (!acc[lang]) acc[lang] = [];
      acc[lang].push(result.translated_word);
      return acc;
    }, {})
  );

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={styles.container}>
      <ScreenHeader title="Dictionary" style={{ width: "100%" }} />

      <Select
        label="Select Language:"
        value={selectedLanguage}
        onValueChange={setSelectedLanguage}
        items={languages.map((language) => ({
          label: language.language_name,
          value: language.language_code,
        }))}
        style={styles.fullWidth}
      />

      <TextField
        value={query}
        onChangeText={onQueryChange}
        placeholder="Enter a word to search..."
        style={styles.fullWidth}
      />

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <Pressable style={styles.suggestionRow} onPress={() => selectSuggestion(item)}>
                <Text style={typography.body}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <Button variant="primary" onPress={() => runSearch()} style={styles.fullWidth}>
        Search
      </Button>

      {recentSearches.length > 0 && (
        <View style={styles.recentWrapper}>
          <Text style={styles.muted}>Recent searches:</Text>
          <View style={styles.chipRow}>
            {recentSearches.map((item, index) => (
              <Pressable
                key={`${item.language}-${item.query}-${index}`}
                style={styles.chipMuted}
                onPress={() => runSearch(item.query, item.language)}
              >
                <Text style={styles.chipText}>
                  {item.query} <Text style={styles.muted}>({item.languageLabel})</Text>
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {loading && <ActivityIndicator style={styles.spacingTop} color={colors.primary} />}
      {error && <Text style={[typography.body, { color: colors.danger }]}>{error}</Text>}

      {groupedResults.length > 0 ? (
        <Card style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Text style={styles.cardTitle}>Results:</Text>
            {isSignedIn && selectedLanguage === "gz" && (
              <Button
                variant={savedItem ? "danger" : "secondary"}
                size="sm"
                pill
                onPress={() => (savedItem ? removeWord(savedItem.id) : saveWord(query, "gz"))}
              >
                {savedItem ? "Saved ✓" : "Save"}
              </Button>
            )}
          </View>
          {groupedResults.map(([language, words]) => (
            <View key={language} style={styles.resultRow}>
              <Text style={styles.resultLanguage}>{language}</Text>
              <Text style={styles.resultWords}>
                {words.join(language === "ኢንግልሽ - English" ? ", " : "፣")}
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        !loading && query.trim() !== "" && <EmptyState message="No results found." icon="search-outline" />
      )}

      {sewasewExamples.length > 0 && (
        <Card style={styles.resultsCard}>
          <Text style={styles.cardTitle}>Sewasew:</Text>
          {sewasewExamples.map((example) => (
            <Text key={example.sewasew_id} style={styles.sewasewItem}>
              • {example.sewasew_text}
            </Text>
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
  },
  fullWidth: {
    width: "100%",
    maxWidth: 480,
  },
  suggestions: {
    width: "100%",
    maxWidth: 480,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    maxHeight: 180,
  },
  suggestionRow: {
    padding: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMuted,
  },
  recentWrapper: {
    width: "100%",
    maxWidth: 480,
    gap: spacing.xs + 2,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chipMuted: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontFamily: fontFamily.ethiopicRegular,
  },
  muted: {
    ...typography.caption,
    color: colors.textMuted,
  },
  spacingTop: {
    marginTop: spacing.sm,
  },
  resultsCard: {
    width: "100%",
    maxWidth: 640,
    gap: spacing.xs + 2,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    ...typography.h2,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  resultRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resultLanguage: {
    ...typography.bodySemiBold,
    color: colors.textPrimary,
    minWidth: 120,
  },
  resultWords: {
    flex: 1,
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sewasewItem: {
    fontFamily: fontFamily.ethiopicRegular,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
});
