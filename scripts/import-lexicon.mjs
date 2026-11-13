// Loads a Ge'ez lexicon release (~/Projects/geez-lexicon/releases/data-vX.Y.Z) into
// Supabase, signed in as an admin. Run supabase/lexicon.sql once first.
//
//   node --env-file=.env.local scripts/import-lexicon.mjs data-v0.3.0 --current
//   node --env-file=.env.local scripts/import-lexicon.mjs ../geez-lexicon/releases/data-v0.3.0 --current
//   node --env-file=.env.local scripts/import-lexicon.mjs --set-current data-v0.2.0     (switch / roll back)
//   node --env-file=.env.local scripts/import-lexicon.mjs --list
//
// Options: --current (make it the live release after a good import), --replace (re-import
// a release that is not live), --email you@example.com (or LEXICON_ADMIN_EMAIL).
// The password is asked for without echo (or read from LEXICON_ADMIN_PASSWORD); it is
// never stored or printed. Only "core" releases are accepted: they hold what was read
// from the books without doubt. After a change, record it in the lexicon's registry with
// the `lex.py deployed …` line this script prints.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const LEXICON_REPO = resolve(HERE, "../../geez-lexicon");
const TARGET = "bete-qinie-production";
const WORD_BATCH = 500;
const FORM_BATCH = 1000;

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) fail("Run with the app's env: node --env-file=.env.local scripts/import-lexicon.mjs …");

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

async function askHidden(question) {
  if (process.env.LEXICON_ADMIN_PASSWORD) return process.env.LEXICON_ADMIN_PASSWORD;
  if (!process.stdin.isTTY) fail("No terminal to ask for the password in: run this in your own terminal.");
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // readline redraws the whole line (prompt + what was typed) on every key; once the
  // prompt is up, let only the prompt through, so the password never shows.
  let muted = false;
  rl._writeToOutput = (text) => {
    if (!muted) rl.output.write(text);
    else if (text.startsWith(question)) rl.output.write(question);
  };
  const answer = new Promise((done) => rl.question(question, done));
  muted = true;
  const password = await answer;
  rl.close();
  process.stdout.write("\n");
  return password;
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((done) => rl.question(question, done));
  rl.close();
  return answer.trim();
}

async function signIn() {
  const email = option("email") || process.env.LEXICON_ADMIN_EMAIL || (await ask("Admin email: "));
  const password = await askHidden(`Password for ${email}: `);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail(`Sign-in failed: ${error.message}`);
  const { data: isAdmin, error: adminError } = await supabase.rpc("lexicon_is_admin");
  if (adminError) fail(`Couldn't check admin rights (has supabase/lexicon.sql been run?): ${adminError.message}`);
  if (!isAdmin) fail(`${email} is not an admin (profiles.role = 'admin').`);
  console.log(`Signed in as ${email} (admin).`);
}

async function listReleases() {
  const { data, error } = await supabase
    .from("lexicon_releases")
    .select("tag, version, released_on, words, forms, is_current, imported_at")
    .order("imported_at");
  if (error) fail(`Couldn't read lexicon_releases (has supabase/lexicon.sql been run?): ${error.message}`);
  if (!data.length) return console.log("No releases imported yet.");
  for (const r of data) {
    console.log(`${r.is_current ? "● live" : "      "}  ${r.tag.padEnd(14)} released ${r.released_on}  ${String(r.words).padStart(5)} words  ${String(r.forms).padStart(6)} forms  imported ${r.imported_at.slice(0, 10)}`);
  }
}

async function setCurrent(tag) {
  const { data: before } = await supabase.from("lexicon_releases").select("tag").eq("is_current", true).maybeSingle();
  const { error } = await supabase.rpc("lexicon_set_current", { p_tag: tag });
  if (error) fail(`Couldn't make ${tag} live: ${error.message}`);
  console.log(`✓ ${tag} is now the live release${before?.tag && before.tag !== tag ? ` (was ${before.tag})` : ""}.`);
  const older = before?.tag && compareTags(tag, before.tag) < 0;
  console.log("\nRecord it in the lexicon's registry:");
  console.log(`  cd ${LEXICON_REPO} && python3 lex.py deployed ${tag} ${TARGET}${older ? " --rollback" : ""} --note "made live with import-lexicon.mjs"`);
}

