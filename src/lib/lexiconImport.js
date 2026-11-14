// Shared by scripts/import-lexicon.mjs and the admin Data releases page: checks a
// Ge'ez lexicon release (~/Projects/geez-lexicon/releases/data-vX.Y.Z/{manifest,app}.json)
// and turns it into rows for lexicon_releases, lexicon_words and lexicon_forms.
// No imports, so plain Node and the app can both load it.

export const WORD_BATCH = 500;
export const FORM_BATCH = 1000;
export const TARGET = "bete-qinie-production";

// What is wrong with a release, if anything: [] when it can be imported.
export function checkRelease(manifest, app) {
  const problems = [];
  if (!manifest?.tag || !manifest?.version) problems.push("manifest.json has no tag or version.");
  const profile = manifest?.profile || "full";
  if (profile !== "core" || app?.profile !== "core") {
    problems.push(`${manifest?.tag || "This"} is a "${profile}" release; the app takes core releases only.`);
  }
  if (app && manifest && app.version !== manifest.version) problems.push("app.json and manifest.json disagree on the version.");
  if (!Array.isArray(app?.entries)) {
    problems.push("app.json has no entries.");
  } else if (manifest) {
    const words = app.entries.length;
    const forms = app.entries.reduce((n, e) => n + (e.forms || []).length, 0);
    if (words !== manifest.words || forms !== manifest.forms) {
      problems.push(`app.json has ${words} words and ${forms} forms, but the manifest says ${manifest.words} and ${manifest.forms}.`);
    }
  }
  return problems;
}

// Tells the two files apart by what is in them.
export function identifyFiles(jsons) {
  return {
    manifest: jsons.find((j) => j && typeof j.tag === "string" && "words" in j && !Array.isArray(j.entries)) || null,
    app: jsons.find((j) => j && Array.isArray(j.entries)) || null,
  };
}

export const releaseRow = (manifest, app) => ({
  tag: manifest.tag,
  version: manifest.version,
  profile: "core",
  released_on: manifest.date,
  source_commit: manifest.commit ?? null,
  words: manifest.words,
  forms: manifest.forms,
  heads: app.heads ?? null,
  manifest,
  is_current: false,
});

export const wordRows = (tag, app) =>
  app.entries.map((e) => ({
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

export const formRows = (tag, app) =>
  app.entries.flatMap((e) =>
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

// data-v0.3.0 < data-v0.10.0
export function compareTags(a, b) {
  const v = (t) => t.replace(/^data-v/, "").split(".").map(Number);
  const [x, y] = [v(a), v(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// The line that records a switch in the lexicon's registry (geez-lexicon/releases/README.md).
export function deployedLine(tag, previous, note) {
  const rollback = previous && previous !== tag && compareTags(tag, previous) < 0;
  return `python3 lex.py deployed ${tag} ${TARGET}${rollback ? " --rollback" : ""} --note "${note}"`;
}
