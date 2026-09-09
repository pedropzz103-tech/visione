function escapeIcs(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildCalendarEvent({ title, date, url }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error("Release date must be a valid ISO date (YYYY-MM-DD)");
  }
  const compactDate = date.replaceAll("-", "");
  const uid = `${compactDate}-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}@visione.one`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VISIONE//Release calendar//PT",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(uid)}`,
    `DTSTART;VALUE=DATE:${compactDate}`,
    `SUMMARY:${escapeIcs(title)} — estreia`,
    `URL:${escapeIcs(url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
