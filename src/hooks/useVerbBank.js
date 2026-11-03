import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";
import { buildBank, VERB_ENDINGS } from "../lib/verbQuiz";

const CACHE_KEY = "bete-qinie:verb-bank:v4"; // v4: new Tigrinya and Amharic
const CACHE_MS = 24 * 3600 * 1000;
const PAGE = 1000;

let memory = null;

async function fetchAll(query) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query().range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

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
// device for a day so the quiz opens instantly the next time.
export function useVerbBank() {
  const [bank, setBank] = useState(memory);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (memory) return;
    let cancelled = false;

    (async () => {
      try {
        const cached = JSON.parse((await AsyncStorage.getItem(CACHE_KEY)) || "null");
        if (cached && Date.now() - cached.at < CACHE_MS) {
          memory = buildBank(cached.rows);
          if (!cancelled) setBank(memory);
          return;
        }
      } catch {
        // A broken cache just means loading fresh.
      }

      try {
        const rows = await loadRows();
        memory = buildBank(rows);
        if (!cancelled) setBank(memory);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows })).catch(() => {});
      } catch (err) {
        console.error("Error loading the verb bank:", err);
        if (!cancelled) setError("Couldn't load the verbs. Check your connection and try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { bank, loading: !bank && !error, error };
}
