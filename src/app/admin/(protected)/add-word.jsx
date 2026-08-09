import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../lib/supabaseClient";
import { ScreenContainer, TextField, Button, ScreenHeader } from "../../../components/ui";
import { colors, spacing, typography } from "../../../theme";

const FIELDS = ["geez", "tigrinya", "amharic", "english", "sewasew"];

export default function AddWord() {
  const [wordData, setWordData] = useState({
    geez: "",
    tigrinya: "",
    amharic: "",
    english: "",
    sewasew: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const setField = (field, value) => setWordData((prev) => ({ ...prev, [field]: value }));

  const getOrInsertWord = async (word, language_code) => {
    const { data: existingWord, error: fetchError } = await supabase
      .from("words")
      .select("word_id")
      .eq("word", word)
      .eq("language_code", language_code)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (existingWord) return existingWord.word_id;

    const { data: newWord, error: insertError } = await supabase
      .from("words")
      .insert([{ word, language_code }])
      .select()
      .single();

    if (insertError) throw insertError;
    return newWord.word_id;
  };

  const getExistingMappingsForGeez = async (geezId) => {
    const { data: existingMappings, error } = await supabase
      .from("translationmappings")
      .select("related_word_id")
      .eq("word_id", geezId);

    if (error) throw new Error(`Error fetching existing mappings for Ge'ez word: ${error.message}`);
    return existingMappings.map((mapping) => mapping.related_word_id);
  };

  const insertMappings = async (wordId, relatedWordIds) => {
    const validMappings = relatedWordIds
      .filter((relatedWordId) => relatedWordId)
      .map((relatedWordId) => ({ word_id: wordId, related_word_id: relatedWordId }));

    if (validMappings.length > 0) {
      const { error: mappingError } = await supabase
        .from("translationmappings")
        .upsert(validMappings, { onConflict: ["word_id", "related_word_id"] });

      if (mappingError) throw new Error(`Error inserting/updating mappings: ${mappingError.message}`);
    }
  };

  const handleSewasew = async (geezId, sewasewText) => {
    if (!sewasewText) return;

    const { data: existingSewasew, error: fetchError } = await supabase
      .from("sewasew")
      .select("sewasew_id")
      .eq("word_id", geezId)
      .eq("sewasew_text", sewasewText)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existingSewasew) {
      const { error: insertError } = await supabase
        .from("sewasew")
        .insert([{ word_id: geezId, sewasew_text: sewasewText }]);

      if (insertError) throw insertError;
    }
  };

  const createBidirectionalMappings = async (geezId, relatedIds, existingMappings) => {
    const { ti, am, en } = relatedIds;
    const allTranslations = [...existingMappings, ti, am, en].filter(Boolean);

    for (const relatedId of [ti, am, en].filter(Boolean)) {
      await insertMappings(geezId, [relatedId]);
      await insertMappings(relatedId, [geezId]);
    }

    for (const wordA of allTranslations) {
      for (const wordB of allTranslations) {
        if (wordA !== wordB) {
          await insertMappings(wordA, [wordB]);
        }
      }
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    const { geez, tigrinya, amharic, english, sewasew } = wordData;

    if (!geez) {
      setError("The Ge'ez word is required.");
      return;
    }

    try {
      const wordEntries = {};

      const addWordIfProvided = async (word, languageCode) => {
        if (word) {
          const wordId = await getOrInsertWord(word, languageCode);
          wordEntries[languageCode] = wordId;
        }
      };

      await addWordIfProvided(geez, "gz");
      await addWordIfProvided(tigrinya, "ti");
      await addWordIfProvided(amharic, "am");
      await addWordIfProvided(english, "en");

      const geezId = wordEntries["gz"];
      if (geezId) {
        const existingMappings = await getExistingMappingsForGeez(geezId);
        await handleSewasew(geezId, sewasew);
        await createBidirectionalMappings(geezId, wordEntries, existingMappings);
      }

      setSuccess("Word(s), Sewasew, and mappings added successfully!");
      setWordData({ geez: "", tigrinya: "", amharic: "", english: "", sewasew: "" });
    } catch (err) {
      console.error("Error adding word:", err);
      setError(`Failed to add the word(s): ${err.message}`);
    }
  };

  return (
    <ScreenContainer scroll keyboardAvoiding contentContainerStyle={styles.container}>
      <ScreenHeader title="Add New Word" onBack={() => router.back()} />

      {error && <Text style={[typography.body, styles.error]}>{error}</Text>}
      {success && <Text style={[typography.body, styles.success]}>{success}</Text>}

      {FIELDS.map((field) => (
        <TextField
          key={field}
          label={field.charAt(0).toUpperCase() + field.slice(1)}
          value={wordData[field]}
          onChangeText={(value) => setField(field, value)}
          placeholder={`Enter ${field}`}
        />
      ))}

      <Button variant="primary" onPress={handleSubmit} style={styles.submitButton}>
        Add Word
      </Button>
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
  submitButton: {
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    textAlign: "center",
  },
  success: {
    color: colors.success,
    textAlign: "center",
  },
});
