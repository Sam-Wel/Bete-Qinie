import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_TEXT, isActive, makeAnnouncement, safeLink } from "../src/lib/announcement.js";

test("only app pages and http(s) addresses are allowed as links", () => {
  assert.equal(safeLink("/today"), "/today");
  assert.equal(safeLink(" /verb-quiz?words=1,2 "), "/verb-quiz?words=1,2");
  assert.equal(safeLink("https://example.org/a b"), "https://example.org/a%20b");
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("data:text/html,hi"), null);
  assert.equal(safeLink("//evil.example"), null);
  assert.equal(safeLink("today"), null);
  assert.equal(safeLink(""), null);
});

test("an announcement shows until its end date", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  assert.equal(isActive(null, now), false);
  assert.equal(isActive({ text: "  " }, now), false);
  assert.equal(isActive({ text: "New verbs added" }, now), true);
  assert.equal(isActive({ text: "x", until: "2026-11-15T00:00:00Z" }, now), true);
  assert.equal(isActive({ text: "x", until: "2026-11-14T00:00:00Z" }, now), false);
});

test("publishing tidies the text, checks the link and sets the end", () => {
  const now = Date.parse("2026-11-14T12:00:00Z");
  const a = makeAnnouncement({ text: "  New   verbs\nadded ", link: "javascript:x", days: 7 }, now);
  assert.equal(a.text, "New verbs added");
  assert.equal(a.link, null);
  assert.equal(a.until, "2026-11-21T12:00:00.000Z");
  assert.equal(a.id, String(now));
  assert.equal(makeAnnouncement({ text: "x".repeat(300) }, now).text.length, MAX_TEXT);
  assert.equal(makeAnnouncement({ text: "x", days: null }, now).until, null);
});
