import { useEffect, useState } from "react";
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
import { supabase } from "../../lib/supabaseClient";

export default function Dictionary() {
  const [query, setQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("gz");
  const [languages, setLanguages] = useState([]);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sewasewExamples, setSewasewExamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      const { data, error } = await supabase.from("languages").select("*");
      if (error) {
        console.error("Error fetching languages:", error);
      } else {
        setLanguages(data);
      }
    };

    fetchLanguages();
  }, []);

  const languageMap = languages.reduce((map, lang) => {
    map[lang.language_code] = lang.language_name;
    return map;
  }, {});

  const fetchSuggestions = async (value) => {
    if (!value.trim() || !selectedLanguage) {
      setSuggestions([]);
      return;
    }

    const { data, error } = await supabase
      .from("words")
      .select("word")
      .eq("language_code", selectedLanguage)
      .ilike("word", `${value}%`)
      .limit(5);

    if (error) {
      console.error("Error fetching suggestions:", error);
    } else {
      setSuggestions(data.map((item) => item.word));
    }
  };

  const handleSearch = async () => {
    if (!query.trim() || !selectedLanguage) {
      setError("Please enter a search term and select a language.");
      return;
    }

    setLoading(true);
    setError(null);
    setSewasewExamples([]);
    setResults([]);
    setSuggestions([]);

    try {
      const { data: translationData, error: translationError } = await supabase.rpc(
        "get_translations",
        {
          search_word: query.trim(),
          language: selectedLanguage,
        }
      );

      if (translationError) {
        setError("Failed to fetch data. Please try again.");
        console.error(translationError);
      } else {
        setResults(translationData);

        if (selectedLanguage === "gz") {
          const { data: sewasewData, error: sewasewError } = await supabase
            .from("sewasew")
            .select("sewasew_text")
            .in(
              "word_id",
              translationData.map((item) => item.word_id)
            );

          if (sewasewError) {
            console.error("Error fetching Sewasew examples:", sewasewError);
          } else {
            setSewasewExamples(sewasewData);
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
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
            onChangeText={(value) => {
              setQuery(value);
              fetchSuggestions(value);
            }}
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
                  onPress={() => {
                    setQuery(item);
                    setSuggestions([]);
                  }}
                >
                  <Text>{item}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
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
          </View>
        ) : (
          !loading &&
          query.trim() !== "" && <Text style={styles.spacingTop}>No results found.</Text>
        )}

        {sewasewExamples.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sewasew:</Text>
            {sewasewExamples.map((example, index) => (
              <Text key={index} style={styles.sewasewItem}>
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
