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
