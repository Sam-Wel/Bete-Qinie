import { readFileSync } from "node:fs";
import { buildBank } from "../src/lib/verbQuiz.js";

// Real dictionary rows (see scripts/update-test-fixture.mjs).
export const rows = JSON.parse(readFileSync(new URL("./fixtures/verbs.json", import.meta.url), "utf8"));
export const bank = buildBank(rows);

// A repeatable random source, so a failing test fails the same way every run.
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
