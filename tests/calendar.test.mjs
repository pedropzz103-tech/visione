import assert from "node:assert/strict";
import test from "node:test";

import { buildCalendarEvent } from "../scripts/lib/calendar.mjs";

test("builds a portable all-day calendar event without personal data", () => {
  const event = buildCalendarEvent({
    title: "Example Film",
    date: "2026-10-03",
    url: "https://visione.one/pt/onde-ver/example-film/",
  });

  assert.match(event, /BEGIN:VCALENDAR\r\n/);
  assert.match(event, /DTSTART;VALUE=DATE:20261003\r\n/);
  assert.match(event, /SUMMARY:Example Film — estreia\r\n/);
  assert.match(event, /URL:https:\/\/visione\.one\/pt\/onde-ver\/example-film\//);
  assert.doesNotMatch(event, /MAILTO|ATTENDEE|ORGANIZER/);
});

test("rejects invalid release dates", () => {
  assert.throws(() => buildCalendarEvent({ title: "X", date: "03/10/2026", url: "https://visione.one/" }), /ISO date/i);
});
