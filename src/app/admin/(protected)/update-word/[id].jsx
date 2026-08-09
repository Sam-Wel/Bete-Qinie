import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../../../lib/supabaseClient";
import { ScreenContainer, TextField, Button, ScreenHeader } from "../../../../components/ui";
import { colors, spacing, typography } from "../../../../theme";

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
    <ScreenContainer
      scroll
      keyboardAvoiding
      contentContainerStyle={{ gap: spacing.md, maxWidth: 520, width: "100%", alignSelf: "center" }}
    >
      <ScreenHeader title="Update Word and Translations" onBack={() => router.back()} />

      {error && (
        <Text style={[typography.body, { color: colors.danger, textAlign: "center" }]}>
          {error}
        </Text>
      )}

      <TextField
        label={`${languageName(mainLanguage)} Word`}
        value={mainWord}
        onChangeText={setMainWord}
      />

      {translations.map((translation, index) => (
        <View key={translation.word_id} style={{ gap: spacing.xs }}>
          <TextField
            label={`Translation for ${languageName(translation.target_language)}`}
            value={translation.translated_word}
            onChangeText={(value) => handleTranslationChange(index, value)}
          />
          <Button
            variant="danger"
            size="sm"
            onPress={() => handleDeleteTranslation(translation.word_id)}
          >
            Delete
          </Button>
        </View>
      ))}

      <Button variant="primary" onPress={handleSubmit} style={{ marginTop: spacing.sm }}>
        Update
      </Button>
    </ScreenContainer>
  );
}
