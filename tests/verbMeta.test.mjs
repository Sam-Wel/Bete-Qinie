import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, VERB_META, anchorHolds, withMeta } from "../src/lib/verbMeta.js";
import { bank } from "./helpers.mjs";

test("every metadata verb is a real dictionary verb whose own meanings confirm it", () => {
  for (const meta of VERB_META) {
    const entry = bank.words.find((e) => e.word === meta.word);
    assert.ok(entry, `${meta.word} is not in the dictionary snapshot`);
    assert.ok(anchorHolds(entry, meta), `${meta.word}: none of ${meta.anchor} appear in its dictionary meanings`);
  }
});

test("categories are known, and each picture shows one action", () => {
  const keys = new Set(CATEGORIES.map((c) => c.key));
  const pictures = new Map();
  for (const meta of VERB_META) {
    meta.categories.forEach((c) => assert.ok(keys.has(c), `${meta.word}: unknown category ${c}`));
    if (!meta.picture) continue;
    assert.ok(!pictures.has(meta.picture) || pictures.get(meta.picture) === meta.concept, `${meta.picture} used for two actions`);
    pictures.set(meta.picture, meta.concept);
  }
});

test("every category label exists in all three languages", () => {
  for (const c of CATEGORIES) for (const lang of ["ti", "am", "en"]) assert.ok(c.label[lang], `${c.key} has no ${lang} label`);
});

test("withMeta joins only verbs present in the dictionary", () => {
  const joined = withMeta(bank);
  assert.equal(joined.length, VERB_META.length);
  assert.ok(joined.every(({ entry, meta }) => entry.word === meta.word));
});
