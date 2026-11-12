// The Ge'ez lexicon in the app: verbs with the head (ርእስ) they follow, read from
// the book's printed class marks, and their printed forms with ርባታ slots. The data
// comes from a "core" release of ~/Projects/geez-lexicon (see supabase/lexicon.sql and
// scripts/import-lexicon.mjs). Pure functions, like verbQuiz.js, so they can be tested.

import { shuffle } from "./verbQuiz";

// The 8 head verbs (አርእስት), grouped so look-alikes sit together. The book counts
// six heads: ቀደሰ is a branch of ቀተለ and ማህረከ of ተንበለ.
export const HEAD_ORDER = ["ቀተለ", "ቀደሰ", "ተንበለ", "ማህረከ", "ባረከ", "ሴሰየ", "ክህለ", "ጦመረ"];

// Heads that are hard to tell apart: ቀተለ and ቀደሰ are spelled the same and differ
// only in the doubled middle letter; ማህረከ is the long-ā branch of ተንበለ.
export const LOOK_ALIKE = { ቀተለ: "ቀደሰ", ቀደሰ: "ቀተለ", ተንበለ: "ማህረከ", ማህረከ: "ተንበለ" };

// ርባታ slots in teaching order (as in the lexicon's arist.json).
export const SLOT_ORDER = [
  "perfect", "imperfect", "zend", "tezaz", "nus", "boz",
  "wusta_m_sg", "wusta_m_pl", "wusta_f_sg", "wusta_f_pl",
  "baed_qitsl", "medbel", "sabi_zer", "baed_zer", "zemed_zer", "tire_zer", "tire_mielad", "mielad", "plural",
];

// The slots shown as a head's pattern: ቀተለ · ይቀትል · ይቅትል · ቀቲል.
export const PATTERN_SLOTS = ["perfect", "imperfect", "zend", "nus"];

const clean = (text) => (text || "").trim();

// rows: lexicon_current_words rows { lex_id, headword, spellings, heads, senses, open_questions, sources }.
// heads: the release's head tables [{ head, gloss, branch_of, book_labels, slots: [{ slot, name, forms, gloss }] }].
export function buildLexicon(rows, heads = []) {
  const words = rows.map((r) => ({
    id: r.lex_id,
    headword: clean(r.headword),
    spellings: [...new Set([r.headword, ...(r.spellings || [])].map(clean).filter(Boolean))],
    heads: (r.heads || []).filter((h) => h && h.class),
    senses: r.senses || [],
    openQuestions: r.open_questions || [],
    sources: r.sources || [],
  }));
  const byId = Object.fromEntries(words.map((w) => [w.id, w]));
  const bySpelling = {};
  for (const w of words) for (const s of w.spellings) (bySpelling[s] = bySpelling[s] || []).push(w);
  const headTables = Object.fromEntries((heads || []).map((h) => [h.head, h]));
  return { words, byId, bySpelling, heads: headTables };
}

// Lexicon words spelled this way (a spelling can belong to two homographs).
export const lookup = (lexicon, spelling) => (lexicon ? lexicon.bySpelling[clean(spelling)] || [] : []);

// The distinct heads of a word, in HEAD_ORDER, with the book's mark for each.
export function headsOf(word) {
  const seen = new Map();
  for (const h of word?.heads || []) {
    if (!seen.has(h.class)) seen.set(h.class, h.book_label || null);
  }
  return HEAD_ORDER.filter((h) => seen.has(h)).map((head) => ({ head, mark: seen.get(head) }));
}

// The book's Amharic (or Tigrinya) gloss of a word, for when the app has no meaning of its own.
export function bookGloss(word, lang = "am") {
  for (const s of word?.senses || []) {
    const g = (s.gloss?.[lang] || [])[0];
    if (g?.text) return g.text;
  }
  return lang === "am" ? null : bookGloss(word, "am");
}

// lex id → the app's verb (bank entry) with the same spelling, for meanings and today's focus.
export function linkToBank(lexicon, bank) {
  if (!lexicon || !bank) return {};
  const bySpelling = {};
  for (const e of bank.words) bySpelling[e.word] = bySpelling[e.word] || e;
  const links = {};
  for (const w of lexicon.words) {
    const hit = w.spellings.map((s) => bySpelling[s]).find(Boolean);
    if (hit) links[w.id] = hit;
  }
  return links;
}

