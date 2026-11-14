// The change log in words: one line per change from admin_log_list() rows
// ({ action, table_name, row_key, before, after, subject_email, words }).
// Pure, so it can be tested; the Change log page shows these lines.

const LANGS = { gz: "ግዕዝ", ti: "ትግርኛ", am: "አማርኛ", en: "English" }; // as LANGUAGE_NAMES in WordCard
const lang = (code) => LANGS[code] || code || "";
const quote = (text) => `“${String(text ?? "").trim()}”`;

// Which areas of the app each table belongs to (the page's filter chips).
export const AREAS = [
  { value: "all", label: "All", tables: null },
  { value: "dictionary", label: "Dictionary", tables: ["words", "translationmappings", "sewasew"] },
  { value: "reports", label: "Reports", tables: ["word_reports"] },
  { value: "blog", label: "Blog", tables: ["blog_posts"] },
  { value: "meters", label: "Meters", tables: ["kene_measures"] },
  { value: "releases", label: "Data releases", tables: ["lexicon_releases"] },
  { value: "access", label: "Access", tables: ["profiles"] },
  { value: "settings", label: "Announcement", tables: ["app_settings"] },
];

function wordOf(words, id) {
  const w = words?.[String(id)];
  return w ? w : { word: `#${id}`, lang: null };
}

export function describeChange(row) {
  const { action, table_name: table, before, after, words } = row;
  const now = after || before || {};
  switch (table) {
    case "words": {
      const l = lang(now.language_code);
      if (action === "insert") return `Added ${l} word ${quote(after.word)}`;
      if (action === "delete") return `Deleted ${l} word ${quote(before.word)}`;
      if (before?.word?.trim() !== after?.word?.trim()) return `Renamed ${l} word ${quote(before.word)} → ${quote(after.word)}`;
      return `Changed ${l} word ${quote(after.word)}`;
    }
    case "translationmappings": {
      const a = wordOf(words, now.word_id);
      const b = wordOf(words, now.related_word_id);
      const [geez, other] = a.lang === "gz" ? [a, b] : b.lang === "gz" ? [b, a] : [a, b];
      const verb = action === "delete" ? "removed" : action === "insert" ? "added" : "changed";
      if (geez.lang === "gz" && other.lang !== "gz") {
        return `${geez.word}: ${verb} ${lang(other.lang) || "meaning"} ${quote(other.word)}`.replace(/ {2,}/g, " ");
      }
      return `${action === "delete" ? "Unlinked" : "Linked"} ${quote(a.word)} and ${quote(b.word)}`;
    }
    case "sewasew": {
      const w = wordOf(words, now.word_id);
      if (action === "insert") return `${w.word}: added a ሰዋሰው example`;
      if (action === "delete") return `${w.word}: deleted a ሰዋሰው example`;
      if (before?.word_id !== after?.word_id) return `Moved a ሰዋሰው example to ${w.word}`;
      return `${w.word}: edited a ሰዋሰው example`;
    }
    case "word_reports": {
      if (action === "update" && before?.status !== after?.status) {
        const what = after.status === "open" ? "reopened" : after.status === "fixed" ? "marked fixed" : "dismissed";
        return `Report on ${quote(after.word)} ${what}`;
      }
      if (action === "update" && before?.word_id !== after?.word_id) return `Report on ${quote(after.word)} moved to the merged word`;
      return `Report on ${quote(now.word)} ${action === "delete" ? "deleted" : "changed"}`;
    }
    case "blog_posts": {
      const title = quote(now.title || "untitled");
      if (action === "insert") return `New post ${title}`;
      if (action === "delete") return `Deleted post ${title}`;
      if (!before?.is_public && after?.is_public) return `Published post ${title}`;
      if (before?.is_public && !after?.is_public) return `Unpublished post ${title}`;
      return `Edited post ${title}`;
    }
    case "kene_measures": {
      const name = quote(now.name || now.id);
      if (action === "delete") return `Reset meter table ${name} to the default`;
      return `${action === "insert" ? "Changed" : "Edited"} meter table ${name}`;
    }
    case "lexicon_releases": {
      if (action === "insert") return `Imported data release ${now.tag}`;
      if (action === "delete") return `Removed data release ${now.tag}`;
      if (!before?.is_current && after?.is_current) return `Made ${now.tag} the live data release`;
      if (before?.is_current && !after?.is_current) return `${now.tag} is no longer live`;
      return `Changed data release ${now.tag}`;
    }
    case "profiles": {
      const who = row.subject_email || "an account";
      return `${who}: ${before?.role || "user"} → ${after?.role || "user"}`;
    }
    case "app_settings": {
      if (now.key !== "announcement") return `Changed setting ${now.key}`;
      const text = after?.value?.text;
      if (action === "delete" || !text) return "Cleared the announcement";
      return `Announcement: ${quote(text)}`;
    }
    default:
      return `${action} in ${table}`;
  }
}

// A link is two rows (one each way); show it once.
export function collapsePairs(rows) {
  const out = [];
  for (const row of rows) {
    const prev = out[out.length - 1];
    if (
      prev &&
      row.table_name === "translationmappings" &&
      prev.table_name === "translationmappings" &&
      row.action === prev.action &&
      row.actor_email === prev.actor_email &&
      Math.abs(new Date(row.at) - new Date(prev.at)) < 5000
    ) {
      const a = row.after || row.before;
      const b = prev.after || prev.before;
      if (a && b && a.word_id === b.related_word_id && a.related_word_id === b.word_id) continue;
    }
    out.push(row);
  }
  return out;
}
