import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRelease, compareTags, deployedLine, formRows, identifyFiles, releaseRow, wordRows } from "../src/lib/lexiconImport.js";

const app = {
  version: "0.3.1",
  profile: "core",
  heads: [{ head: "ቀተለ", slots: [] }],
  entries: [
    {
      id: "halha",
      headword: "ሃልሀ",
      variants: ["ሀልሀ", " ሃልሀ "],
      verb_class: [{ form: "ሃልሀ", class: "ባረከ", book_label: "ባ·ረ", src: "book" }],
      senses: [{ n: 1, gloss: { am: [{ text: "ወደረ (የከብት)", src: "book" }] } }],
      forms: [
        { form: "ይሄሉ", slot: "imperfect", category: "imperfect" },
        { form: "ሀሊሆ", slot: "nus", book_label: "ን" },
      ],
      open_questions: [],
      sources: [{ book: "book-1", page: 1 }],
      status: "draft",
    },
    { id: "latha", headword: "ለትሐ", verb_class: [], forms: [], open_questions: [{ id: "Q0004", kinds: ["mark"] }] },
  ],
};
const manifest = { tag: "data-v0.3.1", version: "0.3.1", profile: "core", date: "2026-11-14", commit: "abc", words: 2, forms: 2 };

test("a matching core release has no problems", () => {
  assert.deepEqual(checkRelease(manifest, app), []);
});

test("full releases, mismatched versions and counts are refused", () => {
  assert.match(checkRelease({ ...manifest, profile: "full" }, app)[0], /core releases only/);
  assert.match(checkRelease({ ...manifest, version: "0.3.2" }, app).join(" "), /disagree on the version/);
  assert.match(checkRelease({ ...manifest, forms: 3 }, app).join(" "), /2 words and 2 forms, but the manifest says 2 and 3/);
  assert.match(checkRelease(manifest, { ...app, entries: undefined }).join(" "), /no entries/);
});

test("the two files are told apart by their content", () => {
  assert.deepEqual(identifyFiles([app, manifest]), { manifest, app });
  assert.deepEqual(identifyFiles([manifest]), { manifest, app: null });
});

test("rows for the three tables", () => {
  const release = releaseRow(manifest, app);
  assert.equal(release.tag, "data-v0.3.1");
  assert.equal(release.released_on, "2026-11-14");
  assert.equal(release.is_current, false);
  assert.deepEqual(release.heads, app.heads);

  const words = wordRows("data-v0.3.1", app);
  assert.equal(words.length, 2);
  assert.deepEqual(words[0].spellings, ["ሃልሀ", "ሀልሀ"]);
  assert.deepEqual(words[1].open_questions, [{ id: "Q0004", kinds: ["mark"] }]);
  assert.equal(words[1].status, null);

  const forms = formRows("data-v0.3.1", app);
  assert.deepEqual(forms.map((f) => [f.lex_id, f.n, f.form, f.slot]), [
    ["halha", 0, "ይሄሉ", "imperfect"],
    ["halha", 1, "ሀሊሆ", "nus"],
  ]);
  assert.equal(forms[1].book_label, "ን");
  assert.equal(forms[0].book, null);
});

test("tags compare by number, and going back is recorded as a rollback", () => {
  assert.ok(compareTags("data-v0.3.0", "data-v0.10.0") < 0);
  assert.equal(compareTags("data-v1.2.3", "data-v1.2.3"), 0);
  assert.equal(deployedLine("data-v0.3.1", "data-v0.3.0", "x"), 'python3 lex.py deployed data-v0.3.1 bete-qinie-production --note "x"');
  assert.match(deployedLine("data-v0.2.0", "data-v0.3.0", "x"), /--rollback/);
});
