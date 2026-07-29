import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../../lib/supabaseClient";

export default function UpdateWord() {
  const { id } = useLocalSearchParams();

  const [mainWord, setMainWord] = useState("");
  const [mainLanguage, setMainLanguage] = useState("");
  const [translations, setTranslations] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      const { data, error } = await supabase.from("languages").select("*");
      if (error) console.error("Error fetching languages:", error);
      else setLanguages(data || []);
    };

    fetchLanguages();
  }, []);

  useEffect(() => {
    const fetchWordData = async () => {
      try {
        const { data, error } = await supabase.rpc("get_word_with_translations", {
          word_id: id,
        });

        if (error) throw error;

        if (data && data.length > 0) {
          const mainWordData = data[0];
          setMainWord(mainWordData.main_word);
          setMainLanguage(mainWordData.main_language_code);

          const translationData = data
            .filter((item) => item.related_word_id)
            .map((item) => ({
              word_id: item.related_word_id,
              translated_word: item.related_word,
              target_language: item.related_language_code,
            }));

          setTranslations(translationData);
        }
      } catch (err) {
        console.error("Error fetching word or translations:", err);
        setError("Failed to load the word or translations.");
      }
    };

    fetchWordData();
  }, [id]);

  const handleSubmit = async () => {
    setError(null);

    try {
      const { error: wordError } = await supabase
        .from("words")
        .update({ word: mainWord })
        .eq("word_id", id);

      if (wordError) throw wordError;

      for (const { word_id, translated_word, target_language } of translations) {
        if (!translated_word) continue;

        const { data: existingWord, error: checkError } = await supabase
          .from("words")
          .select("word_id")
          .eq("word", translated_word)
          .eq("language_code", target_language)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          throw checkError;
        }

        if (existingWord) {
          const { error: mappingError } = await supabase
            .from("translationmappings")
            .update({ related_word_id: existingWord.word_id })
            .match({ word_id: id, related_word_id: word_id });

          if (mappingError) throw mappingError;
        } else {
          const { error: updateError } = await supabase
            .from("words")
            .update({ word: translated_word })
            .eq("word_id", word_id);

          if (updateError) throw updateError;
        }
      }

      router.replace("/admin/dictionary-edit");
    } catch (err) {
      console.error("Error updating word or translations:", err);
      setError("An error occurred while updating the word or translations.");
    }
  };

  const handleDeleteTranslation = async (translationId) => {
    setError(null);

    try {
      const { error: deleteMappingError } = await supabase
        .from("translationmappings")
        .delete()
        .match({ word_id: id, related_word_id: translationId });

      if (deleteMappingError) throw deleteMappingError;

      setTranslations((prev) => prev.filter((t) => t.word_id !== translationId));
    } catch (err) {
      console.error("Error deleting translation:", err);
      setError("Failed to delete the translation.");
    }
  };

  const handleTranslationChange = (index, value) => {
    setTranslations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], translated_word: value };
      return updated;
    });
  };

  const languageName = (code) =>
    languages.find((lang) => lang.language_code === code)?.language_name || code || "Main";

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Update Word and Translations</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.field}>
          <Text style={styles.label}>{languageName(mainLanguage)} Word:</Text>
          <TextInput value={mainWord} onChangeText={setMainWord} style={styles.input} />
        </View>

        {translations.map((translation, index) => (
          <View key={translation.word_id} style={styles.field}>
            <Text style={styles.label}>
              Translation for {languageName(translation.target_language)}:
            </Text>
            <View style={styles.row}>
              <TextInput
                value={translation.translated_word}
                onChangeText={(value) => handleTranslationChange(index, value)}
                style={[styles.input, styles.rowInput]}
              />
              <Pressable
                style={styles.deleteButton}
                onPress={() => handleDeleteTranslation(translation.word_id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Update</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: 24,
    gap: 16,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    fontFamily: "NotoSansEthiopic_700Bold",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 8,
  },
  field: { gap: 6 },
  label: {
    fontSize: 14,
    color: "#57534e",
  },
  input: {
    padding: 12,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  rowInput: {
    flex: 1,
  },
  deleteButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: "white",
    fontWeight: "600",
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
    textAlign: "center",
  },
});
