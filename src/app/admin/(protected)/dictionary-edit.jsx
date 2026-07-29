import { useEffect, useRef } from "react";
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
import { router } from "expo-router";
import { useDictionarySearch } from "../../../hooks/useDictionarySearch";
import { supabase } from "../../../lib/supabaseClient";

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Edit Dictionary</Text>

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

        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Enter a word to search..."
          style={styles.input}
        />

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <Pressable style={styles.suggestionRow} onPress={() => selectSuggestion(item)}>
                  <Text>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <Pressable style={styles.button} onPress={() => handleSearch()}>
          <Text style={styles.buttonText}>Search</Text>
        </Pressable>

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
            <Pressable style={styles.button} onPress={handleEditClick}>
              <Text style={styles.buttonText}>Edit Result</Text>
            </Pressable>
          </View>
        ) : (
          !loading &&
          query.trim() !== "" && <Text style={styles.spacingTop}>No results found.</Text>
        )}

        {sewasewExamples.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sewasew Examples:</Text>
            {sewasewExamples.map((example) => (
              <TextInput
                key={example.sewasew_id}
                value={example.sewasew_text}
                onChangeText={(value) => handleEditSewasew(example.sewasew_id, value)}
                style={styles.input}
              />
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
    padding: 24,
    gap: 12,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 26,
    textAlign: "center",
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  input: {
    padding: 12,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  suggestions: {
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
  button: {
    backgroundColor: "#854d0e",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
  },
  spacingTop: {
    marginTop: 8,
  },
  card: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  resultRow: {
    flexDirection: "row",
    gap: 8,
  },
  resultLanguage: {
    fontWeight: "600",
    minWidth: 120,
  },
  resultWords: {
    flex: 1,
    fontFamily: "NotoSansEthiopic_400Regular",
  },
});
