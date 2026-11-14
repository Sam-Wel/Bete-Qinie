// The announcement banner (app_settings key 'announcement'): { id, text, link, until }.
// Pure, so it can be tested; the admin page writes it and AnnouncementBanner shows it.

export const MAX_TEXT = 160;

// A link the banner may open: a page of the app ("/today") or an http(s) address.
// Anything else (javascript:, data:, "//host") is refused.
export function safeLink(link) {
  const value = String(link ?? "").trim();
  if (!value) return null;
  if (/^\/(?!\/)[^\s]*$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export const isInternal = (link) => typeof link === "string" && link.startsWith("/");

// Showing: has text and hasn't reached its end date.
export function isActive(announcement, now = Date.now()) {
  if (!announcement?.text?.trim()) return false;
  return !announcement.until || Date.parse(announcement.until) > now;
}

// What the admin page publishes. A new id each time, so people who closed the last
// one see this one.
export function makeAnnouncement({ text, link, days }, now = Date.now()) {
  return {
    id: String(now),
    text: String(text ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_TEXT),
    link: safeLink(link),
    until: days ? new Date(now + days * 864e5).toISOString() : null,
  };
}
