import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const GEEZ = "gz";

// Browse Ge'ez words grouped by their LAST letter (word-ending), rather
// than the traditional first-letter A-Z browse -- useful for finding
// words that share a verb-root ending pattern.
export function useGeezEndings() {
  const [languages, setLanguages] = useState([]);
  const [endingLetters, setEndingLetters] = useState([]);
  const [lettersLoading, setLettersLoading] = useState(false);

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
  const [translations, setTranslations] = useState([]);
  const [sewasewExamples, setSewasewExamples] = useState([]);
  const [translationsLoading, setTranslationsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEndingLetters = useCallback(async () => {
    setLettersLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("words")
        .select("word")
        .eq("language_code", GEEZ)
        .limit(1000);

      if (error) {
        console.error("Error loading Ge'ez ending letters:", error);
        setError("Failed to load letters. Please try again.");
      } else {
        const letters = [...new Set(data.map((item) => item.word?.slice(-1)).filter(Boolean))].sort();
        setEndingLetters(letters);
      }
    } catch (err) {
      console.error("Unexpected error loading Ge'ez ending letters:", err);
      setError("An unexpected error occurred.");
    } finally {
      setLettersLoading(false);
    }
  }, []);

  const selectLetter = useCallback(async (letter) => {
    setSelectedLetter(letter);
    setSelectedWord(null);
    setTranslations([]);
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
        .limit(200);

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
    setTranslations([]);
    setSewasewExamples([]);
    setTranslationsLoading(true);
    setError(null);
    try {
      const { data: translationData, error: translationError } = await supabase.rpc(
        "get_translations",
        { search_word: word, language: GEEZ }
      );

      if (translationError) {
        console.error("Error fetching translations:", translationError);
        setError("Failed to fetch translations. Please try again.");
        return;
      }

      setTranslations(translationData || []);

      if (translationData && translationData.length > 0) {
        const { data: sewasewData, error: sewasewError } = await supabase
          .from("sewasew")
          .select("sewasew_id, sewasew_text")
          .in(
            "word_id",
            translationData.map((item) => item.word_id)
          );

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
    endingLetters,
    lettersLoading,
    loadEndingLetters,
    selectedLetter,
    endingWords,
    wordsLoading,
    selectLetter,
    selectedWord,
    translations,
    sewasewExamples,
    translationsLoading,
    selectWord,
    error,
  };
}