// One question per spelling the book prints with a head mark. A spelling printed under
// two heads accepts both. Words that still have open questions in the lexicon's review
// are left out, so only settled readings are asked.
export function headItems(lexicon, links = {}) {
  const items = [];
  for (const w of lexicon?.words || []) {
    if (w.openQuestions.length) continue;
    const bySpelling = new Map();
    for (const h of w.heads) {
      if (!HEAD_ORDER.includes(h.class)) continue;
      const form = clean(h.form) || w.headword;
      if (!bySpelling.has(form)) bySpelling.set(form, { classes: new Set(), mark: h.book_label || null });
      bySpelling.get(form).classes.add(h.class);
    }
    for (const [form, { classes, mark }] of bySpelling) {
      items.push({
        key: `${w.id}:${form}`,
        lexId: w.id,
        form,
        answers: HEAD_ORDER.filter((h) => classes.has(h)),
        mark,
        entry: links[w.id] || null,
        word: w,
      });
    }
  }
  return items;
}

// `count` questions with the heads evened out: each draw picks a head with weight
// √(its number of items), so ቀተለ (two thirds of all verbs) doesn't crowd out the rare
// heads, then an unused verb of that head. Items whose app verb is in `preferIds`
// (today's words) come first. No verb is asked twice in a round.
export function pickBalanced(items, count, random = Math.random, preferIds = null) {
  const picked = [];
  const used = new Set();
  const take = (item) => {
    if (item && !used.has(item.lexId)) {
      used.add(item.lexId);
      picked.push(item);
    }
  };
  if (preferIds) {
    for (const item of shuffle(items.filter((i) => i.entry && preferIds.has(i.entry.id)), random)) {
      if (picked.length >= count) break;
      take(item);
    }
  }
  const groups = {};
  for (const item of shuffle(items, random)) (groups[item.answers[0]] = groups[item.answers[0]] || []).push(item);
  while (picked.length < count) {
    const heads = Object.keys(groups).filter((h) => groups[h].some((i) => !used.has(i.lexId)));
    if (!heads.length) break;
    const weights = heads.map((h) => Math.sqrt(groups[h].length));
    let r = random() * weights.reduce((a, b) => a + b, 0);
    let k = 0;
    while (k < heads.length - 1 && r >= weights[k]) {
      r -= weights[k];
      k += 1;
    }
    take(groups[heads[k]].find((i) => !used.has(i.lexId)));
  }
  return shuffle(picked, random);
}

export const HEAD_DIFFICULTIES = [
  { key: "easy", label: "Easy", hint: "Four heads, never two look-alikes together." },
  { key: "medium", label: "Medium", hint: "Four heads, always with the answer's look-alike (ቀተለ/ቀደሰ, ተንበለ/ማህረከ)." },
  { key: "hard", label: "Hard", hint: "All eight heads." },
];

// The options for one item. Exactly one option is right, except on hard, where all
// eight heads are shown and a spelling read under two heads accepts either.
export function headQuestion(item, difficulty = "easy", random = Math.random) {
  const answer = item.answers[0];
  let options;
  if (difficulty === "hard") {
    options = [...HEAD_ORDER];
  } else {
    const twin = LOOK_ALIKE[answer];
    const withTwin = difficulty === "medium" && twin && !item.answers.includes(twin);
    const pool = HEAD_ORDER.filter((h) => !item.answers.includes(h) && h !== twin);
    options = shuffle([answer, ...(withTwin ? [twin] : []), ...shuffle(pool, random).slice(0, withTwin ? 2 : 3)], random);
  }
  return { item, options, answerIndex: options.indexOf(answer) };
}

export const isRightHead = (question, index) => index >= 0 && question.item.answers.includes(question.options[index]);

// A head's pattern for the answer screen: [{ slot, name, forms }].
export function headPattern(lexicon, head) {
  const table = lexicon?.heads?.[head];
  if (!table) return [];
  return PATTERN_SLOTS.map((slot) => table.slots.find((s) => s.slot === slot))
    .filter((s) => s && s.forms?.length)
    .map((s) => ({ slot: s.slot, name: s.name, forms: s.forms }));
}

const WUSTA_NAMES = { wusta_m_sg: "ውስጠ ዘ", wusta_m_pl: "ውስጠ ዘ · በብዙ", wusta_f_sg: "ውስጠ ዘ · ለሴት", wusta_f_pl: "ውስጠ ዘ · ለሴት በብዙ" };

// A word's printed forms grouped for display, in ርባታ order:
// [{ slot, label, forms: [text] }]. forms: lexicon_current_forms rows ordered by n.
export function formsByName(forms) {
  const groups = new Map();
  for (const f of forms || []) {
    const key = f.slot || "other";
    if (!groups.has(key)) groups.set(key, { slot: key, label: WUSTA_NAMES[key] || f.traditional_name || f.book_label || key, forms: [] });
    const g = groups.get(key);
    if (!g.forms.includes(f.form)) g.forms.push(f.form);
  }
  const rank = (slot) => (SLOT_ORDER.includes(slot) ? SLOT_ORDER.indexOf(slot) : SLOT_ORDER.length);
  return [...groups.values()].sort((a, b) => rank(a.slot) - rank(b.slot));
}
