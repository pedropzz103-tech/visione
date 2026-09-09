import assert from "node:assert/strict";
import test from "node:test";

import { clientCopy } from "../assets/discovery-i18n.js";

test("client-side search and library feedback follows the selected locale", () => {
  assert.equal(clientCopy("es").movie, "Película");
  assert.equal(clientCopy("es").noResults, "Ningún resultado en este catálogo verificado.");
  assert.equal(clientCopy("br").subscriptionSaved, "Salvo apenas neste dispositivo.");
  assert.equal(clientCopy("pt").series, "Série");
});

test("unknown client locale safely falls back to Portuguese", () => {
  assert.deepEqual(clientCopy("unknown"), clientCopy("pt"));
});
