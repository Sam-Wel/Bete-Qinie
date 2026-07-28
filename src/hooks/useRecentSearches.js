import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "dictionary_recent_searches";
const MAX_RECENT = 5;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState([]);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setRecentSearches(JSON.parse(raw));
      })
      .catch(() => {
        // Storage can be unavailable -- recent searches just won't persist.
      })
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    // Skip the write on first mount, before the initial read above resolves
    // -- otherwise an empty array would overwrite whatever was stored.
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches)).catch(() => {});
  }, [recentSearches]);

  const addRecentSearch = useCallback((query, language, languageLabel) => {
    if (!query?.trim()) return;
    setRecentSearches((prev) => {
      const entry = { query, language, languageLabel };
      const withoutDupe = prev.filter(
        (item) => !(item.query === query && item.language === language)
      );
      return [entry, ...withoutDupe].slice(0, MAX_RECENT);
    });
  }, []);

  return { recentSearches, addRecentSearch };
}
