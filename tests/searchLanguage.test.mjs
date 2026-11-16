import { test } from "node:test";
import assert from "node:assert/strict";
import { searchOrder } from "../src/lib/searchLanguage.js";

test("Latin letters search English, whatever chip is selected", () => {
  assert.deepEqual(searchOrder("break", "gz"), ["en"]);
  assert.deepEqual(searchOrder("to bless", "am"), ["en"]);
  assert.deepEqual(searchOrder("carry", "en"), ["en"]);
});

test("Ethiopic letters try the selected language first, then the other two", () => {
  assert.deepEqual(searchOrder("ሰበረ", "gz"), ["gz", "ti", "am"]);
  assert.deepEqual(searchOrder("ሰበረ", "ti"), ["ti", "gz", "am"]);
  assert.deepEqual(searchOrder("ሰበረ", "am"), ["am", "gz", "ti"]);
  assert.deepEqual(searchOrder("ሰበረ", "en"), ["gz", "ti", "am"]);
});

test("anything else keeps the selected language", () => {
  assert.deepEqual(searchOrder("123", "ti"), ["ti"]);
  assert.deepEqual(searchOrder("ሰበረ break", "am"), ["am"]);
  assert.deepEqual(searchOrder("", null), ["gz"]);
});
