import assert from "node:assert/strict";
import test from "node:test";
import { mergeOfficialAvailabilityEvidence } from "../streaming/adapters/official-availability.mjs";

const interstellar = {
  id: "movie:157336",
  type: "movie",
  slug: "interstellar",
  titles: { es: "Interstellar", pt: "Interstellar", br: "Interestelar" },
  original_title: "Interstellar",
  year: 2014,
  runtime: 169,
  overview: {
    es: "Un antiguo piloto se une a una misión interestelar que busca un nuevo hogar para la humanidad.",
    pt: "Um antigo piloto junta-se a uma missão interestelar que procura um novo lar para a humanidade.",
    br: "Um ex-piloto entra em uma missão interestelar que busca um novo lar para a humanidade."
  },
  genres: ["Drama"],
  credits: {},
  related: [],
  offers: { ES: [], PT: [], BR: [] },
  availability_status: { ES: "unknown", PT: "unknown", BR: "unknown" },
  updated_at: "2026-09-11T00:00:00Z",
  availability_updated_at: null,
  source: { metadata: "Wikidata", availability: "unconfigured", attribution: [] }
};

test("evidence expected title must belong to the target VISIONE record", () => {
  assert.throws(() => mergeOfficialAvailabilityEvidence(interstellar, [{
    provider: "prime-video",
    country: "ES",
    url: "https://www.primevideo.com/-/es/detail/dune",
    expectedTitle: "Dune: Parte Dos",
    text: "Dune: Parte Dos Alquilar UHD 3,99 €",
    checked_at: "2026-09-11T10:00:00Z"
  }]), /evidence title mismatch/i);
});
