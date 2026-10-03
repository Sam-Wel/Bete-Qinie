const HTML_TAG_PATTERN = /<[a-z][\s\S]*>/i;

// Older posts store plain text (line breaks only); posts written with the
// portfolio's rich text editor store HTML directly. Detect which one we've
// got so both render correctly as HTML source for react-native-render-html.
// No DOMPurify step is needed here (unlike the web version) because
// react-native-render-html renders into RN Text/View trees rather than a
// live DOM -- it has no <script> execution or event-handler attributes to
// sanitize away in the first place.
export function toHtmlSource(content) {
  if (!content) return "";
  return HTML_TAG_PATTERN.test(content) ? content : content.replace(/\n/g, "<br />");
}

export function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// TenTap/Tiptap's "empty" value is markup like "<p></p>" -- strip tags to
// check whether there's any actual text content.
export function isBlogContentEmpty(html) {
  if (!html) return true;
  return html.replace(/<(.|\n)*?>/g, "").trim().length === 0;
}

// ቅኔ is written one verse per line, but a preview built with stripHtml collapses all
// whitespace and runs them together. Ethiopic ends a verse with ። , so split on that —
// falling back to real line breaks for anything that does not use it.
const ETHIOPIC_FULL_STOP = "።";

export function toVerseLines(content) {
  if (!content) return [];

  const text = HTML_TAG_PATTERN.test(content)
    ? content
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
        .replace(/<[^>]*>/g, "")
    : content;

  const lines = [];
  let current = "";

  for (const character of text) {
    if (character === "\n") {
      if (current.trim()) lines.push(current.trim());
      current = "";
      continue;
    }
    current += character;
    if (character === ETHIOPIC_FULL_STOP) {
      lines.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) lines.push(current.trim());

  return lines;
}
