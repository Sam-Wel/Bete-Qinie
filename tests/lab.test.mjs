import test from "node:test";
import assert from "node:assert/strict";
import { LAB_OFF, LAB_PIECES, labFromUrl, parseLab, pieceOn } from "../src/lib/lab.js";

test("a saved lab is read back; unknown pieces and junk are dropped", () => {
  const saved = JSON.stringify({ on: true, pieces: { pageTurn: true, opening: false, nonsense: true } });
  assert.deepEqual(parseLab(saved), { on: true, pieces: { pageTurn: true } });
  assert.equal(parseLab("not json"), LAB_OFF);
  assert.equal(parseLab(null), LAB_OFF);
  assert.deepEqual(parseLab(JSON.stringify({ on: "yes" })), { on: false, pieces: {} });
});

test("?lab=1 turns it on, ?lab=0 off, anything else leaves it", () => {
  const off = { on: false, pieces: { goldTab: true } };
  assert.deepEqual(labFromUrl("?lab=1", off), { on: true, pieces: { goldTab: true } });
  assert.deepEqual(labFromUrl("?x=2&lab=0", { on: true, pieces: {} }), { on: false, pieces: {} });
  assert.equal(labFromUrl("?label=1", off), off);
  assert.equal(labFromUrl("", off), off);
  assert.equal(labFromUrl("?lab=10", off), off);
});

test("a piece shows only when the lab is on and the piece is switched on", () => {
  assert.equal(pieceOn({ on: true, pieces: { opening: true } }, "opening"), true);
  assert.equal(pieceOn({ on: false, pieces: { opening: true } }, "opening"), false);
  assert.equal(pieceOn({ on: true, pieces: {} }, "opening"), false);
  assert.equal(LAB_PIECES.length, 5);
});
