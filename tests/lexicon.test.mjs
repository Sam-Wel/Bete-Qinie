import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { bank, seeded } from "./helpers.mjs";
import {
  HEAD_ORDER,
  LOOK_ALIKE,
  bookGloss,
  buildLexicon,
  formsByName,
  headItems,
  headPattern,
  headQuestion,
  headsOf,
  isRightHead,
  linkToBank,
  lookup,
  pickBalanced,
} from "../src/lib/lexicon.js";

// A slice of the real data-v0.3.0 release (all 8 heads, words the verbs fixture
// also has, ሠየበ printed under two heads, ለሕሐ with an open question), in the shape
// of the lexicon_current_words view.
const fixture = JSON.parse(readFileSync(new URL("./fixtures/lexicon.json", import.meta.url), "utf8"));
const lexicon = buildLexicon(fixture.rows, fixture.heads);
const links = linkToBank(lexicon, bank);
const items = headItems(lexicon, links);

test("words are found by any of their spellings", () => {
  assert.deepEqual(lookup(lexicon, "ሤበ").map((w) => w.id), ["shayaba"]);
  assert.deepEqual(lookup(lexicon, " ሠይበ ").map((w) => w.id), ["shayaba"]);
  assert.deepEqual(lookup(lexicon, "ሀሀሀ"), []);
});

test("a word's heads come in head order with the book's mark", () => {
  assert.deepEqual(headsOf(lexicon.byId.shayaba), [
    { head: "ቀተለ", mark: "ቀ·ተ" },
    { head: "ቀደሰ", mark: "ቀ·ደ" },
  ]);
});

test("the book's Amharic gloss is there when the app has no meaning", () => {
  assert.equal(bookGloss(lexicon.byId.shayaba), "ሸበተ የሰው ብቻ");
});

test("lexicon words link to the app's verbs by spelling", () => {
  const appWords = new Set(bank.words.map((e) => e.word));
  const expected = lexicon.words.filter((w) => w.spellings.some((s) => appWords.has(s))).length;
  assert.equal(Object.keys(links).length, expected);
  for (const [id, entry] of Object.entries(links)) assert.ok(lexicon.byId[id].spellings.includes(entry.word));
});

test("words with open questions are not asked", () => {
  assert.ok(lexicon.byId.lahha.openQuestions.length > 0);
  assert.equal(items.some((i) => i.lexId === "lahha"), false);
  for (const i of items) assert.equal(i.word.openQuestions.length, 0);
});

test("a spelling printed under two heads accepts both", () => {
  const twoHeads = items.find((i) => i.key === "shayaba:ሠየበ");
  assert.deepEqual(twoHeads.answers, ["ቀተለ", "ቀደሰ"]);
  assert.deepEqual(items.find((i) => i.key === "shayaba:ሤበ").answers, ["ቀተለ"]);

  const q = headQuestion(twoHeads, "hard", seeded(3));
  assert.equal(q.options.length, 8);
  assert.ok(isRightHead(q, q.options.indexOf("ቀተለ")));
  assert.ok(isRightHead(q, q.options.indexOf("ቀደሰ")));
  assert.equal(isRightHead(q, q.options.indexOf("ባረከ")), false);
});

test("easy never pairs look-alikes; medium always does; exactly one option is right", () => {
  const random = seeded(7);
  for (const item of items.filter((i) => i.answers.length === 1)) {
    const easy = headQuestion(item, "easy", random);
    assert.equal(easy.options.length, 4);
    assert.equal(new Set(easy.options).size, 4);
    assert.equal(easy.options.filter((_, i) => isRightHead(easy, i)).length, 1);
    const twin = LOOK_ALIKE[item.answers[0]];
    if (twin) {
      assert.equal(easy.options.includes(twin), false, `${item.form}: easy shows the look-alike ${twin}`);
      const medium = headQuestion(item, "medium", random);
      assert.ok(medium.options.includes(twin), `${item.form}: medium leaves out the look-alike ${twin}`);
      assert.equal(medium.options.length, 4);
    }
    assert.ok(easy.options.every((h) => HEAD_ORDER.includes(h)));
  }
});

test("rounds have no repeats and today's words come first", () => {
  const random = seeded(11);
  const round = pickBalanced(items, 10, random);
  assert.equal(round.length, 10);
  assert.equal(new Set(round.map((i) => i.lexId)).size, 10);

  const linked = items.filter((i) => i.entry);
  const prefer = new Set(linked.slice(0, 3).map((i) => i.entry.id));
  const withToday = pickBalanced(items, 10, seeded(5), prefer);
  for (const id of prefer) assert.ok(withToday.some((i) => i.entry?.id === id));
});

test("rare heads come up more often than their share of the verbs", () => {
  const common = Array.from({ length: 90 }, (_, n) => ({ lexId: `a${n}`, answers: ["ቀተለ"], entry: null }));
  const rare = Array.from({ length: 10 }, (_, n) => ({ lexId: `b${n}`, answers: ["ጦመረ"], entry: null }));
  const random = seeded(21);
  let rareCount = 0;
  let total = 0;
  for (let round = 0; round < 300; round++) {
    const picked = pickBalanced([...common, ...rare], 5, random);
    rareCount += picked.filter((i) => i.answers[0] === "ጦመረ").length;
    total += picked.length;
  }
  const share = rareCount / total;
  assert.ok(share > 0.15 && share < 0.4, `ጦመረ share ${share.toFixed(2)} (10% of the verbs; √-weighting aims at ~25%)`);
});

test("a head's pattern comes from the head tables", () => {
  assert.deepEqual(headPattern(lexicon, "ቀተለ").map((s) => s.forms), [["ቀተለ"], ["ይቀትል"], ["ይቅትል"], ["ቀቲል", "ቀቲሎት"]]);
  assert.deepEqual(headPattern(lexicon, "ቀደሰ").map((s) => s.forms[0]), ["ቀደሰ", "ይቄድስ", "ይቀድስ", "ቀድሶ"]);
  assert.deepEqual(headPattern(lexicon, "nope"), []);
});

test("forms are grouped by name in ርባታ order", () => {
  const groups = formsByName([
    { form: "ሥዩብ", slot: "wusta_m_sg", traditional_name: "ውስጠ ዘ" },
    { form: "ሠየበ", slot: "perfect", traditional_name: "ሓላፊ አንቀጽ" },
    { form: "ሠያብ", slot: "wusta_m_sg", traditional_name: "ውስጠ ዘ" },
    { form: "መሠይብ", slot: "baed_qitsl", traditional_name: "ባዕድ ቅጽል" },
    { form: "ሥዩባት", slot: "wusta_f_pl", traditional_name: "ውስጠ ዘ" },
  ]);
  assert.deepEqual(groups.map((g) => g.slot), ["perfect", "wusta_m_sg", "wusta_f_pl", "baed_qitsl"]);
  assert.deepEqual(groups[1].forms, ["ሥዩብ", "ሠያብ"]);
  assert.equal(groups[2].label, "ውስጠ ዘ · ለሴት በብዙ");
});
