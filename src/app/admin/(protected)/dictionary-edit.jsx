import { useEffect, useRef } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useDictionarySearch } from "../../../hooks/useDictionarySearch";
import { supabase } from "../../../lib/supabaseClient";
import { ScreenContainer, Card, TextField, Button, EmptyState, ScreenHeader, Select } from "../../../components/ui";
import { colors, fontFamily, radii, spacing, typography } from "../../../theme";

const SEWASEW_SAVE_DEBOUNCE_MS = 600;

export default function DictionaryEdit() {
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
    setSewasewExamples,
    loading,
    error,
    setError,
    handleSearch,
  } = useDictionarySearch();

  // Per-item debounce timers so editing one Sewasew example doesn't cancel a
  // pending save on another, and DB writes don't fire on every keystroke.
  const saveTimers = useRef({});
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const handleEditSewasew = (id, newText) => {
    setSewasewExamples((prev) =>
      prev.map((example) =>
        example.sewasew_id === id ? { ...example, sewasew_text: newText } : example
      )
    );

    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      const { error } = await supabase
        .from("sewasew")
        .update({ sewasew_text: newText })
        .eq("sewasew_id", id);

      if (error) {
        console.error("Error updating Sewasew example:", error);
      }
    }, SEWASEW_SAVE_DEBOUNCE_MS);
  };

  const handleEditClick = () => {
    if (results.length > 0) {
      router.push(`/admin/update-word/${results[0].word_id}`);
    } else {
      setError("No results to edit.");
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
      <ScreenHeader title="Edit Dictionary" onBack={() => router.back()} />

      <Select
        value={selectedLanguage}
        onValueChange={setSelectedLanguage}
        items={languages.map((language) => ({
          label: language.language_name,
          value: language.language_code,
        }))}
      />

      <TextField
        value={query}
        onChangeText={onQueryChange}
        placeholder="Enter a word to search..."
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

      <Button variant="primary" onPress={() => handleSearch()}>
        Search
      </Button>

      {loading && <ActivityIndicator style={styles.spacingTop} color={colors.primary} />}
      {error && <Text style={[typography.body, { color: colors.danger }]}>{error}</Text>}

      {groupedResults.length > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Results:</Text>
          {groupedResults.map(([language, words]) => (
            <View key={language} style={styles.resultRow}>
              <Text style={styles.resultLanguage}>{language}</Text>
              <Text style={styles.resultWords}>
                {words.join(language === "ኢንግልሽ - English" ? ", " : "፣")}
              </Text>
            </View>
          ))}
          <Button variant="primary" onPress={handleEditClick}>
            Edit Result
          </Button>
        </Card>
      ) : (
        !loading && query.trim() !== "" && <EmptyState message="No results found." icon="search-outline" />
      )}

      {sewasewExamples.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Sewasew Examples:</Text>
          {sewasewExamples.map((example) => (
            <TextField
              key={example.sewasew_id}
              value={example.sewasew_text}
              onChangeText={(value) => handleEditSewasew(example.sewasew_id, value)}
            />
          ))}
        </Card>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  suggestions: {
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
  spacingTop: {
    marginTop: spacing.sm,
  },
  card: {
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.h2,
    fontSize: 18,
    color: colors.textPrimary,
  },
  resultRow: {
    flexDirection: "row",
    gap: spacing.sm,
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
});
