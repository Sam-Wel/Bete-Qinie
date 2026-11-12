import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabaseClient";
import { fetchAll } from "../lib/fetchAll";
import { buildLexicon } from "../lib/lexicon";

// The live Ge'ez lexicon release: which release it is, and its verbs (heads, glosses,
// open questions). Words are cached on the device per release tag, so a new release
// loads fresh by itself and an old cache is never shown for a newer release. Until
// supabase/lexicon.sql has been run (or while nothing is live) `available` is false
// and the features that use the lexicon stay hidden.

const CACHE_PREFIX = "bete-qinie:lexicon:";
const CURRENT_KEY = `${CACHE_PREFIX}current`;

let memory = null; // { available, release, lexicon }
let pending = null;
const listeners = new Set();

async function readCache(tag) {
  try {
    const cached = JSON.parse((await AsyncStorage.getItem(CACHE_PREFIX + tag)) || "null");
    return cached?.rows && cached?.release ? cached : null;
  } catch {
    return null;
  }
}

async function loadLexicon() {
  const { data: release, error } = await supabase
    .from("lexicon_releases")
    .select("tag, version, released_on, words, forms, heads")
    .eq("is_current", true)
    .maybeSingle();

  if (error) {
    // Offline, or the tables don't exist yet: use the last live release seen on this device.
    const tag = await AsyncStorage.getItem(CURRENT_KEY).catch(() => null);
    const cached = tag ? await readCache(tag) : null;
    return cached
      ? { available: true, release: cached.release, lexicon: buildLexicon(cached.rows, cached.release.heads) }
      : { available: false, release: null, lexicon: null };
  }
  if (!release) return { available: false, release: null, lexicon: null };

  const cached = await readCache(release.tag);
  if (cached) return { available: true, release, lexicon: buildLexicon(cached.rows, release.heads) };

  const rows = await fetchAll(() =>
    supabase
      .from("lexicon_current_words")
      .select("lex_id, headword, spellings, heads, senses, open_questions, sources")
      .order("lex_id")
  );
  const previous = await AsyncStorage.getItem(CURRENT_KEY).catch(() => null);
  AsyncStorage.setItem(CACHE_PREFIX + release.tag, JSON.stringify({ release, rows })).catch(() => {});
  AsyncStorage.setItem(CURRENT_KEY, release.tag).catch(() => {});
  if (previous && previous !== release.tag) AsyncStorage.removeItem(CACHE_PREFIX + previous).catch(() => {});
  return { available: true, release, lexicon: buildLexicon(rows, release.heads) };
}

function ensureLoaded() {
  if (memory || pending) return;
  pending = loadLexicon()
    .catch((err) => {
      console.error("Error loading the lexicon:", err);
      return { available: false, release: null, lexicon: null };
    })
    .then((result) => {
      memory = result;
      pending = null;
      listeners.forEach((fn) => fn(result));
    });
}

// { lexicon, release, available, loading }. One request per app session, shared by every caller.
export function useLexicon() {
  const [state, setState] = useState(memory);

  useEffect(() => {
    if (memory) {
      setState(memory);
      return undefined;
    }
    listeners.add(setState);
    ensureLoaded();
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    lexicon: state?.lexicon ?? null,
    release: state?.release ?? null,
    available: Boolean(state?.available),
    loading: !state,
  };
}

const formsMemory = new Map(); // lex id → forms

// One word's printed forms (lexicon_current_forms rows, in printed order), loaded when asked for.
export function useLexiconForms(lexId, enabled = true) {
  const [forms, setForms] = useState(lexId ? formsMemory.get(lexId) ?? null : null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lexId || !enabled || formsMemory.has(lexId)) {
      if (lexId && formsMemory.has(lexId)) setForms(formsMemory.get(lexId));
      return undefined;
    }
    let cancelled = false;
    supabase
      .from("lexicon_current_forms")
      .select("n, form, slot, traditional_name, book_label, book")
      .eq("lex_id", lexId)
      .order("n")
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError("Couldn't load the forms.");
          return;
        }
        formsMemory.set(lexId, data);
        setForms(data);
      });
    return () => {
      cancelled = true;
    };
  }, [lexId, enabled]);

  return { forms, error, loading: enabled && !forms && !error };
}
