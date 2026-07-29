import { useState } from "react";
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
import { supabase } from "../../../lib/supabaseClient";

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add New Word</Text>

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}

        {FIELDS.map((field) => (
          <View key={field} style={styles.field}>
            <Text style={styles.label}>
              {field.charAt(0).toUpperCase() + field.slice(1)}:
            </Text>
            <TextInput
              value={wordData[field]}
              onChangeText={(value) => setField(field, value)}
              placeholder={`Enter ${field}`}
              style={styles.input}
            />
          </View>
        ))}

        <Pressable style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Add Word</Text>
        </Pressable>
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
    color: "#854d0e",
    textAlign: "center",
    marginBottom: 8,
  },
  field: { gap: 6 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#57534e",
  },
  input: {
    padding: 12,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  button: {
    marginTop: 8,
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
  success: {
    color: "#16a34a",
    textAlign: "center",
  },
});
