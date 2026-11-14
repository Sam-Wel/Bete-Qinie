// "2026-11-12" names a calendar day. new Date() would read it as midnight UTC, which is
// the evening before anywhere west of Greenwich; read it as that day, locally.
export function toDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}
