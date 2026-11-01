// Refreshes tests/fixtures/verbs.json: a snapshot of real dictionary rows
// (from the verb_quiz_bank view) that the tests run against, so they need no
// network. It keeps every verb named in src/lib/verbMeta.js plus a sample of
// others. Run with the app's env loaded:
//   set -a && . ./.env.local && set +a && node --import ./tests/register.mjs scripts/update-test-fixture.mjs
import { writeFile } from "node:fs/promises";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Load .env.local first (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).");

const { VERB_META } = await import("../src/lib/verbMeta.js");

let rows = [];
for (let from = 0; ; from += 1000) {
  const res = await fetch(`${url}/rest/v1/verb_quiz_bank?select=word_id,word,ti,am,en&order=word_id`, {
    headers: { apikey: key, Range: `${from}-${from + 999}` },
  });
  const page = await res.json();
  rows = rows.concat(page);
  if (page.length < 1000) break;
}

const named = new Set(VERB_META.map((m) => m.word));
const keep = rows.filter((r, i) => named.has(r.word.trim()) || i % 5 === 0);
await writeFile(new URL("../tests/fixtures/verbs.json", import.meta.url), JSON.stringify(keep, null, 0) + "\n");
console.log(`Wrote ${keep.length} of ${rows.length} dictionary rows.`);
