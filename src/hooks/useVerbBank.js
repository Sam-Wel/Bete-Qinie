import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";
import { fetchAll } from "../lib/fetchAll";
import { buildBank, VERB_ENDINGS } from "../lib/verbQuiz";

const CACHE_KEY = "bete-qinie:verb-bank:v6"; // v6: ሃልሀ and ሀልሀ fixed (2026-11-13)
const CACHE_MS = 24 * 3600 * 1000; // only until supabase/admin_tools.sql adds the dictionary version
const VERSION_WAIT_MS = 3000;

// The dictionary's version: admin_tools.sql moves it on with every edit to words,
// meanings or ሰዋሰው, so a cached bank is kept exactly as long as nothing changed.
// null before that file is run, or when the server doesn't answer quickly.
async function serverVersion() {
  const ask = supabase
    .from("app_settings")
    .select("value")
    .eq("key", "dictionary_version")
    .maybeSingle()
    .then(({ data, error }) => (error ? null : data?.value?.at ?? null), () => null);
  const wait = new Promise((done) => setTimeout(() => done(null), VERSION_WAIT_MS));
  return Promise.race([ask, wait]);
}

let memory = null;

// Before supabase/verb_quiz.sql has been run there is no verb_quiz_bank view, so
// the same rows are put together here from words and translationmappings.
async function assembleRows() {
  const geez = (
    await fetchAll(() => supabase.from("words").select("word_id, word").eq("language_code", "gz").order("word_id"))
  ).filter((w) => VERB_ENDINGS.includes([...w.word.trim()].pop()));
  const ids = new Set(geez.map((w) => w.word_id));

  const [mappings, others] = await Promise.all([
    fetchAll(() => supabase.from("translationmappings").select("word_id, related_word_id").order("mapping_id")),
    fetchAll(() =>
      supabase.from("words").select("word_id, word, language_code").in("language_code", ["ti", "am", "en"]).order("word_id")
    ),
  ]);
  const other = Object.fromEntries(others.map((w) => [w.word_id, w]));

  const rows = Object.fromEntries(geez.map((w) => [w.word_id, { word_id: w.word_id, word: w.word, ti: [], am: [], en: [] }]));
  for (const m of mappings) {
    const target = other[m.related_word_id];
    if (ids.has(m.word_id) && target) rows[m.word_id][target.language_code].push(target.word);
  }
  return Object.values(rows);
}

async function loadRows() {
  try {
    return await fetchAll(() => supabase.from("verb_quiz_bank").select("word_id, word, ti, am, en").order("word_id"));
  } catch {
    return assembleRows();
  }
}

// Every Ge'ez verb with its meanings, loaded once per session and kept on the
// device until the dictionary changes, so the quiz opens instantly the next time.
export function useVerbBank() {
  const [bank, setBank] = useState(memory);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (memory) return;
    let cancelled = false;

    (async () => {
      const [cached, version] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY)
          .then((text) => JSON.parse(text || "null"))
          .catch(() => null), // a broken cache just means loading fresh
        serverVersion(),
      ]);
      const fresh = version ? cached?.version === version : cached && Date.now() - cached.at < CACHE_MS;
      if (cached?.rows && fresh) {
        memory = buildBank(cached.rows);
        if (!cancelled) setBank(memory);
        return;
      }

      try {
        const rows = await loadRows();
        memory = buildBank(rows);
        if (!cancelled) setBank(memory);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), version, rows })).catch(() => {});
      } catch (err) {
        console.error("Error loading the verb bank:", err);
        if (cached?.rows) {
          // Offline: yesterday's words beat no words.
          memory = buildBank(cached.rows);
          if (!cancelled) setBank(memory);
        } else if (!cancelled) {
          setError("Couldn't load the verbs. Check your connection and try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { bank, loading: !bank && !error, error };
}
