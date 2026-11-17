import test from "node:test";
import assert from "node:assert/strict";
import { toGeez } from "../src/lib/geezNumerals.js";

test("ones and tens", () => {
  assert.deepEqual([1, 2, 9, 10, 11, 19, 20, 33, 90, 99].map(toGeez), ["፩", "፪", "፱", "፲", "፲፩", "፲፱", "፳", "፴፫", "፺", "፺፱"]);
});

test("hundreds: a lone 1 is not written before ፻", () => {
  assert.deepEqual([100, 101, 111, 200, 1000, 2002, 2500, 9999].map(toGeez), ["፻", "፻፩", "፻፲፩", "፪፻", "፲፻", "፳፻፪", "፳፭፻", "፺፱፻፺፱"]);
});

test("ten-thousands", () => {
  assert.deepEqual([10000, 10001, 10100, 20000, 100000].map(toGeez), ["፼", "፼፩", "፼፻", "፪፼", "፲፼"]);
});

test("millions keep ፼ even when its pair is empty", () => {
  assert.equal(toGeez(1000000), "፻፼");
  assert.equal(toGeez(1010000), "፻፩፼");
  assert.equal(toGeez(1000100), "፻፼፻");
});

test("the Ethiopian year and chapter numbers", () => {
  assert.equal(toGeez(2019), "፳፻፲፱");
  assert.deepEqual([1, 2, 3, 7].map(toGeez), ["፩", "፪", "፫", "፯"]);
});

test("no zero, negatives or fractions: returned as written", () => {
  assert.deepEqual([0, -3, 2.5].map(toGeez), ["0", "-3", "2.5"]);
});