function compareTags(a, b) {
  const v = (t) => t.replace(/^data-v/, "").split(".").map(Number);
  const [x, y] = [v(a), v(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

function releaseDir(arg) {
  if (/^data-v\d+\.\d+\.\d+$/.test(arg)) return resolve(LEXICON_REPO, "releases", arg);
  return resolve(process.cwd(), arg);
}

async function insertInBatches(table, rows, size, label) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + size));
    if (error) fail(`Writing ${label} ${i + 1}–${Math.min(i + size, rows.length)} failed: ${error.message}\nThe release is not live; fix the problem and run again with --replace.`);
    process.stdout.write(`\r  ${label}: ${Math.min(i + size, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

async function count(table, tag) {
  const { count: n, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("release_tag", tag);
  if (error) fail(`Counting ${table} failed: ${error.message}`);
  return n;
}

async function importRelease(dirArg) {
  const dir = releaseDir(dirArg);
  if (!existsSync(resolve(dir, "manifest.json"))) fail(`No release at ${dir} (expected manifest.json and app.json).`);
  const manifest = JSON.parse(await readFile(resolve(dir, "manifest.json"), "utf8"));
  const app = JSON.parse(await readFile(resolve(dir, "app.json"), "utf8"));
  const tag = manifest.tag;
  if ((manifest.profile || "full") !== "core" || app.profile !== "core") fail(`${tag} is a "${manifest.profile || "full"}" release; the app takes core releases only.`);
  if (app.version !== manifest.version) fail("app.json and manifest.json disagree on the version.");
  console.log(`${tag} (core): ${manifest.words} words, ${manifest.forms} forms, ${app.heads?.length || 0} head tables, released ${manifest.date}`);

  await signIn();

  const { data: existing, error: readError } = await supabase.from("lexicon_releases").select("tag, is_current").eq("tag", tag).maybeSingle();
  if (readError) fail(`Couldn't read lexicon_releases (has supabase/lexicon.sql been run?): ${readError.message}`);
  if (existing) {
    if (!flag("replace")) fail(`${tag} is already imported. Use --set-current ${tag} to make it live, or --replace to load it again.`);
    if (existing.is_current) fail(`${tag} is the live release; make another release live before replacing it.`);
    const { error } = await supabase.from("lexicon_releases").delete().eq("tag", tag);
    if (error) fail(`Removing the old copy of ${tag} failed: ${error.message}`);
    console.log(`Removed the earlier copy of ${tag}.`);
  }

  const { error: releaseError } = await supabase.from("lexicon_releases").insert({
    tag,
    version: manifest.version,
    profile: "core",
    released_on: manifest.date,
    source_commit: manifest.commit,
    words: manifest.words,
    forms: manifest.forms,
    heads: app.heads ?? null,
    manifest,
    is_current: false,
  });
  if (releaseError) fail(`Writing the release row failed: ${releaseError.message}`);

  const words = app.entries.map((e) => ({
    release_tag: tag,
    lex_id: e.id,
    headword: e.headword,
    spellings: [...new Set([e.headword, ...(e.variants || [])].map((s) => s.trim()).filter(Boolean))],
    heads: e.verb_class || [],
    senses: e.senses || [],
    open_questions: e.open_questions || [],
    sources: e.sources || [],
    status: e.status ?? null,
  }));
  const forms = app.entries.flatMap((e) =>
    (e.forms || []).map((f, n) => ({
      release_tag: tag,
      lex_id: e.id,
      n,
      form: f.form,
      slot: f.slot ?? null,
      category: f.category ?? null,
      features: f.features ?? null,
      traditional_name: f.traditional_name ?? null,
      book_label: f.book_label ?? null,
      book: f.book ?? null,
    }))
  );
  await insertInBatches("lexicon_words", words, WORD_BATCH, "words");
  await insertInBatches("lexicon_forms", forms, FORM_BATCH, "forms");

  const [nWords, nForms] = [await count("lexicon_words", tag), await count("lexicon_forms", tag)];
  if (nWords !== manifest.words || nForms !== manifest.forms) {
    fail(`Counts don't match the manifest: ${nWords}/${manifest.words} words, ${nForms}/${manifest.forms} forms. The release is not live; run again with --replace.`);
  }
  console.log(`✓ Imported ${tag}: ${nWords} words and ${nForms} forms, matching the manifest.`);

  if (flag("current")) await setCurrent(tag);
  else console.log(`Not live yet. To make it live: node --env-file=.env.local scripts/import-lexicon.mjs --set-current ${tag}`);
}

if (flag("list")) {
  await listReleases();
} else if (option("set-current")) {
  await signIn();
  await setCurrent(option("set-current"));
} else {
  const target = args.find((a) => !a.startsWith("--") && a !== option("email"));
  if (!target) fail("Give a release: a tag (data-v0.3.0) or a release folder. See the top of this file.");
  await importRelease(target);
}
process.exit(0);
