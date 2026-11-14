import { supabase } from "./supabaseClient";
import { adminError } from "./adminApi";
import { LANGUAGE_NAMES } from "../components/WordCard";

export const LANGUAGE_CODES = ["gz", "ti", "am", "en"];
export const languageLabel = (code) => LANGUAGE_NAMES[code] || code;

// Words containing the text, in any language: exact matches first, then ግዕዝ, then shorter.
export async function searchWords(text, { language, limit = 60 } = {}) {
  const t = text.replace(/[%_*]/g, " ").trim();
  if (!t) return [];
  let q = supabase.from("words").select("word_id, word, language_code").ilike("word", `%${t}%`).limit(300);
  if (language) q = q.eq("language_code", language);
  const { data, error } = await q;
  if (error) throw new Error(adminError(error));
  const norm = (s) => s.trim().toLowerCase();
  const want = norm(t);
  return data
    .map((w) => ({ ...w, word: w.word.trim() }))
    .sort(
      (a, b) =>
        (norm(b.word) === want) - (norm(a.word) === want) ||
        (b.language_code === "gz") - (a.language_code === "gz") ||
        a.word.length - b.word.length
    )
    .slice(0, limit);
}

// For each word id, the words it is linked to, by language: { id: { gz:[], ti:[], am:[], en:[] } }.
export async function loadPreviews(ids) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const links = [];
  for (let i = 0; i < unique.length; i += 150) {
    const { data, error } = await supabase
      .from("translationmappings")
      .select("word_id, related_word_id")
      .in("word_id", unique.slice(i, i + 150));
    if (error) throw new Error(adminError(error));
    links.push(...data);
  }
  const otherIds = [...new Set(links.map((l) => l.related_word_id))];
  const words = {};
  for (let i = 0; i < otherIds.length; i += 150) {
    const { data, error } = await supabase
      .from("words")
      .select("word_id, word, language_code")
      .in("word_id", otherIds.slice(i, i + 150));
    if (error) throw new Error(adminError(error));
    for (const w of data) words[w.word_id] = w;
  }
  const out = {};
  for (const l of links) {
    const w = words[l.related_word_id];
    if (!w) continue;
    const p = (out[l.word_id] ||= { gz: [], ti: [], am: [], en: [] });
    if (p[w.language_code] && !p[w.language_code].includes(w.word.trim())) p[w.language_code].push(w.word.trim());
  }
  return out;
}

// "ትግርኛ: ሐዘለ · አማርኛ: ተሸከመ · English: carry" — the languages a word has, in app order.
export function previewLine(preview, empty = "No meanings yet") {
  if (!preview) return empty;
  const parts = LANGUAGE_CODES.filter((c) => preview[c]?.length).map(
    (c) => `${languageLabel(c)}: ${preview[c].join(c === "en" ? ", " : "፣ ")}`
  );
  return parts.join("  ·  ") || empty;
}
