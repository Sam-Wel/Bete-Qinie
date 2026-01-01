import React, { useState } from "react";
import { supabase } from "../../util/supabaseClient";

const AddWord = () => {
  const [wordData, setWordData] = useState({
    geez: "",
    tigrinya: "",
    amharic: "",
    english: "",
    sewasew: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setWordData((prev) => ({ ...prev, [name]: value }));
  };

  const getOrInsertWord = async (word, language_code) => {
    try {
      const { data: existingWord, error: fetchError } = await supabase
        .from("words")
        .select("word_id")
        .eq("word", word)
        .eq("language_code", language_code)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingWord) {
        console.log(`Found existing word: ${word} (${language_code}) -> ID: ${existingWord.word_id}`);
        return existingWord.word_id;
      }

      const { data: newWord, error: insertError } = await supabase
        .from("words")
        .insert([{ word, language_code }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log(`Inserted new word: ${word} (${language_code}) -> ID: ${newWord.word_id}`);
      return newWord.word_id;
    } catch (err) {
      console.error(`Error handling word '${word}' (${language_code}): ${err.message}`);
      throw new Error(`Error handling word '${word}' (${language_code}): ${err.message}`);
    }
  };

  const getExistingMappingsForGeez = async (geezId) => {
    try {
      const { data: existingMappings, error } = await supabase
        .from("translationmappings")
        .select("related_word_id")
        .eq("word_id", geezId);
  
      if (error) {
        throw new Error(`Error fetching existing mappings for Ge'ez word: ${error.message}`);
      }
  
      return existingMappings.map((mapping) => mapping.related_word_id);
    } catch (err) {
      console.error(`Error fetching existing mappings: ${err.message}`);
      throw new Error(`Error fetching existing mappings: ${err.message}`);
    }
  };
  
  const insertMappings = async (wordId, relatedWordIds) => {
    try {
      const validMappings = relatedWordIds
        .filter((relatedWordId) => relatedWordId)
        .map((relatedWordId) => ({
          word_id: wordId,
          related_word_id: relatedWordId,
        }));

      if (validMappings.length > 0) {
        const { error: mappingError } = await supabase
          .from("translationmappings")
          .upsert(validMappings, { onConflict: ["word_id", "related_word_id"] });

        if (mappingError) {
          throw new Error(`Error inserting/updating mappings: ${mappingError.message}`);
        }
        console.log(`Mappings created/updated for word ID ${wordId}:`, validMappings);
      }
    } catch (err) {
      console.error(`Error creating mappings for word ID ${wordId}: ${err.message}`);
      throw new Error(`Error creating mappings: ${err.message}`);
    }
  };

  const handleSewasew = async (geezId, sewasewText) => {
    if (!sewasewText) return;

    try {
      const { data: existingSewasew, error: fetchError } = await supabase
        .from("sewasew")
        .select("sewasew_id")
        .eq("word_id", geezId)
        .eq("sewasew_text", sewasewText)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!existingSewasew) {
        const { error: insertError } = await supabase
          .from("sewasew")
          .insert([{ word_id: geezId, sewasew_text: sewasewText }]);

        if (insertError) {
          throw insertError;
        }

        console.log(`Sewasew added for Ge'ez word ID ${geezId}: ${sewasewText}`);
      } else {
        console.log(`Sewasew already exists for Ge'ez word ID ${geezId}: ${sewasewText}`);
      }
    } catch (err) {
      console.error(`Error handling Sewasew: ${err.message}`);
      throw new Error(`Error handling Sewasew: ${err.message}`);
    }
  };

  
  const createBidirectionalMappings = async (geezId, relatedIds, existingMappings) => {
    try {
      const { ti, am, en } = relatedIds;
      const allTranslations = [...existingMappings, ti, am, en].filter(Boolean); // Merge existing and provided
  
      // Create bidirectional mappings between Ge'ez and provided translations
      for (const relatedId of [ti, am, en].filter(Boolean)) {

        await insertMappings(geezId, [relatedId]);
        await insertMappings(relatedId, [geezId]);
      }
  
  
      // Create bidirectional mappings between all translations (including Ge'ez)

      // Create bidirectional mappings between all translations (including Ge'ez)
      for (const wordA of allTranslations) {
        for (const wordB of allTranslations) {
          if (wordA !== wordB) {
            await insertMappings(wordA, [wordB]);
          }
        }
      }
    } catch (err) {
      console.error(`Error creating bidirectional mappings: ${err.message}`);
      throw new Error(`Error creating bidirectional mappings: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { geez, tigrinya, amharic, english, sewasew } = wordData;

    if (!geez) {
      setError("The Ge'ez word is required.");
      return;
    }

    try {
      const wordEntries = {};
  
  
      // Insert words or fetch their IDs

      // Insert words or fetch their IDs
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
                // Fetch existing mappings for the Ge'ez word
        const existingMappings = await getExistingMappingsForGeez(geezId);
  
        // Create bidirectional mappings for related translations

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
    <div className="flex h-screen w-full min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg">
        <h2 className="text-3xl font-bold text-center text-yellow-700 mb-6">
          Add New Word
        </h2>

        {error && (
          <div className="text-red-500 bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="text-green-500 bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {["geez", "tigrinya", "amharic", "english", "sewasew"].map((field, index) => (
            <div key={index} className="mb-6">
              <label
                htmlFor={field}
                className="block text-gray-700 text-sm font-semibold mb-2"
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}:
              </label>
              <input
                type="text"
                id={field}
                name={field}
                value={wordData[field]}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring focus:border-yellow-400 text-gray-700"
                placeholder={`Enter ${field}`}
                required={field === "geez"}
              />
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg shadow-lg hover:bg-yellow-700 focus:outline-none transition"
          >
            Add Word
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddWord;
