import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";
import { fetchAll } from "../lib/fetchAll";
import { buildBank, VERB_ENDINGS } from "../lib/verbQuiz";
import { HOUR, onResume } from "../lib/appResume";

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

// One shared copy for the whole app: { bank, error }, the dictionary version it was
// built from, and the screens listening for it.
let memory = null;
let memoryVersion = null;
let pending = null;
const listeners = new Set();

function publish(state) {
  if (state.bank) memory = state.bank;
  listeners.forEach((fn) => fn(state));
}

async function load() {
  const [cached, version] = await Promise.all([
    AsyncStorage.getItem(CACHE_KEY)
      .then((text) => JSON.parse(text || "null"))
      .catch(() => null), // a broken cache just means loading fresh
    serverVersion(),
  ]);
  const fresh = version ? cached?.version === version : cached && Date.now() - cached.at < CACHE_MS;
  if (cached?.rows && fresh) {
    memoryVersion = version ?? cached.version ?? null;
    return buildBank(cached.rows);
  }
  try {
    const rows = await loadRows();
    memoryVersion = version;
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), version, rows })).catch(() => {});
    return buildBank(rows);
  } catch (err) {
    console.error("Error loading the verb bank:", err);
    if (cached?.rows) return buildBank(cached.rows); // offline: yesterday's words beat no words
    throw err;
  }
}

function ensureLoaded() {
  if (memory || pending) return;
  pending = load()
    .then((bank) => publish({ bank, error: null }))
    .catch(() => publish({ bank: null, error: "Couldn't load the verbs. Check your connection and try again." }))
    .finally(() => {
      pending = null;
    });
}

// Back after an hour or more: if the dictionary changed meanwhile (an editor fixed a
// word), load the new words; every screen showing the bank gets them.
let watching = false;
function watchForUpdates() {
  if (watching) return;
  watching = true;
  onResume(async (away) => {
    if (away < HOUR || !memory || pending) return;
    const version = await serverVersion();
    if (!version || version === memoryVersion) return;
    try {
      const rows = await loadRows();
      memoryVersion = version;
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), version, rows })).catch(() => {});
      publish({ bank: buildBank(rows), error: null });
    } catch {
      // Keep the words already shown; the next return tries again.
    }
  });
}

// Every Ge'ez verb with its meanings, loaded once per session and kept on the
// device until the dictionary changes, so the quiz opens instantly the next time.
export function useVerbBank() {
  const [state, setState] = useState({ bank: memory, error: null });

  useEffect(() => {
    listeners.add(setState);
    if (memory) setState({ bank: memory, error: null });
    else ensureLoaded();
    watchForUpdates();
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return { bank: state.bank, loading: !state.bank && !state.error, error: state.error };
}
