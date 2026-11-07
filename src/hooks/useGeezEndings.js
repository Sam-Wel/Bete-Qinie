import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { findEntries } from "./useDictionarySearch";

const GEEZ = "gz";

// The 26 classical Ge'ez base (first-order / "geez" vowel) consonant
// letters, in traditional fidel order -- shown as browse chips instead of
// whatever last-letter variants happen to occur in the word list, since
// most of those are 6th/7th-order forms that aren't useful to browse by.
const GEEZ_BASE_LETTERS = [
  "ሀ", "ለ", "ሐ", "መ", "ሠ", "ረ", "ሰ", "ቀ", "በ", "ተ",
  "ኀ", "ነ", "አ", "ከ", "ወ", "ዐ", "ዘ", "የ", "ደ", "ገ",
  "ጠ", "ጰ", "ጸ", "ፀ", "ፈ", "ፐ",
];

// Browse Ge'ez words grouped by their LAST letter (word-ending), rather
// than the traditional first-letter A-Z browse -- useful for finding
// words that share a verb-root ending pattern.
export function useGeezEndings() {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    supabase
      .from("languages")
      .select("*")
      .then(({ data, error }) => {
        if (error) console.error("Error fetching languages:", error);
        else setLanguages(data || []);
      });
  }, []);

  const languageMap = languages.reduce((map, lang) => {
    map[lang.language_code] = lang.language_name;
    return map;
  }, {});

  const [selectedLetter, setSelectedLetter] = useState(null);
  const [endingWords, setEndingWords] = useState([]);
  const [wordsLoading, setWordsLoading] = useState(false);

  const [selectedWord, setSelectedWord] = useState(null);
  const [entries, setEntries] = useState([]);
  const [sewasewExamples, setSewasewExamples] = useState([]);
  const [translationsLoading, setTranslationsLoading] = useState(false);
  const [error, setError] = useState(null);

  const selectLetter = useCallback(async (letter) => {
    setSelectedLetter(letter);
    setSelectedWord(null);
    setEntries([]);
    setSewasewExamples([]);
    setWordsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("words")
        .select("word")
        .eq("language_code", GEEZ)
        .ilike("word", `%${letter}`)
        .order("word")
        .limit(1000); // ረ alone has over 200

      if (error) {
        console.error("Error loading words ending with letter:", error);
        setError("Failed to load words. Please try again.");
      } else {
        setEndingWords([...new Set(data.map((item) => item.word))]);
      }
    } catch (err) {
      console.error("Unexpected error loading words ending with letter:", err);
      setError("An unexpected error occurred.");
    } finally {
      setWordsLoading(false);
    }
  }, []);

  const selectWord = useCallback(async (word) => {
    setSelectedWord(word);
    setEntries([]);
    setSewasewExamples([]);
    setTranslationsLoading(true);
    setError(null);
    try {
      const found = await findEntries(word, GEEZ);
      if (found.error) {
        console.error("Error fetching translations:", found.error);
        setError("Failed to fetch translations. Please try again.");
        return;
      }
      setEntries(found.entries);

      const ids = found.entries.map((e) => e.geezId).filter(Boolean);
      if (ids.length) {
        const { data: sewasewData, error: sewasewError } = await supabase
          .from("sewasew")
          .select("sewasew_id, sewasew_text, word_id")
          .in("word_id", ids);

        if (sewasewError) {
          console.error("Error fetching Sewasew examples:", sewasewError);
        } else {
          setSewasewExamples(sewasewData || []);
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching translations:", err);
      setError("An unexpected error occurred.");
    } finally {
      setTranslationsLoading(false);
    }
  }, []);

  return {
    languageMap,
    endingLetters: GEEZ_BASE_LETTERS,
    selectedLetter,
    endingWords,
    wordsLoading,
    selectLetter,
    selectedWord,
    entries,
    sewasewExamples,
    translationsLoading,
    selectWord,
    error,
  };
}
