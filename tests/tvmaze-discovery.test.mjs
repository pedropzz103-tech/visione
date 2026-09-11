import assert from "node:assert/strict";
import test from "node:test";

test("TVmaze discovery deduplicates shows, excludes known ids and prefers complete high-signal records", async () => {
  const { selectTvmazeDiscoveryCandidates } = await import("../streaming/adapters/tvmaze.mjs");
  const rows = [
    { show: { id: 10, name: "Known", premiered: "2024-01-01", weight: 99, rating: { average: 9 }, image: { original: "https://img/10.jpg" } } },
    { show: { id: 11, name: "Strong", premiered: "2025-01-01", weight: 95, rating: { average: 8.8 }, image: { original: "https://img/11.jpg" } } },
    { show: { id: 11, name: "Strong", premiered: "2025-01-01", weight: 95, rating: { average: 8.8 }, image: { original: "https://img/11.jpg" } } },
    { show: { id: 12, name: "No Art", premiered: "2026-01-01", weight: 100, rating: { average: 9.5 }, image: null } },
    { show: { id: 13, name: "Medium", premiered: "2023-01-01", weight: 70, rating: { average: 7.2 }, image: { original: "https://img/13.jpg" } } }
  ];
  const selected = selectTvmazeDiscoveryCandidates(rows, { existingIds: new Set([10]), limit: 2 });
  assert.deepEqual(selected.map((show) => show.id), [11, 13]);
});

test("TVmaze web schedule helper calls the documented bounded endpoint", async () => {
  const { fetchTvmazeWebSchedule } = await import("../streaming/adapters/tvmaze.mjs");
  const calls = [];
  const result = await fetchTvmazeWebSchedule("2026-09-11", {
    baseUrl: "https://example.test",
    fetchImpl: async (url) => {
      calls.push(String(url));
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => [{ id: 1 }] };
    }
  });
  assert.equal(result.length, 1);
  assert.match(calls[0], /\/schedule\/web\?date=2026-09-11/);
});
