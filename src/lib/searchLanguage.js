// Which languages to search, in order, for what was typed. Latin letters can only be
// English. Ethiopic letters are ግዕዝ, ትግርኛ or አማርኛ: the selected one first, then the
// other two, so a word typed with the wrong language chip still turns up. Anything else
// (digits, a mix) searches the selected language only.
const ETHIOPIC_LANGS = ["gz", "ti", "am"];

export function searchOrder(text, selected) {
  const t = String(text ?? "");
  const latin = /[A-Za-z]/.test(t);
  const ethiopic = /[ሀ-፿]/.test(t);
  if (latin && !ethiopic) return ["en"];
  if (ethiopic && !latin) {
    const first = ETHIOPIC_LANGS.includes(selected) ? selected : "gz";
    return [first, ...ETHIOPIC_LANGS.filter((l) => l !== first)];
  }
  return [selected || "gz"];
}
