import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useDictionarySearch } from "../../hooks/useDictionarySearch";
import { useRecentSearches } from "../../hooks/useRecentSearches";

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
    browseLetters,
    browseWords,
    browseLoading,
    loadBrowseLetters,
    loadBrowseWords,
  } = useDictionarySearch();
  const { recentSearches, addRecentSearch } = useRecentSearches();
  const [browseOpen, setBrowseOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(null);

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

  const toggleBrowse = () => {
    const next = !browseOpen;
    setBrowseOpen(next);
    setSelectedLetter(null);
    if (next) loadBrowseLetters();
  };

  const handleSelectLetter = (letter) => {
    setSelectedLetter(letter);
    loadBrowseWords(letter);
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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Dictionary</Text>

        <Text style={styles.label}>Select Language:</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={selectedLanguage} onValueChange={setSelectedLanguage}>
            {languages.map((language) => (
              <Picker.Item
                key={language.language_code}
                label={language.language_name}
                value={language.language_code}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Enter a word to search..."
            style={styles.input}
          />
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.suggestionRow}
                  onPress={() => selectSuggestion(item)}
                >
                  <Text>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <Pressable style={styles.searchButton} onPress={() => runSearch()}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>

        <Pressable style={styles.browseToggle} onPress={toggleBrowse}>
          <Text style={styles.browseToggleText}>
            {browseOpen ? "Hide Browse A-Z" : "Browse A-Z"}
          </Text>
        </Pressable>

        {browseOpen && (
          <View style={styles.browseCard}>
            {browseLetters.length === 0 && !browseLoading ? (
              <Text style={styles.muted}>No words found for this language yet.</Text>
            ) : (
              <View style={styles.chipRow}>
                {browseLetters.map((letter) => (
                  <Pressable
                    key={letter}
                    style={[
                      styles.chip,
                      selectedLetter === letter && styles.chipSelected,
                    ]}
                    onPress={() => handleSelectLetter(letter)}
                  >
                    <Text
                      style={
                        selectedLetter === letter ? styles.chipTextSelected : styles.chipText
                      }
                    >
                      {letter}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {browseLoading && <ActivityIndicator style={styles.spacingTop} />}

            {!browseLoading && selectedLetter && browseWords.length > 0 && (
              <View style={styles.chipRow}>
                {browseWords.map((word) => (
                  <Pressable
                    key={word}
                    style={styles.chipMuted}
                    onPress={() => runSearch(word, selectedLanguage)}
                  >
                    <Text style={styles.chipText}>{word}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {!browseLoading && selectedLetter && browseWords.length === 0 && (
              <Text style={styles.muted}>No words starting with "{selectedLetter}".</Text>
            )}
          </View>
        )}

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

        {loading && <ActivityIndicator style={styles.spacingTop} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {groupedResults.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Results:</Text>
            {groupedResults.map(([language, words]) => (
              <View key={language} style={styles.resultRow}>
                <Text style={styles.resultLanguage}>{language}</Text>
                <Text style={styles.resultWords}>
                  {words.join(language === "ኢንግልሽ - English" ? ", " : "፣")}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          !loading &&
          query.trim() !== "" && <Text style={styles.spacingTop}>No results found.</Text>
        )}

        {sewasewExamples.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sewasew:</Text>
            {sewasewExamples.map((example) => (
              <Text key={example.sewasew_id} style={styles.sewasewItem}>
                • {example.sewasew_text}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 28,
    color: "#854d0e",
    marginBottom: 8,
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 14,
    color: "#57534e",
  },
  pickerWrapper: {
    width: "100%",
    maxWidth: 480,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  searchBox: {
    width: "100%",
    maxWidth: 480,
  },
  input: {
    width: "100%",
    padding: 14,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  suggestions: {
    width: "100%",
    maxWidth: 480,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
    maxHeight: 180,
  },
  suggestionRow: {
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e7e5e4",
  },
  searchButton: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#854d0e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  searchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  browseToggle: {
    width: "100%",
    maxWidth: 480,
    paddingVertical: 8,
    alignItems: "center",
  },
  browseToggleText: {
    color: "#854d0e",
    fontSize: 14,
    fontWeight: "600",
  },
  browseCard: {
    width: "100%",
    maxWidth: 480,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
    gap: 8,
  },
  recentWrapper: {
    width: "100%",
    maxWidth: 480,
    gap: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
  },
  chipSelected: {
    backgroundColor: "#854d0e",
    borderColor: "#854d0e",
  },
  chipMuted: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f4",
  },
  chipText: {
    color: "#44403c",
    fontFamily: "NotoSansEthiopic_400Regular",
  },
  chipTextSelected: {
    color: "white",
    fontFamily: "NotoSansEthiopic_400Regular",
  },
  muted: {
    fontSize: 12,
    color: "#78716c",
  },
  error: {
    color: "#dc2626",
  },
  spacingTop: {
    marginTop: 8,
  },
  card: {
    width: "100%",
    maxWidth: 640,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  resultLanguage: {
    fontWeight: "600",
    minWidth: 120,
  },
  resultWords: {
    flex: 1,
    fontFamily: "NotoSansEthiopic_400Regular",
  },
  sewasewItem: {
    fontFamily: "NotoSansEthiopic_400Regular",
    marginBottom: 4,
  },
});
