import { test } from "node:test";
import assert from "node:assert/strict";
import { collapsePairs, describeChange } from "../src/lib/adminText.js";

const words = { 3: { word: "ሃልሀ", lang: "gz" }, 7: { word: "to tie up a cow for milking", lang: "en" } };

test("dictionary changes read as sentences", () => {
  assert.equal(describeChange({ action: "insert", table_name: "words", after: { word: "ቀተለ", language_code: "gz" } }), "Added ግዕዝ word “ቀተለ”");
  assert.equal(
    describeChange({ action: "update", table_name: "words", before: { word: "ሐልሀ", language_code: "gz" }, after: { word: "ሃልሀ", language_code: "gz" } }),
    "Renamed ግዕዝ word “ሐልሀ” → “ሃልሀ”"
  );
  assert.equal(describeChange({ action: "delete", table_name: "words", before: { word: "carry", language_code: "en" } }), "Deleted English word “carry”");
  assert.equal(
    describeChange({ action: "insert", table_name: "translationmappings", after: { word_id: 7, related_word_id: 3 }, words }),
    "ሃልሀ: added English “to tie up a cow for milking”"
  );
  assert.equal(
    describeChange({ action: "delete", table_name: "translationmappings", before: { word_id: 3, related_word_id: 99 }, words }),
    "ሃልሀ: removed meaning “#99”"
  );
  assert.equal(describeChange({ action: "insert", table_name: "sewasew", after: { word_id: 3 }, words }), "ሃልሀ: added a ሰዋሰው example");
});

test("other areas read as sentences too", () => {
  assert.equal(
    describeChange({ action: "update", table_name: "profiles", before: { role: "user" }, after: { role: "editor" }, subject_email: "t@x.org" }),
    "t@x.org: user → editor"
  );
  assert.equal(
    describeChange({ action: "update", table_name: "lexicon_releases", before: { tag: "data-v0.3.1", is_current: false }, after: { tag: "data-v0.3.1", is_current: true } }),
    "Made data-v0.3.1 the live data release"
  );
  assert.equal(
    describeChange({ action: "insert", table_name: "app_settings", after: { key: "announcement", value: { text: "New verbs added" } } }),
    "Announcement: “New verbs added”"
  );
  assert.equal(describeChange({ action: "update", table_name: "app_settings", after: { key: "announcement", value: {} } }), "Cleared the announcement");
  assert.equal(
    describeChange({ action: "update", table_name: "word_reports", before: { status: "open", word: "ሐዘለ" }, after: { status: "fixed", word: "ሐዘለ" } }),
    "Report on “ሐዘለ” marked fixed"
  );
  assert.equal(
    describeChange({ action: "update", table_name: "blog_posts", before: { title: "ቅኔ", is_public: false }, after: { title: "ቅኔ", is_public: true } }),
    "Published post “ቅኔ”"
  );
  assert.equal(describeChange({ action: "delete", table_name: "kene_measures", before: { id: "lewut", name: "ልውጥ" } }), "Reset meter table “ልውጥ” to the default");
});

test("a link's two rows show once", () => {
  const at = "2026-11-14T10:00:00Z";
  const rows = [
    { table_name: "translationmappings", action: "insert", actor_email: "a@x", at, after: { word_id: 3, related_word_id: 7 } },
    { table_name: "translationmappings", action: "insert", actor_email: "a@x", at, after: { word_id: 7, related_word_id: 3 } },
    { table_name: "words", action: "insert", actor_email: "a@x", at, after: { word: "x", language_code: "en" } },
    { table_name: "translationmappings", action: "delete", actor_email: "a@x", at, before: { word_id: 3, related_word_id: 7 } },
  ];
  assert.equal(collapsePairs(rows).length, 3);
});
