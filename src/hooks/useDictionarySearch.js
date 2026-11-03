import { useState, useEffect, useRef, useCallback } from "react";
import Fuse from "fuse.js";
import { supabase } from "../lib/supabaseClient";

const SUGGESTION_DEBOUNCE_MS = 300;
const SUGGESTION_CANDIDATE_LIMIT = 25;
const SUGGESTION_RESULT_LIMIT = 5;

const byGeez = (rows) => {
  const entries = new Map();
  for (const r of rows) {
    if (!entries.has(r.geez_id)) entries.set(r.geez_id, { geezId: r.geez_id, geez: r.geez_word, meanings: {} });
    if (r.target_language && r.translated_word) {
      const list = (entries.get(r.geez_id).meanings[r.target_language] ??= []);
      if (!list.includes(r.translated_word)) list.push(r.translated_word);
    }
  }
  return [...entries.values()];
};

// Every search lands on Ge'ez words: a Ge'ez search finds that word, any other
// language finds the Ge'ez words it translates. Each comes back with its own
// Tigrinya, Amharic and English. Falls back to the older get_translations until
// supabase/english_meanings.sql has been run.
async function findEntries(word, language) {
  const { data, error } = await supabase.rpc("search_dictionary", { search_word: word, language });
  if (!error) return { entries: byGeez(data || []) };

  const old = await supabase.rpc("get_translations", { search_word: word, language });
  if (old.error) return { error: old.error };
  const rows = old.data || [];
  if (language === "gz") {
    return {
      entries: byGeez(rows.map((r) => ({ geez_id: r.word_id, geez_word: r.word, target_language: r.target_language, translated_word: r.translated_word }))),
    };
  }
  const [entry] = byGeez(rows.map((r) => ({ geez_id: null, geez_word: null, target_language: r.target_language, translated_word: r.translated_word })));
  return { entries: entry ? [entry] : [] };
}

export function useDictionarySearch() {
  const [query, setQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("gz"); // Default to Ge'ez
  const [languages, setLanguages] = useState([]);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sewasewExamples, setSewasewExamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const suggestionTimer = useRef(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const { data, error } = await supabase.from("languages").select("*");
        if (error) {
          console.error("Error fetching languages:", error);
        } else {
          setLanguages(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchLanguages();
  }, []);

  const languageMap = languages.reduce((map, lang) => {
    map[lang.language_code] = lang.language_name;
    return map;
  }, {});

  const fetchSuggestions = useCallback(
    async (value) => {
      if (!value.trim() || !selectedLanguage) {
        setSuggestions([]);
        return;
      }

      try {
        // Cast a wider net than a strict prefix match (catches typos and
        // mid-word matches), then fuzzy-rank the candidates client-side so
        // the closest matches to what was typed float to the top. This
        // only smooths over the candidates Supabase already returned —
        // real typo-correction across the whole dictionary would need a
        // trigram/full-text index set up on the Postgres side.
        const { data, error } = await supabase
          .from("words")
          .select("word")
          .eq("language_code", selectedLanguage)
          .ilike("word", `%${value}%`)
          .limit(SUGGESTION_CANDIDATE_LIMIT);

        if (error) {
          console.error("Error fetching suggestions:", error);
          return;
        }

        const candidates = [...new Set(data.map((item) => item.word))];
        const fuse = new Fuse(candidates, { includeScore: true, threshold: 0.4 });
        const fuzzyMatches = fuse.search(value).map((result) => result.item);
        const ranked = fuzzyMatches.length > 0 ? fuzzyMatches : candidates;
        setSuggestions(ranked.slice(0, SUGGESTION_RESULT_LIMIT));
      } catch (err) {
        console.error("Unexpected error fetching suggestions:", err);
      }
    },
    [selectedLanguage]
  );

  // Debounced so a Supabase request doesn't fire on every keystroke.
  const onQueryChange = useCallback(
    (value) => {
      setQuery(value);
      if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
      suggestionTimer.current = setTimeout(() => {
        fetchSuggestions(value);
      }, SUGGESTION_DEBOUNCE_MS);
    },
    [fetchSuggestions]
  );

  useEffect(() => {
    return () => {
      if (suggestionTimer.current) clearTimeout(suggestionTimer.current);
    };
  }, []);

  const selectSuggestion = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
  };

  // Accepts optional overrides so browse/recent-search taps can trigger a
  // search for a specific word+language without waiting on a state update
  // round-trip (setQuery is async; reading back `query` immediately after
  // would still see the old value).
  const handleSearch = async (overrideQuery, overrideLanguage) => {
    const searchQuery = overrideQuery ?? query;
    const searchLanguage = overrideLanguage ?? selectedLanguage;

    if (!searchQuery.trim() || !searchLanguage) {
      setError("Please enter a search term and select a language.");
      return;
    }

    setQuery(searchQuery);
    setSelectedLanguage(searchLanguage);
    setLoading(true);
    setError(null);
    setSewasewExamples([]);
    setResults([]);
    setSuggestions([]);

    try {
      const found = await findEntries(searchQuery.trim(), searchLanguage);
      if (found.error) {
        setError("Failed to fetch data. Please try again.");
        console.error(found.error);
        return;
      }
      setResults(found.entries);

      const ids = found.entries.map((e) => e.geezId).filter(Boolean);
      if (ids.length) {
        const { data: sewasewData, error: sewasewError } = await supabase
          .from("sewasew")
          .select("sewasew_id, sewasew_text, word_id")
          .in("word_id", ids);

        if (sewasewError) {
          console.error("Error fetching Sewasew examples:", sewasewError);
        } else {
          setSewasewExamples(sewasewData);
        }
      }

      return { query: searchQuery, language: searchLanguage };
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}
